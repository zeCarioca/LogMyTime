import React from 'react';
import { CommitLink } from '../../types';

interface CommitPairingQueueProps {
  queue: CommitLink[];
  actionLoadingId: number | null;
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
}

export const CommitPairingQueue: React.FC<CommitPairingQueueProps> = ({
  queue,
  actionLoadingId,
  onConfirm,
  onReject,
}) => {
  return (
    <div className="commit-pairing-card card">
      <div className="card-header-row">
        <h2 className="card-title">Pending Commit Pairings ({queue.length})</h2>
        <span className="live-indicator">LIVE POLLING</span>
      </div>

      {queue.length === 0 ? (
        <div className="empty-pairing-state">
          <span className="empty-icon">✨</span>
          <p>No pending commit matches. Commit code locally or push to GitHub to trigger pairing!</p>
        </div>
      ) : (
        <div className="pairing-queue-list">
          {queue.map((link) => (
            <div key={link.id} className="pairing-card">
              <div className="pairing-card-header">
                <span className="commit-sha">git #{link.commit_sha.slice(0, 7)}</span>
                <span className="commit-date">
                  {new Date(link.commit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="pairing-body">
                <p className="commit-message">"{link.commit_message}"</p>
                <div className="matched-timelog-preview">
                  <span className="timelog-icon">⏱️</span>
                  <span className="timelog-task">{link.time_entry.task_description}</span>
                  <span className="timelog-dur">{link.time_entry.formatted_duration}</span>
                </div>
              </div>

              <div className="pairing-actions">
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => onConfirm(link.id)}
                  disabled={actionLoadingId === link.id}
                >
                  {actionLoadingId === link.id ? 'Syncing...' : '✓ Confirm & Sync'}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => onReject(link.id)}
                  disabled={actionLoadingId === link.id}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
