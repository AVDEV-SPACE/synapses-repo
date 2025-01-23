import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import { db } from "./database";
import { fetchCommitDiff, aiSummariseCommit } from "./gemini";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name?: string;
      email?: string;
      date?: string;
    } | null;
  };
  author?: {
    avatar_url?: string;
    login?: string;
  } | null;
}

interface Response {
  commitMessage: string;
  commitHash: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string | Date;
  summary?: string;
}

async function fetchCommits(owner: string, repo: string): Promise<Commit[]> {
  const commits: Commit[] = [];
  let page = 1;
  let hasNextPage = true;

  try {
    while (hasNextPage) {
      const { data, headers } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        page,
        per_page: 100,
      });

      commits.push(...data);
      hasNextPage = headers.link?.includes('rel="next"') ?? false;
      page += 1;
    }

    return commits;
  } catch (error) {
    console.error(`Error fetching commits from GitHub for ${owner}/${repo}:`, error);
    throw error;
  }
}

async function saveCommitsToDB(projectId: string, commits: Response[]) {
  for (const commit of commits) {
    try {
      const existingCommit = await db.commit.findFirst({
        where: { commitHash: commit.commitHash },
      });

      if (!existingCommit) {
        await db.commit.create({
          data: {
            commitMessage: commit.commitMessage,
            commitHash: commit.commitHash,
            commitAuthorName: commit.commitAuthorName,
            commitAuthorAvatar: commit.commitAuthorAvatar,
            commitDate: commit.commitDate,
            summary: commit.summary || "No summary available.",
            projectId,
          },
        });
      }
    } catch (error) {
      console.error(`Error saving commit ${commit.commitHash} to DB:`, error);
    }
  }
}

export async function backfillCommitSummaries(projectId: string, githubUrl: string) {
  const [owner, repo] = githubUrl.split("/").slice(-2);

  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL format.");
  }

  const commitsWithoutSummary = await db.commit.findMany({
    where: {
      projectId: projectId,
      OR: [
        { summary: "" },
        { summary: null },
        { summary: "No changes detected." },
        { summary: "Summary could not be generated." },
      ],
    },
  });

  for (const commit of commitsWithoutSummary) {
    try {
      const diff = await fetchCommitDiff(owner, repo, commit.commitHash);

      if (diff) {
        const summary = await aiSummariseCommit(diff);

        await db.commit.update({
          where: { id: commit.id },
          data: { summary: summary || "No changes detected." },
        });
      }
    } catch (error) {
      console.error(`Failed to generate summary for commit ${commit.commitHash}:`, error);
    }
  }
}

export async function syncCommitsForProject(projectId: string, githubUrl: string) {
  const [owner, repo] = githubUrl.split("/").slice(-2);

  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL format.");
  }

  const commits = await fetchCommits(owner, repo);

  const formattedCommits: Response[] = [];

  for (const commit of commits) {
    try {
      console.log(`Fetching diff for commit: ${commit.sha}`);
      const diff = await fetchCommitDiff(owner, repo, commit.sha);

      let summary = "No changes detected.";
      if (diff) {
        console.log(`Generating summary for commit: ${commit.sha}`);
        summary = await aiSummariseCommit(diff) || "No changes detected.";
      }

      formattedCommits.push({
        commitMessage: commit.commit.message,
        commitHash: commit.sha,
        commitAuthorName: commit.commit.author?.name || commit.author?.login || "Unknown",
        commitAuthorAvatar: commit.author?.avatar_url || "https://default-avatar-url.com",
        commitDate: commit.commit.author?.date || new Date(),
        summary,
      });
    } catch (error) {
      console.error(`Error processing commit ${commit.sha}:`, error);
      formattedCommits.push({
        commitMessage: commit.commit.message,
        commitHash: commit.sha,
        commitAuthorName: commit.commit.author?.name || commit.author?.login || "Unknown",
        commitAuthorAvatar: commit.author?.avatar_url || "https://default-avatar-url.com",
        commitDate: commit.commit.author?.date || new Date(),
        summary: "Summary could not be generated.",
      });
    }
  }

  await saveCommitsToDB(projectId, formattedCommits);
}
