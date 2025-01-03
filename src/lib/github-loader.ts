import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github"

export const loadGitHubRepo = async (githubUrl: string, githubToken?: string) => {

    const loader = new  GithubRepoLoader(githubUrl, {
        accessToken: githubToken || '',
        branch: 'main',
        ignoreFiles: ['package-lock.json' , 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5
    })

    const docs = await loader.load()
    return docs
}

console.log(await loadGitHubRepo('https://github.com/AVDEV-SPACE/scale-up-planner'));
