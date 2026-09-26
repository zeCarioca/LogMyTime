import { useState, useEffect, useCallback } from 'react';
import { GitStatus } from '../types';
import { commitsApi } from '../api/commits';

export function useGitStatus(intervalMs = 30000, enabled = true) {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const status = await commitsApi.getGitStatus();
      setGitStatus(status);
    } catch (e) {
      console.error('Failed to fetch local git status', e);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchStatus();
    if (!enabled) return;
    const timer = setInterval(fetchStatus, intervalMs);
    return () => clearInterval(timer);
  }, [fetchStatus, intervalMs, enabled]);

  const setLocalPath = async (path: string) => {
    try {
      await commitsApi.setLocalPath(path);
      await fetchStatus();
    } catch (e) {
      console.error('Failed to set local repo path', e);
    }
  };

  return {
    gitStatus,
    loading,
    refreshGitStatus: fetchStatus,
    setLocalPath,
  };
}
