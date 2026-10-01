import React, { useMemo } from 'react';
import { useSemanticHeatmap } from '../../hooks/useSemanticHeatmap';
import { HeatmapDataPoint } from '../../types';

interface ActivityHeatmapProps {
  dateRange?: { start?: string; end?: string };
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = React.memo(() => {
  const { selectedYear, setSelectedYear, heatmapData, isLoading } = useSemanticHeatmap();

  const handleCellClick = (point: HeatmapDataPoint) => {
    // Placeholder for future click-to-feed functionality
    console.log("Clicked cell:", point);
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
    // We want Monday to be row 0, so subtract 1 and wrap around
    let startDayOfWeek = firstDate.getUTCDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6; 
    
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
          // Only add label if it's sufficiently far from the previous label to avoid overlap
          if (labels.length === 0 || colIndex - labels[labels.length - 1].colIndex >= 3) {
            labels.push({ name: d.toLocaleDateString(undefined, { month: 'short' }), colIndex });
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

      <div className="github-heatmap-container">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading heatmap...
          </div>
        ) : (
          <div className="github-heatmap">
            {/* Y Axis */}
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
                {monthLabels.map((lbl, i) => (
                  <span 
                    key={i} 
                    className="heatmap-month-label"
                    style={{ left: `${lbl.colIndex * 17}px` }} 
                  >
                    {lbl.name}
                  </span>
                ))}
              </div>

              <div className="heatmap-cells">
                {cells.map((cell, i) => {
                  if (!cell) {
                    return <div key={`empty-${i}`} className="heatmap-cell" style={{ visibility: 'hidden' }}></div>;
                  }
                  
                  const level = getHeatmapLevel(cell.total_duration_seconds, maxDuration);
                  const dateStr = new Date(cell.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
                      className={`heatmap-cell color-scale-${level}`}
                      title={title}
                      onClick={() => handleCellClick(cell)}
                    ></div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
