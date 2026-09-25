"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { setClerkTokenGetter } from "@/lib/api/client";

function ClerkTokenInitializer({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkTokenGetter(() => getToken());
  }, [getToken]);

  return <>{children}</>;
}

function ClerkProviderWithTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: "#4f46e5",
        },
        elements: {
          card: "shadow-xl border border-zinc-200 dark:border-zinc-800",
        },
      }}
    >
      <ClerkTokenInitializer>{children}</ClerkTokenInitializer>
    </ClerkProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ClerkProviderWithTheme>
          {children}
          <Toaster position="bottom-right" richColors />
        </ClerkProviderWithTheme>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
