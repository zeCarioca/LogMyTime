import React from 'react';
import { Insight } from '../../types';

interface InsightsTickerProps {
  insights: Insight[] | null;
  isLoading: boolean;
}

export const InsightsTicker: React.FC<InsightsTickerProps> = ({ insights, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Generating insights...</p>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return null;
  }

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'info': return '💡';
      case 'danger': return '🚨';
      default: return 'ℹ️';
    }
  };

  const getColor = (severity: string) => {
    switch (severity) {
      case 'success': return '#4ade80';
      case 'warning': return '#fbbf24';
      case 'danger': return '#f87171';
      default: return 'var(--primary)';
    }
  };

  return (
    <div className="card insights-ticker-container" style={{ 
      padding: '0.75rem', 
      overflow: 'hidden', 
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      borderLeft: '4px solid var(--primary)'
    }}>
      <div style={{ fontWeight: 'bold', marginRight: '1rem', color: 'var(--primary)', flexShrink: 0 }}>
        AI Insights:
      </div>
      <div className="ticker-wrapper" style={{ flexGrow: 1, overflow: 'hidden' }}>
        <div className="ticker-content" style={{
          display: 'inline-flex',
          gap: '3rem',
          animation: 'ticker 30s linear infinite'
        }}>
          {insights.map((insight, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{getIcon(insight.severity)}</span>
              <span style={{ color: getColor(insight.severity), fontWeight: 500 }}>
                {insight.text}
              </span>
            </div>
          ))}
          {/* Duplicate for seamless infinite scrolling */}
          {insights.map((insight, idx) => (
            <div key={`dup-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{getIcon(insight.severity)}</span>
              <span style={{ color: getColor(insight.severity), fontWeight: 500 }}>
                {insight.text}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* We need some keyframes for the ticker animation to work */}
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .insights-ticker-container:hover .ticker-content {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
