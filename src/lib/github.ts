import dotenv from 'dotenv';
dotenv.config(); 
import { aiSummariseCommit } from "./gemini";
import { Octokit } from "@octokit/rest";
import axios from 'axios';
import { db } from './database';
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types';


export const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

console.log('GitHub Token:', process.env.GITHUB_TOKEN); 


async function getRepos() {
    try {
        const response = await octokit.rest.repos.listForAuthenticatedUser();
        console.log("repositories:",response.data);
        await fetchCommits('username', 'repository');
    } catch (error) {
        console.error("Error fetching repositories:", error);
    }
}

getRepos();
  
interface Commit {
    commit: {
        message: string;
        author: {
            name?: string; // Permite ca 'name' să fie string sau undefined
            date?: string; // Permite ca 'date' să fie string sau undefined
        } | null; // Permite ca author să fie null
    };
    sha: string;
    author?: {
        avatar_url?: string; // Permite ca avatar_url să fie string sau undefined
    };
}

type Response = {
    commitMessage: string;
    commitHash: string;
    commitAuthorName: string;
    commitAuthorAvatar: string; 
    commitDate: string | Date; 
}

type CommitAuthor = {
    name?: string;
    email?: string;
    date?: string;
} | null;
  
type CommitInfo = {
    message: string;
    author?: CommitAuthor;
    committer?: CommitAuthor;
};

type CommitResponse = {
    sha: string;
    commit: CommitInfo;
    author?: {
        login?: string; // Opțional, deoarece GitHub API poate include aceste câmpuri
        id?: number;
        avatar_url?: string;
        [key: string]: any; // Permite câmpuri suplimentare
    } | null; // Poate fi și null
};

const exampleCommit: CommitResponse = {
    sha: "exampleSha",
    commit: {
        message: "Example commit message",
        author: null, // Permis acum
        committer: {
            name: "Committer Name",
            date: "2023-12-01",
        },
    },
    author: {   
        avatar_url: "https://example.com/avatar.png",
    },
};


type CommitData = GetResponseDataTypeFromEndpointMethod<typeof octokit.rest.repos.listCommits>;


async function fetchCommits(owner: string, repo: string): Promise<CommitResponse[]> {
    try {
        const { data } = await octokit.rest.repos.listCommits({ owner, repo });
        console.log("Fetching commits for:", { owner, repo });
        console.log("Commits fetched:", data);
        return data;
    } catch (error) {
        const typedError = error as { response?: { data: any }; message: string };
        console.error("Error fetching commits from GitHub API:", typedError.response?.data || typedError.message);
        throw error;
    }
}


// ! FUNCTION TO OBTAIN THE COMMITS
export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
    const [owner, repo] = githubUrl.split('/').slice(-2);
    if (!owner || !repo) {
        console.error(`Invalid GitHub URL: ${githubUrl}`);
        throw new Error('Invalid GitHub URL');
    }

    try {
        const commits = await fetchCommits(owner, repo);
        console.log(`Commits fetched for repo ${owner}/${repo}:`, commits);
        
        if (commits.length === 0) {
            console.warn(`No commits found for repo ${owner}/${repo}`);
            return [];
        }

        const sortedCommits = commits.sort((a, b) => {
            const dateA = new Date(a.commit.author?.date || 0).getTime();
            const dateB = new Date(b.commit.author?.date || 0).getTime();
            return dateB - dateA;
        });

        return sortedCommits.slice(0, 15).map(commit => ({
            commitHash: commit.sha,
            commitMessage: commit.commit.message || "No message provided",
            commitAuthorName: commit.commit.author?.name || "Unknown",
            commitAuthorAvatar: commit.author?.avatar_url || "",
            commitDate: commit.commit.author?.date || "Unknown",
        }));
    } catch (error) {
        console.error(`Error fetching commits for ${githubUrl}:`, error);
        throw error;
    }

};


const githubUrl = "https://github.com/AVDEV-SPACE/scale-up-planner";
const commits = await getCommitHashes(githubUrl);
console.log("Commits:", commits);

