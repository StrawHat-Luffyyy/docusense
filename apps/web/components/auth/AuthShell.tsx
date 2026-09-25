import React from "react";
import Link from "next/link";
import { Database } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export function AuthShell({ children, title, description }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950">
      {/* Left panel */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/3 flex-col justify-between bg-zinc-900 p-12 text-white">
        <div>
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
          >
            <Database className="h-6 w-6 text-indigo-500" />
            <span>DocuSense</span>
          </Link>
          <div className="mt-24 max-w-xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-6">
              {title}
            </h1>
            <p className="text-lg text-zinc-400">{description}</p>
          </div>
        </div>

        {/* Decorative Graphic/Pattern */}
        <div className="relative mt-12 w-full max-w-lg">
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur"></div>
          <div className="relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-4 border-b border-zinc-800 pb-4 mb-4">
              <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Database className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-200">Enterprise RAG</h3>
                <p className="text-sm text-zinc-400">
                  High-performance vector search
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-2 w-3/4 rounded bg-zinc-800"></div>
              <div className="h-2 w-1/2 rounded bg-zinc-800"></div>
              <div className="h-2 w-5/6 rounded bg-zinc-800"></div>
            </div>
          </div>
        </div>

        <div className="text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} DocuSense Inc. All rights reserved.
        </div>
      </div>

      {/* Right panel (Auth form) */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        {/* Mobile Header */}
        <div className="mb-8 flex md:hidden items-center justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white hover:opacity-80 transition-opacity"
          >
            <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-500" />
            <span>DocuSense</span>
          </Link>
        </div>
        <div className="mx-auto w-full max-w-sm lg:w-96 flex justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
