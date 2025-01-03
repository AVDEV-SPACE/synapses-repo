import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SignIn routing="path" path="/sign-in" />
      </div>
    );
  }