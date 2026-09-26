import React from 'react';
import { GithubRepository } from '../../types';

interface ReposCardProps {
  activeRepos: GithubRepository[];
  archivedRepos: GithubRepository[];
  onRefresh: () => void;
  onToggleArchive: (id: number) => void;
  onManualSync: (id: number) => void;
}

export const ReposCard: React.FC<ReposCardProps> = ({
  activeRepos,
  archivedRepos,
  onRefresh,
  onToggleArchive,
  onManualSync,
}) => {
  const [showArchived, setShowArchived] = React.useState(false);

  return (
    <div className="repos-card card">
      <div className="card-header-row">
        <h2 className="card-title">Tracked Repositories ({activeRepos.length})</h2>
        <button className="btn btn-sm btn-outline" onClick={onRefresh}>
          🔄 Refresh Repos
        </button>
      </div>

      <div className="repos-list">
        {activeRepos.length === 0 ? (
          <p className="empty-notice">No active repositories tracked yet.</p>
        ) : (
          activeRepos.map((r) => (
            <div key={r.id} className="repo-item">
              <div className="repo-info-col">
                <span className="repo-name">{r.full_name}</span>
                <span className="repo-branch">branch: {r.default_branch}</span>
              </div>

              <div className="repo-actions-col">
                <span className="unsynced-badge">{r.unsynced_minutes}m pending</span>
                <button className="btn btn-xs btn-primary" onClick={() => onManualSync(r.id)}>
                  Sync Now
                </button>
                <button className="btn btn-xs btn-outline" onClick={() => onToggleArchive(r.id)}>
                  Archive
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {archivedRepos.length > 0 && (
        <div className="archived-repos-section">
          <button
            className="btn btn-sm btn-subtle toggle-archived-btn"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? '▲ Hide Archived' : `▼ Show Archived Repositories (${archivedRepos.length})`}
          </button>

          {showArchived && (
            <div className="repos-list archived-list">
              {archivedRepos.map((r) => (
                <div key={r.id} className="repo-item archived-item">
                  <div className="repo-info-col">
                    <span className="repo-name muted">{r.full_name}</span>
                    <span className="repo-branch">branch: {r.default_branch}</span>
                  </div>

                  <div className="repo-actions-col">
                    <button className="btn btn-xs btn-success" onClick={() => onToggleArchive(r.id)}>
                      Unarchive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

