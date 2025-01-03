import { api } from "@/trpc/client";
import { useLocalStorage } from "usehooks-ts";
import type { RouterOutputs } from "@/trpc/types";

//! Definirea tipului pentru un proiect
type Project = RouterOutputs['project']['getProjects'][number];

const useProject = () => {
  //* Utilizează corect useQuery pentru a apela getProjects
  const { data: projects, isLoading, error } = api.project.getProjects.useQuery();
  
  //* Definim corect valorile returnate de useLocalStorage
  const [projectId, setProjectId] = useLocalStorage<string | undefined>('synapesis-projectId', undefined);
  
  //* Dacă `projects` este definit și conține un obiect, căutăm proiectul selectat
  const project: Project | undefined = projects?.find((project: Project) => project.id === projectId);

  console.log('Project ID from useProject:', projectId);
  console.log('Projects:', projects);
  console.log('Selected Project:', project);

  return {
    projects,
    project,
    projectId,
    setProjectId,
    isLoading,
    error
  };
};

export default useProject;
