import { apiClient } from './client';
import { TimeEntry } from '../types';

export interface LogTimePayload {
  repo_id: number;
  task_description: string;
  duration_seconds?: number;
  duration_minutes?: number;
  commit?: string;
  commit_sha?: string;
  commit_message?: string;
  task_id?: number;
}

export const timeApi = {
  logTime: async (payload: LogTimePayload): Promise<TimeEntry> => {
    const response = await apiClient.post<TimeEntry>('/time/log', payload);
    return response.data;
  },
  deleteEntry: async (entryId: number): Promise<{ status: string }> => {
    const response = await apiClient.delete<{ status: string }>(`/time/${entryId}`);
    return response.data;
  },
  manualSync: async (repoId: number): Promise<{ status: string; synced_count?: number }> => {
    const response = await apiClient.post<{ status: string; synced_count?: number }>(`/time/sync-manual/${repoId}`);
    return response.data;
  },
  
  // Active Timer Endpoints
  getTimerState: async () => {
    const response = await apiClient.get('/time/timer/state');
    return response.data;
  },
  startTimer: async (payload: { repo_id?: number; task_description?: string }) => {
    const response = await apiClient.post('/time/timer/start', payload);
    return response.data;
  },
  pauseTimer: async () => {
    const response = await apiClient.post('/time/timer/pause');
    return response.data;
  },
  resetTimer: async () => {
    const response = await apiClient.post('/time/timer/reset');
    return response.data;
  },
  addTime: async (minutes: number) => {
    const response = await apiClient.post('/time/timer/add-time', { minutes });
    return response.data;
  },
};
