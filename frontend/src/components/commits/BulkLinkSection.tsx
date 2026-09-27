import React from 'react';
import { CommitLink } from '../../types';

interface BulkLinkSectionProps {
  queue: CommitLink[];
  selectedTimelogIds: number[];
  selectedCommitSha: string;
  isLinking: boolean;
  error: string | null;
  onSelectCommitSha: (sha: string) => void;
  onToggleTimelog: (id: number) => void;
  onClear: () => void;
  onLink: () => void;
}

export const BulkLinkSection: React.FC<BulkLinkSectionProps> = ({
  queue,
  selectedTimelogIds,
  selectedCommitSha,
  isLinking,
  error,
  onSelectCommitSha,
  onToggleTimelog,
  onClear,
  onLink,
}) => {
  if (queue.length === 0) return null;

  // Deduplicate commits by commit_sha and sort from most recent to oldest
  const uniqueCommitsMap = new Map<string, CommitLink>();
  queue.forEach((link) => {
    if (!uniqueCommitsMap.has(link.commit_sha)) {
      uniqueCommitsMap.set(link.commit_sha, link);
    }
  });

  const sortedCommits = Array.from(uniqueCommitsMap.values()).sort(
    (a, b) => new Date(b.commit_date).getTime() - new Date(a.commit_date).getTime()
  );

  return (
    <div className="bulk-link-section card" style={{ marginTop: '1rem', padding: '1rem' }}>
      <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
        🔗 Bulk Link Timelogs
      </h3>

      {error && (
        <div className="error-banner" style={{ color: 'var(--danger, #ff5555)', marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
          Select Commit or Enter SHA:
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="input-select"
            value={selectedCommitSha}
            onChange={(e) => onSelectCommitSha(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">-- Choose from commits --</option>
            {sortedCommits.map((link) => (
              <option key={link.commit_sha} value={link.commit_sha}>
                {link.commit_sha.slice(0, 7)} - {link.commit_message}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="input-text"
            placeholder="Custom SHA..."
            value={selectedCommitSha}
            onChange={(e) => onSelectCommitSha(e.target.value)}
            style={{ width: '120px' }}
          />
        </div>
      </div>


      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
          Select Timelogs ({selectedTimelogIds.length} selected):
        </label>
        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {queue.map((link) => {
            const isChecked = selectedTimelogIds.includes(link.time_entry.id);
            return (
              <label
                key={link.time_entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '4px',
                  background: isChecked ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleTimelog(link.time_entry.id)}
                />
                <span>
                  <strong>#{link.time_entry.id}</strong> {link.time_entry.task_description} ({link.time_entry.formatted_duration})
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onClear}
          disabled={isLinking || (selectedTimelogIds.length === 0 && !selectedCommitSha)}
        >
          Clear
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={onLink}
          disabled={isLinking || selectedTimelogIds.length === 0 || !selectedCommitSha.trim()}
        >
          {isLinking ? 'Linking...' : `Link ${selectedTimelogIds.length} Timelog(s)`}
        </button>
      </div>
    </div>
  );
};
