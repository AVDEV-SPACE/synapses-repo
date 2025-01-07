import { api } from "@/trpc/client";
import { useLocalStorage } from "usehooks-ts";
import type { RouterOutputs } from "@/trpc/types";

type Project = RouterOutputs['project']['getProjects'][number];

const useProject = () => {
  const { data: projects, isLoading, error } = api.project.getProjects.useQuery();

  const [projectId, setProjectId] = useLocalStorage<string | undefined>('synapesis-projectId', undefined);

  const project: Project | undefined = projects?.find((project: Project) => project.id === projectId);

  const deleteMutation = api.project.deleteProject.useMutation();

  const deleteProject = async (projectId: string) => {
    try {
      await deleteMutation.mutateAsync({ projectId });
      // Refresh or update project list after deletion
      console.log(`Project ${projectId} deleted successfully`);
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  };
  

  console.log('Project ID from useProject:', projectId);
  console.log('Projects:', projects);
  console.log('Selected Project:', project);

  return {
    projects,
    project,
    projectId,
    setProjectId,
    isLoading,
    error,
    deleteProject,
  };
};

export default useProject;
