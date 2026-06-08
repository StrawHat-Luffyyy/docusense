import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "../lib/api/client";

export function useAuthSync() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const query = useQuery({
    queryKey: ["authSync"],
    queryFn: async () => {
      const token = await getToken();
      const response = await apiClient.post(
        "/api/auth/sync",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: Infinity,
  });
  return {
    ...query,
    isSyncing: query.isLoading || query.isFetching,
  };
}
