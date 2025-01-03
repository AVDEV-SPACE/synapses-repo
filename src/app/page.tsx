"use client"

import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation' 

const Home = () => {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect user to the sign-in page if they are not authenticated  
      router.push('/sign-in')
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      {user ? (
        <div>Welcome, {user.firstName}</div>
      ) : (
        <div>You are not signed in</div>
      )}
    </div>
  )
}

export default Home
