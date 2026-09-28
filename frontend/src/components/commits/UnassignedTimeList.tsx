import React from 'react';
import { TimeEntry } from '../../types';

interface UnassignedTimeListProps {
  unassignedEntries: TimeEntry[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
}

export const UnassignedTimeList: React.FC<UnassignedTimeListProps> = ({
  unassignedEntries,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}) => {
  const allSelected = unassignedEntries.length > 0 && selectedIds.length === unassignedEntries.length;

  return (
    <div className="pairing-panel left-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <h3>⏱️ Unassigned Timelogs ({unassignedEntries.length})</h3>
          <span className="panel-subtitle">commit = null</span>
        </div>
        {unassignedEntries.length > 0 && (
          <button className="btn btn-xs btn-outline" onClick={onToggleSelectAll}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      <div className="panel-scroll-body">
        {unassignedEntries.length === 0 ? (
          <div className="empty-panel-state">
            <span>✨</span>
            <p>No unassigned timelogs. All logged time is linked!</p>
          </div>
        ) : (
          unassignedEntries.map((entry) => {
            const isSelected = selectedIds.includes(entry.id);
            const repoLabel = entry.repo_name || entry.project || `Repo #${entry.repo_id}`;
            return (
              <div
                key={entry.id}
                className={`panel-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onToggleSelect(entry.id)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // handled by parent onClick
                  className="item-checkbox"
                />
                <div className="item-details">
                  <div className="item-top-row">
                    <span className="repo-badge">{repoLabel}</span>
                    <span className="duration-badge">{entry.formatted_duration}</span>
                  </div>
                  <p className="task-desc">{entry.task_description}</p>
                  <span className="created-date">
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
