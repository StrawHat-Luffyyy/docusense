"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { useAuthSync } from "../../hooks/useAuthSync";
import { TenantSwitcher } from "../../components/layout/TenantSwitcher";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { isSyncing } = useAuthSync();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!isSignedIn) return null;

  if (isSyncing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <p className="text-sm text-zinc-500">Syncing your workspace...</p>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to DocuSense
          </h1>
          <p className="mt-2 text-zinc-500">
            Please select or create an organization to continue.
          </p>
        </div>
        <div className="w-80">
          <TenantSwitcher />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-300">
      {/* Top Header */}
      <header className="h-14 shrink-0 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 relative z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-white ml-1">
            DocuSense
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-64">
            <TenantSwitcher />
          </div>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <UserButton
            showName
            appearance={{
              elements: {
                userButtonBox: "flex flex-row-reverse items-center",
                userButtonOuterIdentifier: "text-sm font-medium text-zinc-300",
                userButtonPopoverCard: "bg-zinc-900 border border-zinc-800",
                userButtonPopoverActionButton:
                  "hover:bg-zinc-800 text-zinc-300",
                userButtonPopoverActionButtonText: "text-zinc-300",
                userButtonPopoverActionButtonIcon: "text-zinc-400",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Content (Middle and Main regions) */}
        <main className="flex-1 overflow-hidden bg-zinc-950 flex">
          {children}
        </main>
      </div>
    </div>
  );
}
