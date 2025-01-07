import dotenv from 'dotenv';
dotenv.config();
import { Octokit } from '@octokit/rest';
import { db } from './database';

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

interface Commit {
  commit: {
    message: string;
    author: {
      name?: string;
      email?: string;
      date?: string;
    } | null;
  };
  sha: string;
  author?: {
    avatar_url?: string;
    login?: string;
  } | null;
}

type Response = {
  commitMessage: string;
  commitHash: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string | Date;
  summary?: string;
};

async function fetchCommits(owner: string, repo: string): Promise<Commit[]> {
  const commits: Commit[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    try {
      const { data, headers } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        page,
        per_page: 15,   
      });

      commits.push(...data);
      page += 1;

      hasNextPage = Boolean(headers['link'] && headers['link'].includes('rel="next"'));
    } catch (error) {
      console.error(`Error fetching commits for repo ${owner}/${repo}:`, error);
      throw error;
    }
  }

  return commits;
}


async function saveCommitsToDB(projectId: string, commits: Response[]) {
  try {
    for (const commit of commits) {
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
            summary: commit.summary || '',
            projectId: projectId,
          },
        });
        console.log(`Saved commit: ${commit.commitHash} for project ${projectId}`);
      } else {
        console.log(`Commit ${commit.commitHash} already exists for project ${projectId}`);
      }
    }
  } catch (error) {
    console.error(`Error saving commits to DB for project ${projectId}:`, error);
    throw error;
  }
}

export const syncCommitsForProject = async (projectId: string, githubUrl: string) => {
  const [owner, repo] = githubUrl.split('/').slice(-2);

  if (!owner || !repo) {
    console.error(`Invalid GitHub URL for project ${projectId}: ${githubUrl}`);
    throw new Error("Invalid GitHub URL format");
  }

  try {
    const commits = await fetchCommits(owner, repo);

    if (!commits || commits.length === 0) {
      console.log(`No commits found for project ${projectId}`);
      return [];
    }

    const formattedCommits = commits.map(commit => ({
      commitMessage: commit.commit.message,
      commitHash: commit.sha,
      commitAuthorName: commit.commit.author?.name || commit.author?.login || 'Unknown',
      commitAuthorAvatar: commit.author?.avatar_url ?? 'https://default-avatar-url.com',
      commitDate: commit.commit.author?.date || new Date(),
    }));

    await saveCommitsToDB(projectId, formattedCommits);
    return formattedCommits;
  } catch (error) {
    console.error(`Error syncing commits for project ${projectId}:`, error);
    throw error;
  }
};

export const syncCommitsForAllProjects = async () => {
  try {
    const projects = await db.project.findMany({
      where: {
        deletedAt: null, 
      },
    });

    for (const project of projects) {
      if (!project.githubUrl) {
        console.warn(`Project ${project.id} has no GitHub URL.`);
        continue;
      }

      console.log(`Syncing commits for project ${project.id}`);
      await syncCommitsForProject(project.id, project.githubUrl);
    }

    console.log("Finished syncing commits for all projects.");
  } catch (error) {
    console.error("Error syncing commits for all projects:", error);
    throw error;
  }
};
