import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Socket events keep the cache fresh, so aggressive refetching is noise.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Never retry "you are not allowed" or "it does not exist".
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

export const queryKeys = {
  me: ['me'] as const,
  projects: ['projects'] as const,
  board: (projectId: string) => ['board', projectId] as const,
  comments: (taskId: string) => ['comments', taskId] as const,
  notifications: ['notifications'] as const,
  userSearch: (q: string) => ['userSearch', q] as const,
};