// ! FUNCTION TO CREATE A SUMMARY FOR THE COMMITS 
export const pollCommits = async (ctx: any, db: any, projectId: string) => {
    // 1. Obține URL-ul GitHub al proiectului din baza de date
    const { githubUrl } = await fetchProjectGithubUrl(projectId);  
    
    // 2. Obține commit-urile recente de pe GitHub
    const commitHashes = await getCommitHashes(githubUrl);

    // 3. Filtrarea commit-urilor neprocesate
    const unprocessedCommits = await filterUnprocessedCommits(projectId, commitHashes);

    // 4. Crearea unui rezumat pentru commit-urile neprocesate
    const summaryResponse = await Promise.allSettled(unprocessedCommits.map(commit => {
        return summariseCommit(githubUrl, commit.commitHash);  
    }));
    
    // 5. Construirea unui array de rezumate
    const summaries = summaryResponse.map((response, index) => {
        if (response.status === 'fulfilled') {
            const commit = unprocessedCommits[index];
            if (commit) { // Verifică că commit nu este null
                return {
                    summary: response.value,
                    ...commit,
                };
            }
        }
        return null;
    }).filter((item): item is NonNullable<typeof item> => item !== null); // Elimină elementele null
    
    // 6. Salvează commit-urile și rezumatele în baza de date
    const commits = await db.commit.createMany({
        data: summaries.map(({ summary, commitHash, commitMessage, commitAuthorName, commitAuthorAvatar, commitDate }) => ({
            projectId,
            commitHash: commitHash ?? "Unknown", // Verifică și adaugă un fallback
            commitMessage: commitMessage ?? "No message provided",
            commitAuthorName: commitAuthorName ?? "Unknown",
            commitAuthorAvatar: commitAuthorAvatar ?? "",
            commitDate: new Date(commitDate ?? new Date()).toISOString(),
            summary: summary ?? "",
        })),
    });
    
    console.log("Commit hashes fetched:", commitHashes);
    console.log("Unprocessed commits:", unprocessedCommits);
    console.log("Summaries to save:", summaries);
    return commits;
};


export const getCommitsByProject = async (projectId: string) => {
    const commits = await db.commit.findMany({
        where: { projectId },
        orderBy: { commitDate: 'desc' },
    });
    return commits;
};


// ! FUNCTION TO SPECIF THE COD WHICH REPO TO READ
async function summariseCommit(githubUrl: string, commitHash: string) {

    const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
        headers: { Accept: 'application/vnd.github.v3.diff' },
    });

    return await aiSummariseCommit(data) || "";
}

// ! FUNCTION THAT INDICATES THE USERS REPO
async function fetchProjectGithubUrl(projectId: string) {
    const project = await db.project.findUnique({
        where: { id: projectId },
        select: { githubUrl: true },
    });

    if (!project?.githubUrl) {
        console.error(`Project with ID ${projectId} has no GitHub URL`);
        throw new Error("Project has no GitHub URL");
    }

    console.log("Fetched project and GitHub URL:", project);
    return { project, githubUrl: project.githubUrl };
}

// ! FUNCTION TO SORT THE NEW COMMITS AND RETURN THEM 
async function filterUnprocessedCommits(projectId: string, commitHashes: Response[]) {
    try {
        // Obține commit-urile procesate din baza de date
        const processedCommits: Response[] = await db.commit.findMany({
            where: { projectId }
        });

        console.log("Processed commits from DB:", processedCommits);
        console.log("Commit hashes from GitHub:", commitHashes);

        if (!commitHashes || commitHashes.length === 0) {
            console.warn(`No commit hashes fetched for project ID ${projectId}`);
            return [];
        }

        // Filtrează commit-urile care nu sunt încă procesate
        const unprocessedCommits = commitHashes.filter((commit) =>
            !processedCommits.some((processed) => processed.commitHash === commit.commitHash)
        );
        
        console.log("Unprocessed commits:", unprocessedCommits);
        return unprocessedCommits;
    } catch (error) {
        console.error(`Error filtering unprocessed commits for project ID ${projectId}:`, error);
        throw error;
    }
}


async function getCommitsByProjectId(projectId: string) {
  try {
    const commits = await db.commit.findMany({
      where: { projectId: projectId },
      orderBy: { commitDate: 'desc' }, // Poți sorta după data commit-ului
    });

    console.log('Fetched commits:', commits);
    return commits;
  } catch (error) {
    console.error('Error fetching commits:', error);
    throw error;
  }
}

// Exemplu de apel pentru a obține commit-urile unui proiect specific
const projectId = 'cm56ug903000g6dsp6dbrtmtg'; // ID-ul proiectului tău
getCommitsByProjectId(projectId);
