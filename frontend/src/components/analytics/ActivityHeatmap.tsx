import React, { useEffect, useRef, useState } from 'react';
import { useSemanticHeatmap, ZoomLevel } from '../../hooks/useSemanticHeatmap';
import { HeatmapDataPoint } from '../../types';

interface ActivityHeatmapProps {
  dateRange: { start?: string; end?: string };
}

const CELL_SIZE = 12;
const GAP = 4;

function getOklchHeatColor(duration: number, maxDuration: number): string {
  if (duration === 0 || maxDuration === 0) return 'var(--card-bg)';

  const intensity = Math.min(duration / maxDuration, 1);
  const l = 30 + (45 * intensity);
  const c = 0.05 + (0.25 * intensity);
  const h = 280;

  return `oklch(${l}% ${c} ${h})`;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = React.memo(({ dateRange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 200 });

  const { zoomLevel, setZoomLevel, heatmapData, isLoading } = useSemanticHeatmap(dateRange.start, dateRange.end);

  const rows = (() => {
    switch (zoomLevel) {
      case 'year': return 12; // months
      case 'month': return 5; // weeks
      case 'week': return 7;  // days
      case 'day': return 24;  // hours
      default: return 7;
    }
  })();

  // Interaction State
  const [translateX, setTranslateX] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{ point: HeatmapDataPoint, x: number, y: number } | null>(null);
  const [visibleDateRange, setVisibleDateRange] = useState<string>('');

  // ZoomAnchor removed as part of zoom refactor

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Visible Date Range Calculation
  useEffect(() => {
    if (!heatmapData || heatmapData.data.length === 0 || dimensions.width === 0) {
      setVisibleDateRange('');
      return;
    }

    // Find the left-most visible column
    const leftX_world = 0 - translateX;
    let leftCol = Math.floor(leftX_world / (CELL_SIZE + GAP));

    // Find the right-most visible column
    const rightX_world = dimensions.width - translateX;
    let rightCol = Math.floor(rightX_world / (CELL_SIZE + GAP));

    // Clamp to valid data bounds
    const maxCol = Math.floor((heatmapData.data.length - 1) / rows);
    leftCol = Math.max(0, Math.min(leftCol, maxCol));
    rightCol = Math.max(0, Math.min(rightCol, maxCol));

    const leftIndex = leftCol * rows;
    const rightIndex = Math.min(heatmapData.data.length - 1, rightCol * rows);

    const leftDate = new Date(heatmapData.data[leftIndex].timestamp);
    const rightDate = new Date(heatmapData.data[rightIndex].timestamp);

    const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
    const leftStr = leftDate.toLocaleDateString(undefined, options);
    const rightStr = rightDate.toLocaleDateString(undefined, options);

    if (leftStr === rightStr) {
      setVisibleDateRange(leftStr);
    } else {
      setVisibleDateRange(`${leftStr} - ${rightStr}`);
    }
  }, [heatmapData, translateX, dimensions, rows]);

  const hasInitialPanned = useRef<boolean>(false);

  // Reset pan state when zoom level changes so dropdown changes re-align
  useEffect(() => {
    hasInitialPanned.current = false;
  }, [zoomLevel]);

  // Auto-pan to right after data loads
  useEffect(() => {
    if (!isLoading && heatmapData && dimensions.width > 0) {
      if (!hasInitialPanned.current) {
        // Initial load or dropdown change: pan to right edge to show most recent data
        const totalCols = Math.ceil(heatmapData.data.length / rows);
        const totalContentWidth = totalCols * (CELL_SIZE + GAP);
        if (totalContentWidth > dimensions.width) {
          setTranslateX(dimensions.width - totalContentWidth - CELL_SIZE);
        } else {
          setTranslateX(0);
        }
        hasInitialPanned.current = true;
      }
    }
  }, [isLoading, heatmapData, rows, dimensions.width]);

  // Wheel and Mouse Event Listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number | null = null;

    const handleWheel = (e: WheelEvent) => {
      const isHorizontalPan = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

      if (!isHorizontalPan) {
        // Regular vertical scroll - let the browser scroll the page!
        return;
      }

      e.preventDefault();

      if (rafId) return; // Basic throttle
      
      rafId = requestAnimationFrame(() => {
        // Only Panning
        const panDeltaX = e.shiftKey ? e.deltaY : e.deltaX;
        setTranslateX((prev) => prev - panDeltaX);
        
        setHoveredPoint(null);
        rafId = null;
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!heatmapData || isLoading) return;

      const rect = canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const x_world = offsetX - translateX;
      const y_world = offsetY;

      const col = Math.floor(x_world / (CELL_SIZE + GAP));
      const row = Math.floor(y_world / (CELL_SIZE + GAP));

      const cellX = x_world % (CELL_SIZE + GAP);
      const cellY = y_world % (CELL_SIZE + GAP);

      if (cellX <= CELL_SIZE && cellY <= CELL_SIZE && col >= 0 && row >= 0 && row < rows) {
        const index = col * rows + row;
        if (index >= 0 && index < heatmapData.data.length) {
          setHoveredPoint({
            point: heatmapData.data[index],
            x: offsetX,
            y: offsetY
          });
          return;
        }
      }

      setHoveredPoint(null);
    };

    const handleMouseLeave = () => {
      setHoveredPoint(null);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [heatmapData, isLoading, translateX, dimensions.width, rows]);

  // Rendering
  useEffect(() => {
    if (!canvasRef.current || !heatmapData || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.save();

    ctx.translate(translateX, 0);

    const maxDuration = heatmapData.max_duration_seconds;

    // Frustum Culling logic
    const leftVisibleX_world = 0 - translateX;
    const rightVisibleX_world = dimensions.width - translateX;

    const startCol = Math.max(0, Math.floor(leftVisibleX_world / (CELL_SIZE + GAP)));
    const endCol = Math.floor(rightVisibleX_world / (CELL_SIZE + GAP)) + 1;

    const startIndex = startCol * rows;
    const endIndex = Math.min(heatmapData.data.length, endCol * rows);

    for (let index = startIndex; index < endIndex; index++) {
      const point = heatmapData.data[index];
      const col = Math.floor(index / rows);
      const row = index % rows;

      const x = col * (CELL_SIZE + GAP);
      const y = row * (CELL_SIZE + GAP);

      ctx.fillStyle = getOklchHeatColor(point.total_duration_seconds, maxDuration);

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 2);
      } else {
        ctx.rect(x, y, CELL_SIZE, CELL_SIZE);
      }
      ctx.fill();
    }

    ctx.restore();
  }, [heatmapData, isLoading, dimensions, translateX, rows]);

  const getTooltipDateString = (timestamp: string) => {
    const d = new Date(timestamp);
    if (zoomLevel === 'year') {
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } else if (zoomLevel === 'month') {
      return `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (zoomLevel === 'week') {
      return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  };

  return (
    <div className="card" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 0 1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>Activity Heatmap</h3>
          {visibleDateRange && (
            <span style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
              {visibleDateRange}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Zoom Level:
          </span>
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(e.target.value as ZoomLevel)}
            style={{
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
              border: '1px solid var(--card-border)',
              borderRadius: '4px',
              padding: '0.4rem',
              fontSize: '0.9rem'
            }}
          >
            <option value="year">Year (Months)</option>
            <option value="month">Month (Weeks)</option>
            <option value="week">Week (Days)</option>
            <option value="day">Day (Hours)</option>
          </select>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', width: '100%', minHeight: '200px' }}
      >
        {isLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading {zoomLevel} heatmap...</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            opacity: isLoading ? 0.3 : 1,
            cursor: 'grab',
            transition: 'opacity 0.3s ease'
          }}
        />

        {/* Tooltip implementation */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              left: hoveredPoint.x + 15,
              top: hoveredPoint.y + 15,
              zIndex: 1000,
              pointerEvents: 'none',
              padding: '1rem',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              fontSize: '0.9rem',
              color: 'var(--text)',
              minWidth: '250px',
              transition: 'opacity 0.15s ease, transform 0.15s ease',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              {getTooltipDateString(hoveredPoint.point.timestamp)}
            </div>

            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>
              {Math.floor(hoveredPoint.point.total_duration_seconds / 3600)}h {Math.floor((hoveredPoint.point.total_duration_seconds % 3600) / 60)}m
            </div>

            {hoveredPoint.point.projects && hoveredPoint.point.projects.length > 0 && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--card-border)' }}>
                <strong>Projects:</strong> {hoveredPoint.point.projects.join(', ')}
              </div>
            )}

            {hoveredPoint.point.commit_count > 0 && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--card-border)' }}>
                <strong>{hoveredPoint.point.commit_count}</strong> Commit{hoveredPoint.point.commit_count > 1 ? 's' : ''}
              </div>
            )}

            {hoveredPoint.point.commits && hoveredPoint.point.commits.length > 0 && (
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: 0, color: 'var(--text-muted)' }}>
                {hoveredPoint.point.commits.slice(0, 3).map((c: any) => (
                  <li key={c.sha} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                    {c.message}
                  </li>
                ))}
                {hoveredPoint.point.commits.length > 3 && (
                  <li style={{ fontStyle: 'italic' }}>...and {hoveredPoint.point.commits.length - 3} more</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
