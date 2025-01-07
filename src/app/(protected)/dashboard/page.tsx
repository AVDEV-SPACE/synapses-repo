'use client';
import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import { useUser } from "@clerk/nextjs";
import useProject from "src/hooks/use-project";
import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";
import CommitLog from "./commit-log";

const DashboardPage: React.FC = () => {
  const { project, deleteProject } = useProject(); // Hook-ul pentru proiecte
  const [isDeleting, setIsDeleting] = useState(false); // Indicator pentru procesul de ștergere
  const router = useRouter(); // Pentru navigare

  const handleDelete = async () => {
    if (!project?.id) {
      alert("No project selected!");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the project: ${project.name}?`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await deleteProject(project.id); // Șterge proiectul selectat
      alert("Project deleted successfully.");
      router.refresh(); // Reîncarcă pagina pentru a actualiza lista de proiecte
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("An error occurred while deleting the project.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main>
      <div className="flex flex-col items-start justify-between flex-wrap gap-y-4">
        {/* GITHUB LINK */}
        {project ? (
          <div className="flex items-center w-fit rounded-md bg-primary px-4 py-3">
            <Github className="size-5 text-white" />
            <div className="ml-2">
              <p className="text-sm font-medium text-white">
                This project is linked to{" "}
                <Link
                  href={project.githubUrl ?? ""}
                  className="inline-flex items-center text-white/90 hover:underline"
                >
                  {project.githubUrl}
                  <ExternalLink className="ml-1 size-4" />
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <p>No project selected</p>
        )}

        <div className="h-4"></div>

        {/* DELETE BUTTON */}
        {project && (
          <div className="mt-4">
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </button>
          </div>
        )}

        <div className="mt-4">
          <CommitLog />
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
