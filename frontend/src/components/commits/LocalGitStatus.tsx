import React, { useState } from 'react';
import { GitStatus } from '../../types';

interface LocalGitStatusProps {
  status: GitStatus | null;
  onSetPath: (path: string) => Promise<void>;
}

export const LocalGitStatus: React.FC<LocalGitStatusProps> = ({ status, onSetPath }) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [pathInput, setPathInput] = useState<string>(status?.repo_path || '');

  const handleSavePath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathInput.trim()) return;
    await onSetPath(pathInput.trim());
    setEditing(false);
  };

  return (
    <div className="local-git-card card">
      <div className="card-header-row">
        <h2 className="card-title">Local Git Repository</h2>
        <button className="btn btn-xs btn-outline" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : 'Set Path'}
        </button>
      </div>

      {editing ? (
        <form onSubmit={handleSavePath} className="path-edit-form">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="C:\Users\...\path\to\repo"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
          />
          <button type="submit" className="btn btn-xs btn-primary">
            Save Path
          </button>
        </form>
      ) : !status?.is_valid ? (
        <p className="no-git-notice">
          No local repository path set. Click <strong>Set Path</strong> to connect your working folder!
        </p>
      ) : (
        <div className="git-details">
          <div className="git-row">
            <span className="git-label">Branch:</span>
            <span className="git-value branch-badge">🌿 {status.branch}</span>
          </div>

          {status.last_commit && (
            <div className="git-row">
              <span className="git-label">Last Commit:</span>
              <span className="git-value commit-msg">
                #{status.last_commit.short_sha} "{status.last_commit.message}"
              </span>
            </div>
          )}

          <div className="git-files-summary">
            <span className="staged-count">
              Staged: <strong>{status.staged_files?.length || 0}</strong>
            </span>
            <span className="modified-count">
              Modified: <strong>{status.modified_files?.length || 0}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
