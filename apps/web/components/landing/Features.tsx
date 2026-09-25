import React from "react";
import { Shield, Zap, Search, Users, Database, FileText } from "lucide-react";

const features = [
  {
    name: "Semantic Search",
    description:
      "Find exactly what you're looking for, even if you don't use the exact keywords. Our vector search understands intent.",
    icon: Search,
  },
  {
    name: "Enterprise Security",
    description:
      "Your data remains yours. Built with enterprise-grade security, row-level access control, and complete isolation.",
    icon: Shield,
  },
  {
    name: "Multi-tenant Architecture",
    description:
      "Perfect for organizations of any size. Manage teams, permissions, and billing from a single centralized dashboard.",
    icon: Users,
  },
  {
    name: "Lightning Fast",
    description:
      "Powered by Pinecone and Redis, experience sub-second retrieval times even with millions of documents.",
    icon: Zap,
  },
  {
    name: "Auto-Indexing",
    description:
      "Upload PDFs, Word docs, and text files. We automatically chunk, embed, and index them in the background.",
    icon: Database,
  },
  {
    name: "Smart Citations",
    description:
      "Every AI response includes exact citations to the source document, so you can trust the answers you receive.",
    icon: FileText,
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-24 sm:py-32 bg-white dark:bg-zinc-950 font-sans relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-indigo-50/30 dark:bg-indigo-900/10 blur-3xl rounded-bl-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-2xl text-center opacity-0 animate-fade-in-up">
          <h2 className="text-sm font-bold tracking-widest uppercase leading-7 text-indigo-600 dark:text-indigo-400">
            Everything you need
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            No-compromise document intelligence
          </p>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Built from the ground up for teams that need reliable, fast, and
            secure access to their internal knowledge.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:max-w-none opacity-0 animate-fade-in-up delay-200">
          <dl className="grid max-w-xl grid-cols-1 gap-x-12 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.name}
                className={`flex flex-col group opacity-0 animate-fade-in-up delay-${((i % 3) + 1) * 100}`}
              >
                <dt className="flex items-center gap-x-4 text-lg font-bold leading-7 text-zinc-900 dark:text-white">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                    <feature.icon
                      className="h-6 w-6 flex-none text-indigo-600 dark:text-indigo-400"
                      aria-hidden="true"
                    />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-zinc-600 dark:text-zinc-400 font-medium">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
