import { QueryClient } from "@tanstack/react-query";

// Config base de TanStack Query (server-state sobre la unica instancia de Axios).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});
