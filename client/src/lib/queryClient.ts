import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Pre-cache function for common pages
export const preCacheCommonData = async (tenantId: string) => {
  if (!tenantId) return;

  const prefetchPromises = [
    // Dashboard data
    queryClient.prefetchQuery({
      queryKey: ["/api/dashboard/stats", tenantId],
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
    
    // Appointments data
    queryClient.prefetchQuery({
      queryKey: ["/api/appointments", tenantId],
      staleTime: 2 * 60 * 1000, // 2 minutes
    }),
    
    // Clients data
    queryClient.prefetchQuery({
      queryKey: ["/api/clients", tenantId],
      staleTime: 10 * 60 * 1000, // 10 minutes
    }),
    
    // Pets data
    queryClient.prefetchQuery({
      queryKey: ["/api/pets", tenantId],
      staleTime: 10 * 60 * 1000, // 10 minutes
    }),
    
    // Staff data
    queryClient.prefetchQuery({
      queryKey: ["/api/staff", tenantId],
      staleTime: 30 * 60 * 1000, // 30 minutes
    }),
    
    // Rooms data
    queryClient.prefetchQuery({
      queryKey: ["/api/rooms", tenantId],
      staleTime: 30 * 60 * 1000, // 30 minutes
    }),
    
    // Follow-up count
    queryClient.prefetchQuery({
      queryKey: ["/api/medical-appointments/follow-up-count", tenantId],
      staleTime: 1 * 60 * 1000, // 1 minute
    }),
  ];

  try {
    await Promise.allSettled(prefetchPromises);
  } catch (error) {
    console.warn("Pre-cache failed for some queries:", error);
  }
};
