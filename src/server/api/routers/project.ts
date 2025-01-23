import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { aiSummariseCommit } from "@/lib/gemini";
import { backfillCommitSummaries, syncCommitsForProject } from "@/lib/github";

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
      where: { projectId: input.projectId } ,
      orderBy: { commitDate: 'desc' },
      take: 15,
    });
    console.log("Commits fetched from DB:", commits);
    
    return commits;
  }),

  backfillMissingSummaries: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    githubUrl: z.string()
  }))
  .mutation(async ({ input }) => {
    await backfillCommitSummaries(input.projectId, input.githubUrl);
    return { success: true, message: 'Summaries generated for missing commits' };
  }),


  syncProjectCommits: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    githubUrl: z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    const project = await ctx.db.project.findUnique({
      where: { id: input.projectId }
    });

    if (!project) {
      throw new Error('Proiect negăsit');
    }

    //* Dacă proiectul este șters logic, îl reactualizăm
    if (project.deletedAt) {
      await ctx.db.project.update({
        where: { id: input.projectId },
        data: { deletedAt: null },
      });
    }

    try {
      //* Sincronizează commit-urile și generează automat sumariile
      await syncCommitsForProject(input.projectId, input.githubUrl);
      
      //* Declanșează backfill-ul pentru sumariile care lipsesc
      await backfillCommitSummaries(input.projectId, input.githubUrl);

      return { success: true, message: 'Commit-uri sincronizate și sumarizate' };
    } catch (error) {
      console.error('Eroare la sincronizarea commit-urilor:', error);
      throw new Error('Nu s-au putut sincroniza commit-urile');
    }
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
