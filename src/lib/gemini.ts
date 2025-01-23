import { GoogleGenerativeAI } from "@google/generative-ai";
import { Octokit } from "@octokit/rest"; // Required to resolve `octokit` usage

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-1-5.flash",
});

// Create an instance of Octokit to use in `fetchCommitDiff`
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Fixing type annotations
export async function fetchCommitDiff(owner: string, repo: string, sha: string): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    // Combine all patch data from files changed in the commit
    const patches = data.files
      ?.filter(file => file.patch) // Only include files with diffs
      .map(file => `File: ${file.filename}\n${file.patch}`)
      .join("\n\n");

    if (!patches) {
      console.warn(`No diff available for commit ${sha}`);
    }

    return patches || null;
  } catch (error) {
    console.error(`Error fetching diff for commit ${sha}:`, error);
    return null;
  }
}

// Fixing template string and handling syntax issues
export const aiSummariseCommit = async (input: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Asigură o lungime minimă pentru generarea sumară
    const processedInput = input.length > 10 ? input : `Commit message: ${input}`;

    const truncatedInput = processedInput.length > 1000
      ? processedInput.slice(0, 1000) + "\n\n[Input truncated due to length]"
      : processedInput;

    const response = await model.generateContent(
      `Provide a concise, professional summary of these code changes. 
       If detailed changes are not evident, describe the commit's purpose.
       
       Input details:
       ${truncatedInput}`
    );

    const summary = response.response.text().trim();
    return summary || "No changes detected.";
  } catch (error) {
    console.error("Gemini summary generation error:", error);
    return "Summary could not be generated.";
  }
};