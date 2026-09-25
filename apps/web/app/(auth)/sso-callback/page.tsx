import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 flex-col gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <p className="text-zinc-500 font-medium animate-pulse">
        Completing authentication...
      </p>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
      />
    </div>
  );
}
