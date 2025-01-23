  'use client';
  import useProject from '@/hooks/use-project';
  import { cn } from '@/lib/utils';
  import { api } from '@/trpc/react';
  import { ExternalLink } from 'lucide-react';
  import Link from 'next/link';
  import React from 'react';

  const CommitLog = () => {
    const { projectId, project } = useProject();
    console.log('Project ID:', projectId, 'Project:', project);

    if (!projectId) {
      return <div>No project selected</div>; 
    } 

    // Fetch commits using tRPC
    const { data: commits, isLoading, error } = api.project.getCommits.useQuery(
      { projectId: project?.id ?? "" },
      {
        enabled: !!project?.id, // Execute query only if `projectId` is defined
      }
    );

    if (isLoading) {
      return <div>Loading commits...</div>;
    }

    if (error) {
      return <div>Error fetching commits: {error.message}</div>;
    }

    if (!commits || commits.length === 0) {
      return <div>No commits available for this project.</div>;
    } 


    return (
      <ul className="space-y-6 border rounded-md h-40 w-full flex flex-col justify-start items-start">
        {commits?.map((commit, commitIdx) => (
          <li key={commitIdx} className="relative flex gap-x-4">
            <div
              className={cn(
                commitIdx === commits.length - 1 ? 'h-6' : '-bottom-6',
                'absolute left-0 top-0 flex w-6 justify-center'
              )}
            >
              <div className="w-px translate-x-1 bg-gray-200"></div>
            </div>
            <img
              src={commit.commitAuthorAvatar}
              alt="author.commit"
              className="relative mt-4 size-8 flex-none rounded-full"
            />
            <div className="flex-auto rounded-lg p-3 ring-1 ring-inset ring-gray-200">
              <div className="flex justify-between gap-x-4">
                <Link
                  target="_blank"
                  href={`${project?.githubUrl}/commit/${commit.commitHash}`}
                  className="py-0.5 text-sm leading-5 text-gray-500"
                >
                  <span>{commit.commitAuthorName}</span>
                  <span className="inline-flex items-center">
                    committed <ExternalLink className="ml-1 size-4" />
                  </span>
                </Link>
              </div>
              <span className="font-semibold">{commit.commitMessage}</span>
                <pre className="mt-2 whitespace-pre-wrap text-sm leading-8 text-gray-500">
                  {commit.summary || "No summary available."}
                </pre>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  export default CommitLog;
