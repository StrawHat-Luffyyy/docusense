import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignInPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue chatting with your enterprise knowledge base."
    >
      <SignIn />
    </AuthShell>
  );
}
