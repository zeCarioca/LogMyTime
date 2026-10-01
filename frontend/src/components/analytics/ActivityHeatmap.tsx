import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useSemanticHeatmap } from '../../hooks/useSemanticHeatmap';
import { HeatmapDataPoint } from '../../types';
import { CellPopover } from './CellPopover';

interface ActivityHeatmapProps {
  dateRange?: { start?: string; end?: string };
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = React.memo(() => {
  const { selectedYear, setSelectedYear, heatmapData, isLoading } = useSemanticHeatmap();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedCell, setSelectedCell] = useState<{ point: HeatmapDataPoint; rect: DOMRect } | null>(null);

  useEffect(() => {
    if (!isLoading && containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [isLoading, heatmapData]);

  const handleCellClick = (point: HeatmapDataPoint, event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedCell({ point, rect });
  };

  const getHeatmapLevel = (duration: number, maxDuration: number): number => {
    if (duration === 0 || maxDuration === 0) return 0;
    const intensity = duration / maxDuration;
    if (intensity <= 0.25) return 1;
    if (intensity <= 0.5) return 2;
    if (intensity <= 0.75) return 3;
    return 4;
  };

  const cells = useMemo(() => {
    if (!heatmapData || heatmapData.data.length === 0) return [];
    
    const data = heatmapData.data;
    const firstDate = new Date(data[0].timestamp);
    // 0: Sunday, 1: Monday, ... 6: Saturday
    const startDayOfWeek = firstDate.getUTCDay();
    
    // Add dummy cells for padding to align the first day to the correct row
    const paddedCells: (HeatmapDataPoint | null)[] = Array(startDayOfWeek).fill(null);
    paddedCells.push(...data);
    
    return paddedCells;
  }, [heatmapData]);

  // Compute month labels based on the first cell of a new month
  const monthLabels = useMemo(() => {
    if (!heatmapData || heatmapData.data.length === 0) return [];
    const labels: { name: string; colIndex: number }[] = [];
    let currentMonth = -1;
    
    cells.forEach((cell, index) => {
      if (cell) {
        const d = new Date(cell.timestamp);
        const m = d.getUTCMonth();
        if (m !== currentMonth) {
          const colIndex = Math.floor(index / 7);
          if (labels.length === 0 || colIndex - labels[labels.length - 1].colIndex >= 3) {
            labels.push({ name: d.toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short' }), colIndex });
          }
          currentMonth = m;
        }
      }
    });
    return labels;
  }, [cells, heatmapData]);

  const maxDuration = heatmapData?.max_duration_seconds || 0;

  return (
    <div className="card" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
      <div className="heatmap-header" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Activity Heatmap</h3>
        <select 
          className="heatmap-year-selector"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {[2026, 2025, 2024, 2023].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="github-heatmap-container" ref={containerRef}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading heatmap...
          </div>
        ) : (
          <div className="github-heatmap">
            {/* Y Axis (Row 0 is Sunday) */}
            <div className="heatmap-y-axis">
              <span></span>
              <span>Mon</span>
              <span></span>
              <span>Wed</span>
              <span></span>
              <span>Fri</span>
              <span></span>
            </div>

            {/* Grid Area */}
            <div className="heatmap-grid-wrapper">
              <div className="heatmap-x-axis">
                {monthLabels.map((lbl, i) => {
                  const totalColumns = Math.max(1, Math.ceil(cells.length / 7));
                  const leftPercentage = (lbl.colIndex / totalColumns) * 100;
                  return (
                    <span 
                      key={i} 
                      className="heatmap-month-label"
                      style={{ left: `${leftPercentage}%` }} 
                    >
                      {lbl.name}
                    </span>
                  );
                })}
              </div>

              <div className="heatmap-cells">
                {cells.map((cell, i) => {
                  if (!cell) {
                    return <div key={`empty-${i}`} className="heatmap-cell" style={{ visibility: 'hidden' }}></div>;
                  }
                  
                  const level = getHeatmapLevel(cell.total_duration_seconds, maxDuration);
                  const dateStr = new Date(cell.timestamp).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
                  const hrs = Math.floor(cell.total_duration_seconds / 3600);
                  const mins = Math.floor((cell.total_duration_seconds % 3600) / 60);
                  
                  let title = `${hrs}h ${mins}m on ${dateStr}`;
                  if (cell.commit_count > 0) {
                     title += `\n${cell.commit_count} commits`;
                  }
                  if (cell.projects && cell.projects.length > 0) {
                     title += `\nProjects: ${cell.projects.join(', ')}`;
                  }

                  return (
                    <div 
                      key={cell.timestamp}
                      className={`heatmap-cell color-scale-${level} ${selectedCell?.point.timestamp === cell.timestamp ? 'selected-cell' : ''}`}
                      title={title}
                      onClick={(e) => handleCellClick(cell, e)}
                    ></div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {selectedCell && (
        <CellPopover 
          point={selectedCell.point} 
          anchorRect={selectedCell.rect} 
          onClose={() => setSelectedCell(null)} 
        />
      )}
    </div>
  );
});
