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
    <div className="flex min-h-screen flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Left panel */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 flex-col justify-between bg-zinc-950 p-12 text-white relative overflow-hidden border-r border-zinc-800 shadow-2xl">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-600/10 rounded-full blur-[100px] animate-fade-in" />
          <div className="absolute top-1/2 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-indigo-400/10 to-transparent rounded-full blur-[80px] animate-fade-in delay-200" />
        </div>

        <div className="relative z-10 opacity-0 animate-fade-in-up">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-bold hover:opacity-80 transition-opacity"
          >
            <Database className="h-7 w-7 text-indigo-500" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              DocuSense
            </span>
          </Link>
          <div className="mt-28 max-w-xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-6 text-white leading-tight">
              {title}
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed font-medium">
              {description}
            </p>
          </div>
        </div>

        {/* Decorative Graphic/Pattern */}
        <div className="relative mt-16 w-full max-w-md z-10 opacity-0 animate-fade-in-up delay-200">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-30 blur-lg transition-all duration-1000"></div>
          <div className="relative rounded-2xl border border-white/10 bg-zinc-900/80 p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-4 border-b border-white/10 pb-5 mb-5">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center ring-1 ring-indigo-500/30">
                <Database className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg tracking-tight">
                  Enterprise RAG
                </h3>
                <p className="text-sm text-zinc-400 font-medium mt-0.5">
                  High-performance vector search
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-2.5 w-3/4 rounded-full bg-zinc-700/50"></div>
              <div className="h-2.5 w-1/2 rounded-full bg-zinc-700/50"></div>
              <div className="h-2.5 w-5/6 rounded-full bg-zinc-700/50"></div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-zinc-500 font-medium opacity-0 animate-fade-in delay-300">
          &copy; {new Date().getFullYear()} DocuSense Inc. All rights reserved.
        </div>
      </div>

      {/* Right panel (Auth form) */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24 bg-zinc-50 dark:bg-zinc-950 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-50 via-zinc-50 to-zinc-50 dark:from-indigo-950/20 dark:via-zinc-950 dark:to-zinc-950 -z-10" />

        {/* Mobile Header */}
        <div className="mb-10 flex md:hidden items-center justify-center opacity-0 animate-fade-in-up">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white hover:opacity-80 transition-opacity"
          >
            <Database className="h-7 w-7 text-indigo-600 dark:text-indigo-500" />
            <span className="tracking-tight">DocuSense</span>
          </Link>
        </div>

        <div className="mx-auto w-full max-w-sm lg:w-[400px] flex justify-center opacity-0 animate-slide-in-right delay-100">
          <div className="w-full flex justify-center">{children}</div>
        </div>
      </div>
    </div>
  );
}
