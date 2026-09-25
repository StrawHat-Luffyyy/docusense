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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className="
        w-72
        border-r
        border-zinc-800
        bg-zinc-950
        flex
        flex-col
        justify-between
      "
      >
        <div>
          {/* Logo */}
          <div className="px-6 py-6 border-b border-zinc-800">
            <h1 className="text-xl font-semibold tracking-tight">DocuSense</h1>
          </div>

          {/* Workspace */}
          <div className="px-4 py-4">
            <TenantSwitcher />
          </div>
        </div>

        {/* User profile / Logout */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <UserButton
            showName
            appearance={{
              elements: {
                userButtonBox:
                  "flex flex-row-reverse w-full justify-between items-center",
                userButtonOuterIdentifier: "text-zinc-300 font-medium",
                userButtonPopoverCard: "bg-zinc-950 border border-zinc-800",
                userButtonPopoverActionButton:
                  "hover:bg-zinc-900 text-zinc-300",
                userButtonPopoverActionButtonText: "text-zinc-300",
                userButtonPopoverActionButtonIcon: "text-zinc-400",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
