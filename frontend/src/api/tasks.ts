import { Task, TaskCreate, TaskUpdate } from '../types';
import { apiClient as client } from './client';

export const getTasks = async (repoId?: number): Promise<Task[]> => {
  const params = repoId ? { repo_id: repoId } : undefined;
  const response = await client.get<Task[]>('/tasks/', { params });
  return response.data;
};

export const createTask = async (task: TaskCreate): Promise<Task> => {
  const response = await client.post<Task>('/tasks/', task);
  return response.data;
};

export const updateTask = async (id: number, task: TaskUpdate): Promise<Task> => {
  const response = await client.put<Task>(`/tasks/${id}`, task);
  return response.data;
};

export const deleteTask = async (id: number): Promise<void> => {
  await client.delete(`/tasks/${id}`);
};
