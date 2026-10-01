import React, { useState } from 'react';
import { GithubRepository } from '../../types';

interface LoggingCardProps {
  repos: GithubRepository[];
  seconds: number;
  onAddMinutes: (mins: number) => void;
  onSaveTime: (repoId: number, description: string, durationSeconds: number) => Promise<void>;
}

export const LoggingCard: React.FC<LoggingCardProps> = ({
  repos,
  seconds,
  onAddMinutes,
  onSaveTime,
}) => {
  const [selectedRepoId, setSelectedRepoId] = useState<number>(0);
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  React.useEffect(() => {
    if (repos.length > 0 && selectedRepoId === 0) {
      const lastUsedStr = localStorage.getItem('lastUsedRepoId');
      if (lastUsedStr) {
        const lastUsed = parseInt(lastUsedStr, 10);
        if (repos.some(r => r.id === lastUsed)) {
          setSelectedRepoId(lastUsed);
          return;
        }
      }
      setSelectedRepoId(repos[0].id);
    }
  }, [repos, selectedRepoId]);

  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = Number(e.target.value);
    setSelectedRepoId(newId);
    if (newId > 0) {
      localStorage.setItem('lastUsedRepoId', newId.toString());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoId || !taskDescription.trim() || seconds <= 0) return;
    setSaving(true);
    try {
      await onSaveTime(selectedRepoId, taskDescription.trim(), seconds);
      setTaskDescription('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="logging-card card">
      <h2 className="card-title">Log Development Time</h2>
      <form onSubmit={handleSave} className="logging-form">
        <div className="form-group">
          <label htmlFor="repo-select">Target Repository</label>
          <select
            id="repo-select"
            className="form-control"
            value={selectedRepoId}
            onChange={handleRepoChange}
            required
          >
            <option value="">Select a repository...</option>
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="task-input">Task Description</label>
          <input
            id="task-input"
            type="text"
            className="form-control"
            placeholder="What are you building or debugging?"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            required
          />
        </div>

        <div className="duration-steppers-row" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="stepper-label">Adjust:</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => onAddMinutes(-15)} disabled={seconds === 0}>
            -15m
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => onAddMinutes(15)}>
            +15m
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => onAddMinutes(30)}>
            +30m
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => onAddMinutes(60)}>
            +60m
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={saving || seconds <= 0 || !selectedRepoId || !taskDescription.trim()}
        >
          {saving ? 'Saving...' : 'Log Time Entry'}
        </button>
      </form>
    </div>
  );
};
