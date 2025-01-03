'use client'
import { api } from '@/trpc/react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from 'src/components/ui/button'
import { Input } from 'src/components/ui/input'
import useRefetch from 'src/hooks/use-refetch'

type FormInput = {
    repoUrl: string 
    projectName: string
    githubToken?: string
}

const CreatePage = () => {

    const {register, handleSubmit, reset} = useForm<FormInput>()
    const createProject = api.project.createProject.useMutation()
    const refetch = useRefetch()

    function onSubmit(data: FormInput) {
        createProject.mutate({
            githubUrl: data.repoUrl,
            name: data.projectName,
            githubToken: data.githubToken
        }, {
            onSuccess: () => {
                toast.success('Project created successfully');
                refetch();  // Asigură-te că refetch returnează proiectele corect
                reset();
            },
            onError: (error) => {
                console.error('Error creating project:', error);
                toast.error('Failed to create project');
            },
        })
        return true;
    }

    return (
    <div className='flex justify-center items-center gap-12 h-full'>
        <img src="" alt=""  className='h-28 w-auto'/>
    <div>
        <div>
            <h1>
                Link your Github repository
            </h1>
            <p>
                Enter the URL fo your repository to link it to synapsis
            </p>
        </div>
        <div className="h-4"></div>
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Input
                {...register('projectName', {required: true})}
                placeholder="ProjectName"
                required
                />
                <div className="h-2"></div>
                <Input
                {...register('repoUrl', {required: true})}
                placeholder="Github URL"
                type='url'
                required
                />
                <div className="h-2"></div>
                <Input
                {...register('githubToken')}
                placeholder="Github Token (Optional)"
                />
                <div className="h-2"></div>
                <Button type='submit' disabled={createProject.isPending}>
                 Create Project
                </Button>
            </form>
        </div>
    </div>
    </div>
  )
}

export default CreatePage