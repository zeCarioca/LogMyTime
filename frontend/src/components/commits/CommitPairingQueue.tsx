import React, { useState, useEffect, useMemo } from 'react';
import { BranchWithCommits, TimeEntry } from '../../types';
import { commitsApi } from '../../api/commits';

interface CommitPairingQueueProps {
  onPairConfirmed?: () => void;
  refreshTrigger?: number;
}

export const CommitPairingQueue: React.FC<CommitPairingQueueProps> = ({ refreshTrigger, onPairConfirmed }) => {
  const [branchGroups, setBranchGroups] = useState<BranchWithCommits[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
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
      const [branchesData, timelogsData] = await Promise.all([
        commitsApi.getBranchesWithCommits(undefined, true),
        commitsApi.getUnassignedTime(),
      ]);
      setBranchGroups(branchesData);
      setUnassignedTimelogs(timelogsData);
    } catch (e: unknown) {
      console.error('Failed to fetch pairing queue data', e);
      setError('Failed to fetch data from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const displayedCommits = useMemo(() => {
    let list = [];
    if (selectedBranch === 'all') {
      const seen = new Set<string>();
      for (const bg of branchGroups) {
        for (const c of bg.commits) {
          if (!seen.has(c.sha)) {
            seen.add(c.sha);
            list.push(c);
          }
        }
      }
    } else {
      const group = branchGroups.find((g) => g.branch === selectedBranch);
      list = group ? [...group.commits] : [];
    }

    return list.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [branchGroups, selectedBranch]);

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
      if (onPairConfirmed) onPairConfirmed();
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

      <div className="pairing-dual-panels">
        {/* Left Column: Timelogs Container */}
        <div className="pairing-panel">
          <h3 className="panel-title-group">Timelogs</h3>
          {unassignedTimelogs.length === 0 ? (
            <p className="empty-panel-state">No timelogs available.</p>
          ) : (
            <div className="panel-scroll-body">
              {unassignedTimelogs.map((t) => {
                const isSelected = selectedTimelogIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTimelogSelection(t.id)}
                    className={`panel-item ${isSelected ? 'selected' : ''}`}
                    style={{ flexDirection: 'column', alignItems: 'stretch' }}
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
        <div className="pairing-panel">
          <div className="panel-header">
            <h3 className="panel-title-group">Recent Commits</h3>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                background: 'var(--bg-gradient, #11111b)',
                color: 'var(--text-color, #cdd6f4)',
                border: '1px solid var(--card-border, #313244)',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Branches</option>
              {branchGroups.map((g) => (
                <option key={g.branch} value={g.branch}>
                  {g.branch} ({g.commits.length})
                </option>
              ))}
            </select>
          </div>
          {displayedCommits.length === 0 ? (
            <p className="empty-panel-state">No commits available.</p>
          ) : (
            <div className="panel-scroll-body">
              {displayedCommits.map((c, index) => {
                const isSelected = selectedCommitSha === c.sha;
                return (
                  <div
                    key={c.sha || index}
                    onClick={() => toggleCommitSelection(c.sha)}
                    className={`panel-item ${isSelected ? 'selected' : ''}`}
                    style={{ flexDirection: 'column', alignItems: 'stretch' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 'bold', color: isSelected ? 'var(--success, #a6e3a1)' : 'var(--primary, #cba6f7)' }}>
                        {c.message}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #a6adc8)' }}>
                        {c.date ? new Date(c.date).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color, #cdd6f4)' }}>{c.repo_name}</p>
                      <span style={{
                        fontSize: '0.75rem',
                        background: 'rgba(203, 166, 247, 0.15)',
                        color: 'var(--primary, #cba6f7)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(203, 166, 247, 0.3)'
                      }}>
                        🌿 {c.branch}
                      </span>
                    </div>
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



