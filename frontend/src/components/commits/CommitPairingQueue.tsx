import React, { useState, useEffect, useCallback } from 'react';
import { TimeEntry, RecentCommit } from '../../types';
import { commitsApi } from '../../api/commits';
import { UnassignedTimeList } from './UnassignedTimeList';
import { RecentCommitsList } from './RecentCommitsList';

interface CommitPairingQueueProps {
  onPairConfirmed?: () => void;
}

export const CommitPairingQueue: React.FC<CommitPairingQueueProps> = ({ onPairConfirmed }) => {
  const [unassignedEntries, setUnassignedEntries] = useState<TimeEntry[]>([]);
  const [recentCommits, setRecentCommits] = useState<RecentCommit[]>([]);
  const [selectedTimelogIds, setSelectedTimelogIds] = useState<number[]>([]);
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [unassigned, commits] = await Promise.all([
        commitsApi.getUnassignedTime(),
        commitsApi.getRecent(),
      ]);
      setUnassignedEntries(unassigned);
      setRecentCommits(commits);
    } catch (e) {
      console.error('Failed to load manual pairing data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleSelectTime = (id: number) => {
    setSelectedTimelogIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedTimelogIds.length === unassignedEntries.length) {
      setSelectedTimelogIds([]);
    } else {
      setSelectedTimelogIds(unassignedEntries.map((e) => e.id));
    }
  };

  const handleConfirmPairing = async () => {
    if (selectedTimelogIds.length === 0 || !selectedCommitSha) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await commitsApi.bulkLink({
        timelog_ids: selectedTimelogIds,
        commit_sha: selectedCommitSha,
      });

      setFeedback({ type: 'success', message: res.message || 'Pairing confirmed successfully!' });
      setSelectedTimelogIds([]);
      setSelectedCommitSha(null);
      await loadData();
      if (onPairConfirmed) onPairConfirmed();
    } catch (e: any) {
      console.error('Failed to confirm pairing', e);
      setFeedback({
        type: 'error',
        message: e?.response?.data?.detail || 'Failed to confirm pairing. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCommit = recentCommits.find((c) => c.sha === selectedCommitSha);

  return (
    <div className="commit-pairing-card card">
      <div className="card-header-row">
        <h2 className="card-title">Manual Commit Pairing Container</h2>
        <button className="btn btn-xs btn-outline" onClick={loadData} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {feedback && (
        <div className={`alert-banner ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {feedback.message}
        </div>
      )}

      {/* Two Parallel Scrollers Container */}
      <div className="pairing-dual-panels">
        <UnassignedTimeList
          unassignedEntries={unassignedEntries}
          selectedIds={selectedTimelogIds}
          onToggleSelect={handleToggleSelectTime}
          onToggleSelectAll={handleToggleSelectAll}
        />
        <RecentCommitsList
          commits={recentCommits}
          selectedSha={selectedCommitSha}
          onSelectCommit={setSelectedCommitSha}
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="pairing-action-bar">
        <div className="selection-summary">
          {selectedTimelogIds.length > 0 ? (
            <span>
              Selected <strong>{selectedTimelogIds.length}</strong> timelog(s)
              {selectedCommit ? (
                <>
                  {' '}→ Target: <code className="sha-code">git #{selectedCommit.short_sha}</code> ({selectedCommit.repo_name})
                </>
              ) : (
                ' → Pick a commit on the right panel'
              )}
            </span>
          ) : (
            <span className="hint-text">Select one or more timelogs on the left and a commit on the right to pair.</span>
          )}
        </div>

        <button
          className="btn btn-primary btn-block confirm-pairing-btn"
          onClick={handleConfirmPairing}
          disabled={selectedTimelogIds.length === 0 || !selectedCommitSha || submitting}
        >
          {submitting
            ? 'Pairing and Syncing...'
            : `✓ Confirm & Assign Selection (${selectedTimelogIds.length})`}
        </button>
      </div>
    </div>
  );
};
