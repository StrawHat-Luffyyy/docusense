import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Store the Clerk instance for use in interceptors
let clerkTokenGetter: (() => Promise<string | null>) | null = null;

export function setClerkTokenGetter(getter: () => Promise<string | null>) {
  clerkTokenGetter = getter;
}

apiClient.interceptors.request.use(async (config) => {
  if (clerkTokenGetter) {
    try {
      const token = await clerkTokenGetter();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Failed to get Clerk token:", error);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/sign-in";
    }
    return Promise.reject(error);
  },
);
