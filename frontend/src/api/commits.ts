import { apiClient } from './client';
import { CommitLink, GitStatus } from '../types';

export const commitsApi = {
  getPending: async (): Promise<CommitLink[]> => {
    const response = await apiClient.get<CommitLink[]>('/commits/pending');
    return response.data;
  },
  confirmPairing: async (linkId: number): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post<{ status: string; message: string }>(`/commits/${linkId}/confirm`);
    return response.data;
  },
  rejectPairing: async (linkId: number): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post<{ status: string; message: string }>(`/commits/${linkId}/reject`);
    return response.data;
  },
  getGitStatus: async (): Promise<GitStatus> => {
    const response = await apiClient.get<GitStatus>('/commits/git-status');
    return response.data;
  },
  setLocalPath: async (path: string): Promise<{ status: string; local_repo_path: string }> => {
    const response = await apiClient.post<{ status: string; local_repo_path: string }>('/commits/set-local-path', null, {
      params: { path },
    });
    return response.data;
  },
};
