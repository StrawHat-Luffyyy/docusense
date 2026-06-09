"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { setClerkTokenGetter } from "@/lib/api/client";

function ClerkTokenInitializer({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkTokenGetter(() => getToken());
  }, [getToken]);

  return <>{children}</>;
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
    <ClerkProvider>
      <ClerkTokenInitializer>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster position="bottom-right" richColors />
          </QueryClientProvider>
        </ThemeProvider>
      </ClerkTokenInitializer>
    </ClerkProvider>
  );
}
