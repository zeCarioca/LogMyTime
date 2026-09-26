import { useState, useEffect, useCallback } from 'react';
import { CommitLink } from '../types';
import { commitsApi } from '../api/commits';

export function useCommitPoller(intervalMs = 15000, enabled = true) {
  const [queue, setQueue] = useState<CommitLink[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const pending = await commitsApi.getPending();
      setQueue(pending);
    } catch (e) {
      console.error('Failed to poll pending commit links', e);
    }
  }, [enabled]);

  useEffect(() => {
    poll();
    if (!enabled) return;
    const interval = setInterval(poll, intervalMs);
    return () => clearInterval(interval);
  }, [poll, intervalMs, enabled]);

  const confirmPairing = async (id: number) => {
    setActionLoadingId(id);
    try {
      await commitsApi.confirmPairing(id);
      setQueue((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error('Failed to confirm pairing', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const rejectPairing = async (id: number) => {
    setActionLoadingId(id);
    try {
      await commitsApi.rejectPairing(id);
      setQueue((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error('Failed to reject pairing', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  return {
    queue,
    loading,
    actionLoadingId,
    pollNow: poll,
    confirmPairing,
    rejectPairing,
  };
}
