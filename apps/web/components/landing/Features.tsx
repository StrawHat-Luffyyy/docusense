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
    <section id="features" className="py-24 sm:py-32 bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">
            Everything you need
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            No-compromise document intelligence
          </p>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Built from the ground up for teams that need reliable, fast, and
            secure access to their internal knowledge.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-zinc-900 dark:text-white">
                  <feature.icon
                    className="h-5 w-5 flex-none text-indigo-600 dark:text-indigo-400"
                    aria-hidden="true"
                  />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-zinc-600 dark:text-zinc-400">
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
