import { useState, useEffect, useCallback } from 'react';
import { GithubRepository } from '../types';
import { reposApi } from '../api/repos';

export function useRepos(enabled = true) {
  const [repos, setRepos] = useState<GithubRepository[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchRepos = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await reposApi.getRepositories();
      setRepos(data);
    } catch (e) {
      console.error('Failed to fetch repos', e);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const refreshRepos = async () => {
    setLoading(true);
    try {
      const data = await reposApi.refreshRepositories();
      setRepos(data);
    } catch (e) {
      console.error('Failed to refresh repos', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleArchive = async (repoId: number) => {
    try {
      const res = await reposApi.toggleVisibility(repoId);
      setRepos((prev) =>
        prev.map((r) => (r.id === repoId ? { ...r, is_active: res.is_active } : r))
      );
    } catch (e) {
      console.error('Failed to toggle visibility', e);
    }
  };

  return {
    repos,
    activeRepos: repos.filter((r) => r.is_active),
    archivedRepos: repos.filter((r) => !r.is_active),
    loading,
    refreshRepos,
    toggleArchive,
    refetchRepos: fetchRepos,
  };
}
