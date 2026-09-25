import React from "react";
import Link from "next/link";
import { ArrowRight, Database } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-white to-white dark:from-indigo-900/20 dark:via-zinc-950 dark:to-zinc-950"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/50 px-4 py-1.5 text-sm text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 mb-8">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
          Enterprise RAG Platform
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-7xl">
          Chat with your internal{" "}
          <span className="text-indigo-600 dark:text-indigo-400">
            knowledge base
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          DocuSense securely indexes your organization&apos;s documents,
          enabling your team to instantly find answers, generate insights, and
          extract information using state-of-the-art AI.
        </p>

        <div className="mt-10 flex items-center justify-center gap-6">
          <Link
            href="/sign-up"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Start Building
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#features"
            className="text-base font-medium text-zinc-900 dark:text-white hover:underline"
          >
            Learn more
          </Link>
        </div>

        {/* Dashboard Preview */}
        <div className="mx-auto mt-16 max-w-5xl sm:mt-24 relative">
          <div className="rounded-xl bg-zinc-900/5 p-2 ring-1 ring-inset ring-zinc-900/10 dark:bg-white/5 dark:ring-white/10 lg:-m-4 lg:rounded-2xl lg:p-4">
            <div className="rounded-lg bg-white shadow-2xl ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10 overflow-hidden">
              <div className="flex h-12 items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                <div className="h-3 w-3 rounded-full bg-green-400"></div>
              </div>
              <div className="aspect-[16/9] bg-zinc-50 dark:bg-zinc-950 flex">
                {/* Fake Sidebar */}
                <div className="w-1/4 border-r border-zinc-200 dark:border-zinc-800 p-4 hidden sm:block">
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800"></div>
                    <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800"></div>
                    <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800"></div>
                  </div>
                </div>
                {/* Fake Chat */}
                <div className="flex-1 p-6 flex flex-col justify-end relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-5">
                    <Database className="h-32 w-32" />
                  </div>
                  <div className="space-y-4 mb-4 relative z-10">
                    <div className="ml-auto w-1/2 rounded-2xl rounded-tr-sm bg-indigo-600 p-4 text-white text-sm">
                      What are the key security requirements for Q3?
                    </div>
                    <div className="mr-auto w-3/4 rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 text-sm dark:text-zinc-300">
                      Based on the <strong>Q3 Security Guidelines.pdf</strong>,
                      the key requirements are:
                      <ul className="list-disc pl-4 mt-2 space-y-1">
                        <li>Implement SOC2 compliance checks</li>
                        <li>Rotate production database credentials</li>
                        <li>Enable 2FA for all internal systems</li>
                      </ul>
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
