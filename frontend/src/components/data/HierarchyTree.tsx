import React from 'react';

interface HierarchyTreeProps {
  data: any;
  loading: boolean;
}

export const HierarchyTree: React.FC<HierarchyTreeProps> = ({ data, loading }) => {
  if (loading) {
    return <div className="loading-state">Loading hierarchy data...</div>;
  }

  if (!data || !data.hierarchy || data.hierarchy.length === 0) {
    return <div className="empty-state">No repository hierarchy data found.</div>;
  }

  return (
    <div className="hierarchy-tree-container">
      {data.hierarchy.map((repoNode: any) => (
        <div key={repoNode.repository_id} className="hierarchy-repo-node card">
          <div className="node-header">
            <h3>📦 {repoNode.repository}</h3>
            <span className="branch-tag">{repoNode.default_branch}</span>
          </div>

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
        </div>
      ))}
    </div>
  );
};
