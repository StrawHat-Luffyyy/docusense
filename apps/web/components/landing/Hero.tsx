import React from "react";
import Link from "next/link";
import { ArrowRight, Database, Search, FileText, Lock } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-24 font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-zinc-50 to-white dark:from-indigo-950/40 dark:via-zinc-950 dark:to-zinc-950" />

      {/* Animated glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px] pointer-events-none animate-fade-in" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] pointer-events-none animate-fade-in delay-200" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-6 opacity-0 animate-fade-in-up backdrop-blur-sm shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          </span>
          Enterprise RAG Platform
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl opacity-0 animate-fade-in-up delay-100 text-zinc-900 dark:text-white leading-[1.1]">
          Chat with your internal{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            knowledge base
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 opacity-0 animate-fade-in-up delay-200">
          DocuSense securely indexes your organization&apos;s documents,
          enabling your team to instantly find answers, generate insights, and
          extract information using state-of-the-art AI.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up delay-300">
          <Link
            href="/sign-up"
            className="group relative flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 overflow-hidden w-full sm:w-auto justify-center"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 flex items-center gap-2">
              Start Building
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="#features"
            className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-8 py-3.5 text-base font-medium text-zinc-900 dark:text-white transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 w-full sm:w-auto"
          >
            Learn more
          </Link>
        </div>

        {/* Dashboard Preview */}
        <div className="mx-auto mt-16 max-w-[1000px] w-full relative opacity-0 animate-fade-in-up delay-400 perspective-1000">
          <div className="relative rounded-2xl bg-zinc-900/5 p-2 ring-1 ring-inset ring-zinc-900/10 dark:bg-white/5 dark:ring-white/10 lg:-m-4 lg:p-4 backdrop-blur-3xl shadow-2xl">
            {/* Glossy overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/10 to-white/0 dark:from-white/0 dark:via-white/5 dark:to-white/0 pointer-events-none" />

            <div className="rounded-xl bg-white shadow-2xl ring-1 ring-zinc-900/10 dark:bg-zinc-950 dark:ring-white/10 overflow-hidden relative">
              <div className="flex h-10 lg:h-12 items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 px-4 gap-2 backdrop-blur-md">
                <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-red-400 transition-colors"></div>
                <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-amber-400 transition-colors"></div>
                <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-green-400 transition-colors"></div>
              </div>

              <div className="flex bg-white dark:bg-zinc-950/80 aspect-[16/10] md:aspect-[16/9] w-full max-h-[70vh]">
                {/* Fake Sidebar */}
                <div className="w-48 lg:w-64 border-r border-zinc-200 dark:border-zinc-800/50 p-4 hidden md:flex flex-col gap-6 bg-zinc-50/50 dark:bg-zinc-900/20">
                  <div className="space-y-2">
                    <div className="text-[10px] lg:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                      Knowledge Base
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs lg:text-sm font-medium">
                      <Search className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                      Search & Chat
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-xs lg:text-sm transition-colors">
                      <FileText className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                      Documents
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-xs lg:text-sm transition-colors">
                      <Lock className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                      Access Control
                    </div>
                  </div>
                </div>

                {/* Fake Chat */}
                <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-end relative overflow-hidden bg-dot-pattern">
                  {/* Subtle background grid pattern (simulated) */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)]" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.02] pointer-events-none">
                    <Database className="h-48 w-48 lg:h-64 lg:w-64 text-zinc-900 dark:text-white" />
                  </div>

                  <div className="space-y-4 lg:space-y-6 relative z-10 w-full max-w-3xl mx-auto">
                    {/* User Message */}
                    <div className="flex justify-end animate-fade-in-up delay-500">
                      <div className="rounded-2xl rounded-tr-sm bg-indigo-600 text-white p-3 lg:p-4 text-xs sm:text-sm shadow-md max-w-[85%] leading-relaxed font-medium">
                        What are the key security requirements for Q3?
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="flex justify-start animate-fade-in-up delay-[600ms]">
                      <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 lg:p-5 text-xs sm:text-sm shadow-sm dark:shadow-none max-w-[95%] text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        <div className="flex items-center gap-2 mb-2 lg:mb-3 font-semibold text-indigo-600 dark:text-indigo-400">
                          <Database className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          DocuSense AI
                        </div>
                        <p className="mb-2 lg:mb-3">
                          Based on the{" "}
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] lg:text-xs text-zinc-700 dark:text-zinc-300">
                            Q3_Security_Guidelines.pdf
                          </span>
                          , the key requirements are:
                        </p>
                        <ul className="space-y-1.5 lg:space-y-2 pl-3 lg:pl-4">
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 lg:mt-2 flex-shrink-0" />
                            <span>
                              Implement SOC2 compliance checks across all newly
                              deployed microservices.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 lg:mt-2 flex-shrink-0" />
                            <span>
                              Rotate production database credentials by the end
                              of August.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 lg:mt-2 flex-shrink-0" />
                            <span>
                              Enforce Multi-Factor Authentication (MFA) for all
                              internal administrative systems.
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
