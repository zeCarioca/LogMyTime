import React, { useState } from 'react';
import { GitGraphTree } from './GitGraphTree';

interface HierarchyTreeProps {
  data: any;
  loading: boolean;
  refreshCount: number;
}

export const HierarchyTree: React.FC<HierarchyTreeProps> = ({ data, loading, refreshCount }) => {
  const [viewModes, setViewModes] = useState<Record<number, 'list' | 'graph'>>({});

  if (loading) {
    return <div className="loading-state">Loading hierarchy data...</div>;
  }

  if (!data || !data.hierarchy || data.hierarchy.length === 0) {
    return <div className="empty-state">No repository hierarchy data found.</div>;
  }

  const toggleViewMode = (repoId: number) => {
    setViewModes(prev => ({
      ...prev,
      [repoId]: prev[repoId] === 'graph' ? 'list' : 'graph'
    }));
  };

  return (
    <div className="hierarchy-tree-container">
      {data.hierarchy.map((repoNode: any) => {
        const mode = viewModes[repoNode.repository_id] || 'list';
        return (
        <div key={repoNode.repository_id} className="hierarchy-repo-node card">
          <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3>📦 {repoNode.repository}</h3>
              <span className="branch-tag">{repoNode.default_branch}</span>
            </div>
            <button 
              className="btn btn-outline" 
              onClick={() => toggleViewMode(repoNode.repository_id)}
            >
              {mode === 'list' ? '🌿 View Branch Tree' : '📄 View Time List'}
            </button>
          </div>

          {mode === 'graph' ? (
            <GitGraphTree repoId={repoNode.repository_id} repoName={repoNode.repository} refreshCount={refreshCount} />
          ) : (
            <>
              {repoNode.user_list.map((u: any) => (
            <div key={u.username} className="node-user-content">
              <div className="user-metrics-summary">
                <span>Total Logged: <strong>{u.summary.total_minutes} mins</strong></span>
                <span>Entries: <strong>{u.summary.total_entries}</strong></span>
                <span>Commits: <strong>{u.summary.total_commits}</strong></span>
              </div>

              <div className="node-records">
                <h4>Recent Time Records</h4>
                <ul className="records-list">
                  {u.time_records.map((r: any) => (
                    <li key={r.id} className="record-item">
                      <span className="record-task">{r.task_description}</span>
                      <span className="record-dur">{r.formatted_duration}</span>
                      <span className={`sync-badge ${r.is_synced ? 'synced' : 'pending'}`}>
                        {r.is_synced ? 'Synced' : 'Pending'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
            </>
          )}
        </div>
      )})}
    </div>
  );
};
