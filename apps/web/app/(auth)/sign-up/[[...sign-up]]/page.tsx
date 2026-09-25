import { CustomSignUp } from "@/components/auth/CustomSignUp";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Get Started"
      description="Create an account to start building your intelligent document repository."
    >
      <CustomSignUp />
    </AuthShell>
  );
}
