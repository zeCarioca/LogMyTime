import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HeatmapDataPoint } from '../../types';

interface CellPopoverProps {
  point: HeatmapDataPoint;
  onClose: () => void;
  anchorRect: DOMRect;
}

export const CellPopover: React.FC<CellPopoverProps> = ({ point, onClose, anchorRect }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Small timeout to prevent immediate close if the click was on the cell itself
      setTimeout(() => {
        if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
          onClose();
        }
      }, 0);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const dateStr = new Date(point.timestamp).toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const hrs = Math.floor(point.total_duration_seconds / 3600);
  const mins = Math.floor((point.total_duration_seconds % 3600) / 60);
  const timeLoggedStr = point.total_duration_seconds > 0 ? `${hrs}h ${mins}m logged` : 'No time logged';

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 8,
        left: Math.min(anchorRect.left + anchorRect.width / 2 - 125, window.innerWidth - 260),
        width: '250px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '8px',
        padding: '1rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>{dateStr}</h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{timeLoggedStr}</span>
        </div>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
        >
          ✕
        </button>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '0' }} />

      {point.total_duration_seconds === 0 && point.commit_count === 0 ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
          No activity recorded for this day.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
          {point.projects && point.projects.length > 0 && (
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projects</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {point.projects.map(p => (
                  <span key={p} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{p}</span>
                ))}
              </div>
            </div>
          )}

          {point.commits && point.commits.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Commits ({point.commit_count})</span>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                {point.commits.map((c, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{c.sha.slice(0,7)}</span> {c.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};
