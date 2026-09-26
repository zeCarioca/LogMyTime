import { apiClient } from './client';
import { User } from '../types';

export const authApi = {
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
  logout: async (): Promise<void> => {
    localStorage.removeItem('lmt_token');
  },
};
