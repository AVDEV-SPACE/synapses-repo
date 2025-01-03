import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { aiSummariseCommit } from "@/lib/gemini";

//! Declare pollCommits function first
async function pollCommits(ctx: any, id: string)  {
  console.log("Polling commits for project:", id);

  //? Get the list of commits for the project
  const commits = await ctx.db.commit.findMany({ where: { projectId: id } });
  console.log("Existing commits in DB:", commits);  

  if (commits.length === 0) {
    console.log("No commits found for this project.");
  }

  //? Iterate through commits and get summary for each
  for (let commit of commits) {
    const diff = commit.diff; 
    try {
      const summary = await aiSummariseCommit(diff);
      console.log("Commit summary:", summary); 

      //? Update the commit with the AI-generated summary
      await ctx.db.commit.update({
        where: { id: commit.id },
        data: { summary },
      });
    } catch (error) {
      console.error("Error summarizing commit:", error);
    }
  }
}

//! CREATE FUNCTION
export const projectRouter = createTRPCRouter({
  //? create procedure
  createProject: protectedProcedure.input(
    z.object({
      name: z.string(),
      githubUrl: z.string(),
      githubToken: z.string().optional(),
    })
  ).mutation(async ({ ctx, input }) => {
    if (!ctx.user?.userId) {
      throw new Error('User ID is not available');
    }

    const project = await ctx.db.project.create({
      data: {
        githubUrl: input.githubUrl,
        name: input.name,
        userToProjects: {
          create: {
            userId: ctx.user.userId
          }
        }
      },
      include: {
        userToProjects: true,
      }
    });

    //? Call pollCommits after creating project
    await pollCommits(ctx, project.id);
    return project;
  }),

  //! Attach the project to user ID
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.project.findMany({
      where: {
        userToProjects: {
          some: {
            userId: ctx.user.userId!
          }
        },
        deletedAt: null
      }
    });
  }),

  //! Get Commits for the selected project
  getCommits: protectedProcedure.input(z.object({
    projectId: z.string()
  })).query(async ({ ctx, input }) => {
    console.log("Fetching commits for project ID:", input.projectId);
    
    const commits = await ctx.db.commit.findMany({ where: { projectId: input.projectId } });
    console.log("Commits fetched from DB:", commits);
    
    return commits;
  })
})
