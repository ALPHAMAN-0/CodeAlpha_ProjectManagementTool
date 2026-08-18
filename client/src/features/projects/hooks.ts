import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProjectInput, ProjectDTO, ProjectSummaryDTO } from '@pm/shared';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => api.get<{ projects: ProjectSummaryDTO[] }>('/projects'),
    select: (data) => data.projects,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      api.post<{ project: ProjectDTO }>('/projects', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.del<void>(`/projects/${projectId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}
