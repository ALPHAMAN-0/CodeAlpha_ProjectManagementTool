import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, UserDTO } from '@pm/shared';
import { ApiError, api } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

interface AuthResponse {
  user: UserDTO;
}

/**
 * The session *is* the ['me'] cache entry - there is no second copy of auth
 * state to keep in sync. A 401 is an expected answer here, not a failure, so
 * retries are off and the error simply means "signed out".
 */
export function useMe() {
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.get<AuthResponse>('/auth/me'),
    retry: false,
    staleTime: Infinity,
  });

  const unauthenticated = query.error instanceof ApiError && query.error.status === 401;

  return {
    user: query.data?.user ?? null,
    isLoading: query.isPending,
    /** A real problem, as opposed to simply being logged out. */
    error: unauthenticated ? null : query.error,
  };
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<AuthResponse>('/auth/login', input),
    onSuccess: (data) => qc.setQueryData(queryKeys.me, data),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<AuthResponse>('/auth/register', input),
    onSuccess: (data) => qc.setQueryData(queryKeys.me, data),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    // Drop every cached project/board so the next account cannot see them.
    onSuccess: () => qc.clear(),
  });
}
