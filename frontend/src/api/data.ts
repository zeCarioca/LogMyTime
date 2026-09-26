import { apiClient } from './client';

export const dataApi = {
  getHierarchy: async (repoId?: number, repoName?: string): Promise<any> => {
    const params: Record<string, any> = {};
    if (repoId) params.repo_id = repoId;
    if (repoName) params.repo = repoName;
    const response = await apiClient.get('/data/hierarchy', { params });
    return response.data;
  },
  setSelectedRepoPreference: async (repository: string): Promise<{ status: string }> => {
    const response = await apiClient.post('/data/preference/selected-repo', { repository });
    return response.data;
  },
  getExportCsvUrl: (repoId?: number, repoName?: string): string => {
    const params = new URLSearchParams();
    if (repoId) params.append('repo_id', repoId.toString());
    if (repoName) params.append('repo', repoName);
    const query = params.toString();
    return `/data/export/csv${query ? `?${query}` : ''}`;
  },
};
