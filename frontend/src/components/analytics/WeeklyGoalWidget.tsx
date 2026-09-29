import React, { useState, useMemo } from 'react';
import { AnalyticsGoal, WeeklySummaryItem } from '../../types';

interface WeeklyGoalWidgetProps {
  goal: AnalyticsGoal | null;
  weeklyData: WeeklySummaryItem[];
  onUpdateGoal: (seconds: number) => Promise<boolean>;
}

export const WeeklyGoalWidget: React.FC<WeeklyGoalWidgetProps> = ({ goal, weeklyData, onUpdateGoal }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editHours, setEditHours] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Find the current week's total seconds
  const currentWeekSeconds = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) return 0;
    // Assume the last item in the array is the current week (or sorted latest)
    const sorted = [...weeklyData].sort((a, b) => b.week_start.localeCompare(a.week_start));
    return sorted[0].total_seconds;
  }, [weeklyData]);

  const targetSeconds = goal?.weekly_target_seconds || 0;
  const targetHours = targetSeconds / 3600;
  
  const progressPct = targetSeconds > 0 
    ? Math.min(100, Math.round((currentWeekSeconds / targetSeconds) * 100))
    : 0;
    
  const currentHoursFormatted = (currentWeekSeconds / 3600).toFixed(1);

  const handleEditClick = () => {
    setEditHours(targetHours.toString());
    setIsEditing(true);
  };

  const handleSave = async () => {
    const hours = parseFloat(editHours);
    if (isNaN(hours) || hours < 0) {
      alert("Please enter a valid number of hours.");
      return;
    }
    
    setIsSaving(true);
    const success = await onUpdateGoal(hours * 3600);
    setIsSaving(false);
    
    if (success) {
      setIsEditing(false);
    } else {
      alert("Failed to update goal.");
    }
  };

  if (isEditing) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Edit Weekly Goal</h4>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="number" 
            value={editHours} 
            onChange={e => setEditHours(e.target.value)}
            className="input-field"
            style={{ width: '80px' }}
            step="0.5"
            min="0"
          />
          <span style={{ color: 'var(--text-muted)' }}>hours/week</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button className="btn btn-outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
      <button 
        className="btn btn-outline" 
        style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
        onClick={handleEditClick}
      >
        ✏️ Edit Goal
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>🎯</span>
        <h4 style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>Weekly Target</h4>
      </div>
      
      <div style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text)' }}>
            {currentHoursFormatted}h
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>/ {targetHours}h</span>
        </div>
      </div>

      <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${progressPct}%`, 
            background: progressPct >= 100 ? '#4ade80' : 'var(--primary)',
            transition: 'width 0.5s ease-in-out'
          }} 
        />
      </div>
    </div>
  );
};
