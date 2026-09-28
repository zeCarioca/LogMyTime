import React, { useState, useEffect } from 'react';
import { RecentCommit } from '../../types';
import { commitsApi } from '../../api/commits';

interface CommitPairingQueueProps {
  onPairConfirmed?: () => void;
}

export const CommitPairingQueue: React.FC<CommitPairingQueueProps> = () => {
  const [recentCommits, setRecentCommits] = useState<RecentCommit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommits = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await commitsApi.getRecent();
      setRecentCommits(data);
    } catch (e: any) {
      console.error('Failed to fetch recent commits', e);
      setError('Failed to fetch data from http://127.0.0.1:8000/commits/recent');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommits();
  }, []);

  return (
    <div className="commit-pairing-card card">
      <div className="card-header-row">
        <h2 className="card-title">Manual Commit Pairing Container</h2>
        <button className="btn btn-xs btn-outline" onClick={fetchCommits} disabled={loading}>
          {loading ? 'Loading...' : '🔄 Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        {/* Left Column: Empty Timelogs Container */}
        <div style={{
          background: 'var(--card-bg, #1e1e2e)',
          border: '1px solid var(--card-border, #313244)',
          borderRadius: '8px',
          padding: '1rem',
          minHeight: '300px'
        }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0', color: 'var(--primary, #cba6f7)' }}>Timelogs</h3>
          <p style={{ color: 'var(--text-muted, #a6adc8)', fontSize: '0.85rem' }}>No timelogs available.</p>
        </div>

        {/* Right Column: Recent Commits Container */}
        <div style={{
          background: 'var(--card-bg, #1e1e2e)',
          border: '1px solid var(--card-border, #313244)',
          borderRadius: '8px',
          padding: '1rem',
          minHeight: '300px'
        }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0', color: 'var(--primary, #cba6f7)' }}>Recent Commits</h3>
          {recentCommits.length === 0 ? (
            <p style={{ color: 'var(--text-muted, #a6adc8)', fontSize: '0.85rem' }}>No commits available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
              {recentCommits.map((c, index) => (
                <div 
                  key={c.sha || index} 
                  style={{ 
                    background: 'var(--bg-gradient, #11111b)', 
                    border: '1px solid var(--card-border, #313244)', 
                    borderRadius: '6px', 
                    padding: '0.75rem 1rem' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary, #cba6f7)' }}>{c.message}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #a6adc8)' }}>{c.date}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-color, #cdd6f4)' }}>{c.repo_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

