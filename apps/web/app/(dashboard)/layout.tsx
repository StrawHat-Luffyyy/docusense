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
        {/* Left Navigation */}
        <aside className="w-64 shrink-0 border-r border-white/5 bg-zinc-950/50 flex flex-col pt-6">
          <nav className="flex-1 px-3 space-y-1">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-white font-medium transition-colors"
            >
              <svg
                className="w-4 h-4 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              Documents
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Activity
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </a>
          </nav>
        </aside>

        {/* Content (Middle and Main regions) */}
        <main className="flex-1 overflow-hidden bg-zinc-950 flex">
          {children}
        </main>
      </div>
    </div>
  );
}
