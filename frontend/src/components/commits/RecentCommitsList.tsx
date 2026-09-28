import React from 'react';
import { RecentCommit } from '../../types';

interface RecentCommitsListProps {
  commits: RecentCommit[];
  selectedSha: string | null;
  onSelectCommit: (sha: string) => void;
}

export const RecentCommitsList: React.FC<RecentCommitsListProps> = ({
  commits,
  selectedSha,
  onSelectCommit,
}) => {
  return (
    <div className="pairing-panel right-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <h3>📌 Recent Commits ({commits.length})</h3>
          <span className="panel-subtitle">most recent first</span>
        </div>
      </div>

      <div className="panel-scroll-body">
        {commits.length === 0 ? (
          <div className="empty-panel-state">
            <span>🔍</span>
            <p>No commits found. Push commits to GitHub or work locally!</p>
          </div>
        ) : (
          commits.map((commit) => {
            const isSelected = selectedSha === commit.sha;
            return (
              <div
                key={commit.sha}
                className={`panel-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectCommit(commit.sha)}
              >
                <input
                  type="radio"
                  name="recent-commit"
                  checked={isSelected}
                  onChange={() => { }} // handled by parent onClick
                  className="item-radio"
                />
                <div className="item-details">
                  <div className="item-top-row">
                    <span className="commit-sha-tag">git #{commit.short_sha}</span>
                    <span className="repo-badge">{commit.repo_name}</span>
                  </div>
                  <p className="commit-msg">"{commit.message}"</p>
                  <div className="commit-meta">
                    <span className="commit-author">by {commit.author}</span>
                    {commit.date && (
                      <span className="commit-time">
                        {new Date(commit.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
