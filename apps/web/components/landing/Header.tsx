import React from "react";
import Link from "next/link";
import { Database } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 w-full z-50 border-b border-zinc-200/50 bg-white/60 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60 font-sans transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
            <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-500 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
            DocuSense
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/sign-in"
            className="hidden text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white sm:block transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="relative overflow-hidden rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10">Get Started</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
