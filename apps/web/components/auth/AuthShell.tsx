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
        <div className="relative mt-12 w-full max-w-[440px] z-10 opacity-0 animate-fade-in-up delay-200 perspective-1000">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-purple-600/20 blur-xl transition-all duration-1000"></div>

          <div className="relative rounded-xl border border-white/10 bg-zinc-950/80 p-1 backdrop-blur-2xl shadow-2xl flex overflow-hidden h-[340px]">
            {/* Glossy overlay */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none z-20" />

            {/* Sidebar */}
            <div className="w-36 border-r border-white/5 p-3 flex flex-col gap-4 bg-zinc-900/30 text-white/80">
              <div className="flex items-center gap-2 mb-2 opacity-90">
                <Database className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold tracking-tight">
                  DocuSense
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Knowledge Base
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-medium border border-indigo-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>{" "}
                  Search & Chat
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <div className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Documents
                </div>
                <div className="text-[10px] text-zinc-400 px-2 py-1 truncate">
                  Q3_Security_Guidelines.pdf
                </div>
                <div className="text-[10px] text-zinc-400 px-2 py-1 truncate">
                  Architecture_v2.pdf
                </div>
                <div className="text-[10px] text-zinc-400 px-2 py-1 truncate">
                  Engineering_Handbook.pdf
                </div>
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative bg-[#09090b]/40">
              {/* Fake Header */}
              <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                </div>
              </div>

              {/* Chat UI */}
              <div className="flex-1 p-4 flex flex-col justify-end gap-3 relative z-10 bg-dot-pattern">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]" />

                <div className="flex justify-end relative z-10">
                  <div className="bg-indigo-600 text-white/90 text-[10px] px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%] shadow-md leading-relaxed">
                    What are the security requirements for Q3?
                  </div>
                </div>

                <div className="flex justify-start relative z-10">
                  <div className="bg-zinc-900 border border-white/10 text-zinc-300 text-[10px] p-3 rounded-xl rounded-tl-sm max-w-[90%] shadow-sm leading-relaxed">
                    <div className="flex items-center gap-1.5 mb-2 text-indigo-400 font-medium">
                      <Database className="h-3 w-3" />
                      DocuSense AI
                    </div>
                    Based on your indexed documents, the requirements include
                    SOC2 compliance and MFA enforcement.
                  </div>
                </div>
              </div>
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
