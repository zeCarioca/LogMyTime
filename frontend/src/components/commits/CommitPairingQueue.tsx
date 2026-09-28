import React, { useState, useEffect } from 'react';
import { RecentCommit, TimeEntry } from '../../types';
import { commitsApi } from '../../api/commits';

interface CommitPairingQueueProps {
  onPairConfirmed?: () => void;
}

export const CommitPairingQueue: React.FC<CommitPairingQueueProps> = () => {
  const [recentCommits, setRecentCommits] = useState<RecentCommit[]>([]);
  const [unassignedTimelogs, setUnassignedTimelogs] = useState<TimeEntry[]>([]);
  const [selectedTimelogIds, setSelectedTimelogIds] = useState<Set<number>>(new Set());
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [linking, setLinking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [commitsData, timelogsData] = await Promise.all([
        commitsApi.getRecent(),
        commitsApi.getUnassignedTime(),
      ]);
      setRecentCommits(commitsData);
      setUnassignedTimelogs(timelogsData);
    } catch (e: any) {
      console.error('Failed to fetch pairing queue data', e);
      setError('Failed to fetch data from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleTimelogSelection = (id: number) => {
    setSelectedTimelogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCommitSelection = (sha: string) => {
    setSelectedCommitSha((prev) => (prev === sha ? null : sha));
  };

  const handleBulkLink = async () => {
    if (selectedTimelogIds.size === 0 || !selectedCommitSha) return;

    setLinking(true);
    setError(null);
    try {
      const timelogIdsArray = Array.from(selectedTimelogIds);
      await commitsApi.bulkLink({
        commit_sha: selectedCommitSha,
        timelog_ids: timelogIdsArray,
      });

      // Remove linked timelogs from the left panel immediately
      setUnassignedTimelogs((prev) =>
        prev.filter((t) => !selectedTimelogIds.has(t.id))
      );
      // Clear selected timelogs but keep selectedCommitSha active
      setSelectedTimelogIds(new Set());
    } catch (e: any) {
      console.error('Failed to bulk link timelogs to commit', e);
      setError('Failed to link selected timelogs to commit');
    } finally {
      setLinking(false);
    }
  };

  const isLinkDisabled = selectedTimelogIds.size === 0 || !selectedCommitSha || linking;

  return (
    <div className="commit-pairing-card card">
      <div className="card-header-row">
        <h2 className="card-title">Manual Commit Pairing Container</h2>
        <button className="btn btn-xs btn-outline" onClick={fetchData} disabled={loading || linking}>
          {loading ? 'Loading...' : '🔄 Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-danger" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        {/* Left Column: Timelogs Container */}
        <div style={{
          background: 'var(--card-bg, #1e1e2e)',
          border: '1px solid var(--card-border, #313244)',
          borderRadius: '8px',
          padding: '1rem',
          minHeight: '300px'
        }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0', color: 'var(--primary, #cba6f7)' }}>Timelogs</h3>
          {unassignedTimelogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted, #a6adc8)', fontSize: '0.85rem' }}>No timelogs available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
              {unassignedTimelogs.map((t) => {
                const isSelected = selectedTimelogIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTimelogSelection(t.id)}
                    style={{
                      background: 'var(--bg-gradient, #11111b)',
                      border: isSelected ? '2px solid var(--primary, #cba6f7)' : '1px solid var(--card-border, #313244)',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 8px rgba(203, 166, 247, 0.3)' : 'none',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary, #cba6f7)' }}>{t.task_description}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #a6adc8)' }}>{t.formatted_duration}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color, #cdd6f4)' }}>
                      {t.repo_name || t.project || `Repo #${t.repo_id}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Commits Container */}
        <div style={{
          background: 'var(--card-bg, #1e1e2e)',
          border: '1px solid var(--card-border, #313244)',
          borderRadius: '8px',
          padding: '1rem',
          minHeight: '300px'
        }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0', color: 'var(--primary, #cba6f7)' }}>Recent Commits</h3>
          {recentCommits.length === 0 ? (
            <p style={{ color: 'var(--text-muted, #a6adc8)', fontSize: '0.85rem' }}>No commits available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
              {recentCommits.map((c, index) => {
                const isSelected = selectedCommitSha === c.sha;
                return (
                  <div
                    key={c.sha || index}
                    onClick={() => toggleCommitSelection(c.sha)}
                    style={{
                      background: 'var(--bg-gradient, #11111b)',
                      border: isSelected ? '2px solid var(--success, #a6e3a1)' : '1px solid var(--card-border, #313244)',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 8px rgba(166, 227, 161, 0.3)' : 'none',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 'bold', color: isSelected ? 'var(--success, #a6e3a1)' : 'var(--primary, #cba6f7)' }}>
                        {c.message}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #a6adc8)' }}>{c.date}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-color, #cdd6f4)' }}>{c.repo_name}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Link Action Button */}
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleBulkLink}
          disabled={isLinkDisabled}
        >
          {linking ? 'Linking...' : `Link ${selectedTimelogIds.size} timelog(s) → commit`}
        </button>
      </div>
    </div>
  );
};



