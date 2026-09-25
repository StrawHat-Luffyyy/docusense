"use client";

import React, { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Mail, Lock } from "lucide-react";

export function CustomSignIn() {
  const { client, setActive } = useClerk();
  const signIn = client.signIn;
  const isLoaded = !!signIn;
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Handle OAuth
  const signInWith = (strategy: "oauth_google" | "oauth_github") => {
    if (!isLoaded) return;

    setLoading(true);
    signIn
      .authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
      .catch((err: any) => {
        setLoading(false);
        setError(err.errors?.[0]?.message || "An error occurred with OAuth.");
      });
  };

  // Handle standard credentials
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    if (!emailAddress || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        // e.g. needs MFA or additional factor
        console.log("Unimplemented sign-in status:", result.status);
        setError(
          "Additional verification required. Flow not implemented here.",
        );
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
      console.error("Sign in error:", err);
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Invalid credentials. Please try again.",
      );
    }
  };

  return (
    <div className="w-full">
      <div className="space-y-3 mb-8 text-center sm:text-left">
        <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Sign in to your DocuSense account
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm border border-red-200 dark:border-red-500/20 font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <button
          type="button"
          disabled={!isLoaded || loading}
          onClick={() => signInWith("oauth_google")}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50 font-semibold shadow-sm"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
        <button
          type="button"
          disabled={!isLoaded || loading}
          onClick={() => signInWith("oauth_github")}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50 font-semibold shadow-sm"
        >
          <svg
            className="h-5 w-5 text-zinc-900 dark:text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          Continue with GitHub
        </button>
      </div>

      <div className="relative flex items-center py-2 mb-6 opacity-70">
        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
        <span className="flex-shrink-0 mx-4 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Or continue with
        </span>
        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Work email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              disabled={loading}
              placeholder="you@company.com"
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-zinc-900 dark:text-white transition-all placeholder:text-zinc-500 shadow-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-zinc-900 dark:text-white transition-all placeholder:text-zinc-500 shadow-sm"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!isLoaded || loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
        >
          Create one
        </Link>
      </div>
    </div>
  );
}
