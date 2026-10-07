import { useState, useEffect, useCallback } from 'react';
import { Task, TaskCreate, TaskUpdate } from '../types';
import * as tasksApi from '../api/tasks';

export function useTasks(repoId?: number, enabled = true) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTasks = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await tasksApi.getTasks(repoId);
      setTasks(data);
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    } finally {
      setLoading(false);
    }
  }, [repoId, enabled]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (taskData: TaskCreate) => {
    try {
      const newTask = await tasksApi.createTask(taskData);
      setTasks((prev) => [newTask, ...prev]);
      return newTask;
    } catch (e) {
      console.error('Failed to create task', e);
      throw e;
    }
  };

  const updateTaskStatus = async (id: number, taskData: TaskUpdate) => {
    try {
      const updatedTask = await tasksApi.updateTask(id, taskData);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? updatedTask : t))
      );
      return updatedTask;
    } catch (e) {
      console.error('Failed to update task', e);
      throw e;
    }
  };

  const removeTask = async (id: number) => {
    try {
      await tasksApi.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error('Failed to delete task', e);
      throw e;
    }
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  return {
    tasks: safeTasks,
    activeTasks: safeTasks.filter((t) => t?.status !== 'done'),
    completedTasks: safeTasks.filter((t) => t?.status === 'done'),
    loading,
    refetchTasks: fetchTasks,
    addTask,
    updateTaskStatus,
    removeTask,
  };
}
