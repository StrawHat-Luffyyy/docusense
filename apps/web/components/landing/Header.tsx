import React from "react";
import Link from "next/link";
import { Database } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 w-full z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-500" />
          <span className="text-xl font-bold text-zinc-900 dark:text-white">
            DocuSense
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="hidden text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white sm:block"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
