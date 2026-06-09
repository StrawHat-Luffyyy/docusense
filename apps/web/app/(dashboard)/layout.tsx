"use client";

import { useAuth } from "@clerk/nextjs";
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
    <div className="flex min-h-screen">
      {/* Sidebar Placeholder */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 flex flex-col gap-6">
        <div className="font-bold text-xl tracking-tighter">DocuSense</div>
        <TenantSwitcher />
        <nav className="flex flex-col gap-2">
          {/* Navigation links will go here in Phase 2 */}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
