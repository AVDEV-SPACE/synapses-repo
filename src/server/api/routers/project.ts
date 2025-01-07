import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { aiSummariseCommit } from "@/lib/gemini";
import { syncCommitsForProject } from "@/lib/github";

async function pollCommits(ctx: any, id: string) {
  console.log("Polling commits for project:", id);

  const project = await ctx.db.project.findUnique({
    where: { id },
  });

  if (!project || !project.githubUrl) {
    console.log("No GitHub URL found for this project.");
    return;
  }

  try {
    await syncCommitsForProject(id, project.githubUrl);

    console.log(`Commits synced for project ${id}`);
  } catch (error) {
    console.error("Error syncing commits:", error);
  }
}


export const projectRouter = createTRPCRouter({
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

    await pollCommits(ctx, project.id);
    return project;
  }),

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

  getCommits: protectedProcedure.input(z.object({
    projectId: z.string()
  })).query(async ({ ctx, input }) => {
    console.log("Fetching commits for project ID:", input.projectId);
    
    const commits = await ctx.db.commit.findMany({ 
      where: { projectId: input.projectId } 
    });
    console.log("Commits fetched from DB:", commits);
    
    return commits;
  }),

  deleteProject: protectedProcedure.input(z.object({
    projectId: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const project = await ctx.db.project.findUnique({

      where: { id: input.projectId },
    });

    if (!project) {
      throw new Error('Proiectul nu a fost găsit');
    }

    await ctx.db.project.update({
      where: { id: input.projectId },
      data: { deletedAt: new Date() }, 
    });

    return { success: true };
  })
});
