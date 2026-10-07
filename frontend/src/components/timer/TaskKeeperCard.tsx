import React, { useState } from 'react';
import { Task } from '../../types';

interface TaskKeeperCardProps {
  activeTasks: Task[];
  completedTasks: Task[];
  onAddTask: (title: string) => Promise<void>;
  onUpdateStatus: (id: number, status: 'todo' | 'done') => Promise<void>;
  onPlayTask: (task: Task) => void;
  activeTaskId?: number | null;
}

export const TaskKeeperCard: React.FC<TaskKeeperCardProps> = ({
  activeTasks,
  completedTasks,
  onAddTask,
  onUpdateStatus,
  onPlayTask,
  activeTaskId,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    setIsAdding(true);
    try {
      await onAddTask(newTaskTitle);
      setNewTaskTitle('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="task-keeper-card card">
      <div className="card-header-row">
        <h2 className="card-title">Task Keeper</h2>
      </div>

      <form className="task-add-form" onSubmit={handleAddSubmit}>
        <input
          type="text"
          className="input task-input"
          placeholder="What needs to be done?"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          disabled={isAdding}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={isAdding || !newTaskTitle.trim()}>
          {isAdding ? '...' : '+'}
        </button>
      </form>

      <div className="task-list active-tasks">
        {activeTasks.length === 0 ? (
          <p className="empty-notice">No active tasks.</p>
        ) : (
          activeTasks.map((task) => (
            <div key={task.id} className={`task-item ${task.id === activeTaskId ? 'active' : ''}`}>
              <div className="task-info">
                <input
                  type="checkbox"
                  className="task-checkbox"
                  checked={false}
                  onChange={() => onUpdateStatus(task.id, 'done')}
                />
                <span className="task-title">{task.title}</span>
              </div>
              <button
                className={`btn btn-xs ${task.id === activeTaskId ? 'btn-success' : 'btn-outline'}`}
                onClick={() => onPlayTask(task)}
                title="Track time for this task"
              >
                ▶ Play
              </button>
            </div>
          ))
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="completed-tasks-section">
          <button
            className="btn btn-sm btn-subtle toggle-archived-btn"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? '▲ Hide Completed' : `▼ Show Completed (${completedTasks.length})`}
          </button>

          {showCompleted && (
            <div className="task-list completed-list">
              {completedTasks.map((task) => (
                <div key={task.id} className="task-item completed-item">
                  <div className="task-info">
                    <input
                      type="checkbox"
                      className="task-checkbox"
                      checked={true}
                      onChange={() => onUpdateStatus(task.id, 'todo')}
                    />
                    <span className="task-title muted" style={{ textDecoration: 'line-through' }}>
                      {task.title}
                    </span>
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
