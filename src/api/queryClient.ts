import { QueryClient } from '@tanstack/react-query';
import { toApiError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry once only for network / server errors. 4xx answers are final (404, 403, ...)
      retry: (failureCount, error) => {
        const status = toApiError(error).status;
        if (status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      // Never retry a booking or any other write automatically
      retry: false,
    },
  },
});
