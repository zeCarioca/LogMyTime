import React, { useEffect, useRef, useState } from 'react';
import { useSemanticHeatmap } from '../../hooks/useSemanticHeatmap';
import { HeatmapDataPoint } from '../../types';

interface ActivityHeatmapProps {
  dateRange: { start?: string; end?: string };
}

const CELL_SIZE = 12;
const GAP = 4;
const ROWS = 7;

function getOklchHeatColor(duration: number, maxDuration: number): string {
  if (duration === 0 || maxDuration === 0) return 'var(--card-bg)';

  const intensity = Math.min(duration / maxDuration, 1);
  const l = 30 + (45 * intensity);
  const c = 0.05 + (0.25 * intensity);
  const h = 280;

  return `oklch(${l}% ${c} ${h})`;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ dateRange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 200 });

  const { zoomLevel, setZoomLevel, heatmapData, isLoading } = useSemanticHeatmap(dateRange.start, dateRange.end);

  // Interaction State
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{ point: HeatmapDataPoint, x: number, y: number } | null>(null);
  const [visibleDateRange, setVisibleDateRange] = useState<string>('');

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

  // Zoom/Pan Threshold Logic
  useEffect(() => {
    if (scale > 1.5) {
      if (zoomLevel === 'month') {
        setZoomLevel('day');
        setScale(1);
      } else if (zoomLevel === 'day') {
        setZoomLevel('commit');
        setScale(1);
      } else {
        // Cap the scale if we are already at the deepest level
        setScale(1.5);
      }
    } else if (scale < 0.5) {
      if (zoomLevel === 'commit') {
        setZoomLevel('day');
        setScale(1);
      } else if (zoomLevel === 'day') {
        setZoomLevel('month');
        setScale(1);
      } else {
        // Cap the scale if we are already at the highest level
        setScale(0.5);
      }
    }
  }, [scale, zoomLevel, setZoomLevel]);

  // Visible Date Range Calculation
  useEffect(() => {
    if (!heatmapData || heatmapData.data.length === 0 || dimensions.width === 0) {
      setVisibleDateRange('');
      return;
    }

    const pivotX = dimensions.width / 2;

    // Find the left-most visible column
    const leftX_world = ((0 - pivotX) / scale) + pivotX - translateX;
    let leftCol = Math.floor(leftX_world / (CELL_SIZE + GAP));

    // Find the right-most visible column
    const rightX_world = ((dimensions.width - pivotX) / scale) + pivotX - translateX;
    let rightCol = Math.floor(rightX_world / (CELL_SIZE + GAP));

    // Clamp to valid data bounds
    const maxCol = Math.floor((heatmapData.data.length - 1) / ROWS);
    leftCol = Math.max(0, Math.min(leftCol, maxCol));
    rightCol = Math.max(0, Math.min(rightCol, maxCol));

    const leftIndex = leftCol * ROWS;
    const rightIndex = Math.min(heatmapData.data.length - 1, rightCol * ROWS);

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
  }, [heatmapData, scale, translateX, dimensions]);

  // Wheel and Mouse Event Listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zooming
        const zoomDelta = e.deltaY * -0.01;
        setScale((prev) => Math.max(0.2, Math.min(prev + zoomDelta, 3)));
      } else {
        // Panning (Horizontal only for a timeline)
        const panDeltaX = e.shiftKey ? e.deltaY : e.deltaX;
        setTranslateX((prev) => prev - panDeltaX);
      }

      // Hide tooltip when scrolling
      setHoveredPoint(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!heatmapData || isLoading) return;

      const rect = canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const pivotX = rect.width / 2;

      // Reverse scale and pan
      const x_world = ((offsetX - pivotX) / scale) + pivotX - translateX;
      const y_world = offsetY / scale;

      const col = Math.floor(x_world / (CELL_SIZE + GAP));
      const row = Math.floor(y_world / (CELL_SIZE + GAP));

      const cellX = x_world % (CELL_SIZE + GAP);
      const cellY = y_world % (CELL_SIZE + GAP);

      if (cellX <= CELL_SIZE && cellY <= CELL_SIZE && col >= 0 && row >= 0 && row < ROWS) {
        const index = col * ROWS + row;
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
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [heatmapData, isLoading, scale, translateX]);

  // Rendering
  useEffect(() => {
    if (!canvasRef.current || !heatmapData || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;

    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.save();

    // Apply panning and zooming transformations
    // We pivot the scale around the center of the canvas horizontally
    const pivotX = dimensions.width / 2;
    ctx.translate(pivotX, 0);
    ctx.scale(scale, scale);
    ctx.translate(-pivotX, 0);

    ctx.translate(translateX, 0);

    const maxDuration = heatmapData.max_duration_seconds;

    heatmapData.data.forEach((point, index) => {
      const col = Math.floor(index / ROWS);
      const row = index % ROWS;

      const x = col * (CELL_SIZE + GAP);
      const y = row * (CELL_SIZE + GAP);

      ctx.fillStyle = getOklchHeatColor(point.total_duration_seconds, maxDuration);

      // Draw cell with rounded corners if supported or simple rect
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 2);
      } else {
        ctx.rect(x, y, CELL_SIZE, CELL_SIZE);
      }
      ctx.fill();
    });

    ctx.restore();

  }, [heatmapData, isLoading, dimensions, scale, translateX]);

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
            Zoom Level: <strong style={{ color: 'var(--primary)' }}>{zoomLevel.toUpperCase()}</strong> (Scroll to pan, Ctrl+Scroll to zoom)
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="btn btn-outline"
              style={{ padding: '0.1rem 0.5rem', fontSize: '1.2rem', lineHeight: 1 }}
              onClick={() => setScale(prev => Math.max(prev - 0.25, 0.2))}
              title="Zoom Out"
            >−</button>
            <button
              className="btn btn-outline"
              style={{ padding: '0.1rem 0.5rem', fontSize: '1.2rem', lineHeight: 1 }}
              onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}
              title="Zoom In"
            >+</button>
          </div>
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
              minWidth: '200px',
              transition: 'opacity 0.15s ease, transform 0.15s ease',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              {new Date(hoveredPoint.point.timestamp).toLocaleDateString(undefined, {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
              })}
            </div>

            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>
              {Math.floor(hoveredPoint.point.total_duration_seconds / 3600)}h {Math.floor((hoveredPoint.point.total_duration_seconds % 3600) / 60)}m
            </div>

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
};
