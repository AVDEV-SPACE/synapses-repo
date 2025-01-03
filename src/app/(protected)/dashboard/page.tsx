'use client'
import React from "react";
import { auth } from "@clerk/nextjs/server";
import { useUser } from "@clerk/nextjs";
import useProject from "src/hooks/use-project";
import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";
import CommitLog from "./commit-log";

const DashboardPage: React.FC = () => {
  const { project } = useProject()

  return (
    <main>
      <div className="flex flex-col items-center justify-between flex=wrap gap-y-4">
        {/* GITHUB LINK */}
        <div className="flex items-center w-fit rounded-md bg-primary px-4 py-3">
          <Github className='size-5 text-white' />
            <div className="ml-2">
              <p className="text-sm font-mediun text-white">
              this project is linked to {''}
              <Link href={project?.githubUrl ?? ""} className="inline-flex items-center text-white/90 hover:underline">
              {project?.githubUrl}
              <ExternalLink className="ml-1 size-4" />
              </Link>
              </p>
          </div>
        </div>

        <div className="h-4"></div>

        {/* TEAM MEMBERS - INVITE BUTTONS - ACTIVE BUTTON */}
        <div className="flex items-center justify-between flex-wrap gap-y-4"></div>

        <div className="mt-4">
          <div className="grid gird-cols-1 gap-4 sm:grid-colds-5">
            Ask a questions
          </div>
        </div>

        <div className="mt-8">
          <CommitLog />
        </div>
      </div>  
    </main>
  );
};

export default DashboardPage;
