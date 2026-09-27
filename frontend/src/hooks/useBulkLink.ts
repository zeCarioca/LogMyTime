import { useState } from 'react';
import { commitsApi } from '../api/commits';
import { BulkLinkResponse } from '../types';

export function useBulkLink() {
  const [selectedTimelogIds, setSelectedTimelogIds] = useState<number[]>([]);
  const [selectedCommitSha, setSelectedCommitSha] = useState<string>('');
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTimelogSelection = (id: number) => {
    setSelectedTimelogIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedTimelogIds([]);
    setSelectedCommitSha('');
    setError(null);
  };

  const linkSelected = async (): Promise<BulkLinkResponse | null> => {
    if (selectedTimelogIds.length === 0) {
      setError('Select at least one timelog.');
      return null;
    }
    if (!selectedCommitSha.trim()) {
      setError('Specify a commit SHA.');
      return null;
    }

    setIsLinking(true);
    setError(null);
    try {
      const res = await commitsApi.bulkLink({
        commit_sha: selectedCommitSha.trim(),
        timelog_ids: selectedTimelogIds,
      });
      clearSelection();
      return res;
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.message || 'Failed to bulk link timelogs';
      setError(msg);
      return null;
    } finally {
      setIsLinking(false);
    }
  };

  return {
    selectedTimelogIds,
    selectedCommitSha,
    isLinking,
    error,
    setSelectedCommitSha,
    toggleTimelogSelection,
    clearSelection,
    linkSelected,
  };
}
