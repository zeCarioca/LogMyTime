import { apiClient } from './client';
import { GithubRepository } from '../types';

export const reposApi = {
  getRepositories: async (): Promise<GithubRepository[]> => {
    const response = await apiClient.get<GithubRepository[]>('/repos/');
    return response.data;
  },
  refreshRepositories: async (): Promise<GithubRepository[]> => {
    const response = await apiClient.post<GithubRepository[]>('/repos/refresh');
    return response.data;
  },
  toggleVisibility: async (repoId: number): Promise<{ status: string; is_active: boolean }> => {
    const response = await apiClient.post<{ status: string; is_active: boolean }>(`/repos/${repoId}/toggle-visibility`);
    return response.data;
  },
};
