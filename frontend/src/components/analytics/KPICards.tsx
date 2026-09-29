import React from 'react';
import { SessionStatsOut, PairingCoverageOut } from '../../types';

interface KPICardsProps {
  sessions: SessionStatsOut | null;
  pairing: PairingCoverageOut | null;
  isLoading: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ sessions, pairing, isLoading }) => {
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (isLoading) {
    return (
      <>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Avg Session</h4>
          <h2 style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>...</h2>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Pairing Coverage</h4>
          <h2 style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>...</h2>
        </div>
      </>
    );
  }

  const avgSession = sessions?.avg_session_seconds ? formatDuration(sessions.avg_session_seconds) : '0m';
  const coveragePct = pairing?.pairing_pct ? Math.round(pairing.pairing_pct) : 0;
  
  // Link lag could be null
  const linkLagHours = pairing?.avg_link_lag_hours;
  const linkLagStr = linkLagHours !== undefined && linkLagHours !== null 
    ? `${Math.round(linkLagHours * 10) / 10}h` 
    : 'N/A';

  return (
    <>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⏱️</span>
          <h4 style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>Avg Session Duration</h4>
        </div>
        <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', color: 'var(--text)' }}>
          {avgSession}
        </h2>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔗</span>
          <h4 style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>Pairing Coverage</h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text)' }}>
            {coveragePct}%
          </h2>
          <p style={{ margin: '0 0 0.4rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Avg Lag: {linkLagStr}
          </p>
        </div>
      </div>
    </>
  );
};
