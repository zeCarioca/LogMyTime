import React from 'react';
import { GitStatus } from '../../types';

interface LocalGitStatusProps {
  status: GitStatus | null;
}

export const LocalGitStatus: React.FC<LocalGitStatusProps> = ({ status }) => {
  return (
    <div className="local-git-card card">
      <div className="card-header-row">
        <h2 className="card-title">GitHub Repository Status</h2>
      </div>

      {!status?.is_valid ? (
        <p className="no-git-notice">
          No active repository selected. Please activate a repository in the Repositories panel!
        </p>
      ) : (
        <div className="git-details">
          <div className="git-row">
            <span className="git-label">Active Repo:</span>
            <span className="git-value branch-badge">📦 {status.repo_path}</span>
          </div>

          <div className="git-row">
            <span className="git-label">Default Branch:</span>
            <span className="git-value branch-badge">🌿 {status.branch}</span>
          </div>

          {status.last_commit && (
            <div className="git-row">
              <span className="git-label">Latest Cloud Commit:</span>
              <span className="git-value commit-msg">
                #{status.last_commit.short_sha} "{status.last_commit.message}"
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
