import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { HeatmapCell } from '../../types';

interface ActivityHeatmapProps {
  data: HeatmapCell[];
  isLoading: boolean;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, isLoading }) => {
  const series = useMemo(() => {
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const safeData = Array.isArray(data) ? data : [];
    const formattedSeries = weekdays.map((day, dayIndex) => {
      // Find all cells for this weekday
      const dayData = safeData.filter(cell => cell.weekday === dayIndex);
      
      // Map to 24 hours
      const hourData = Array.from({ length: 24 }).map((_, hourIndex) => {
        const cell = dayData.find(c => c.hour === hourIndex);
        const minutes = cell ? Math.round(cell.total_seconds / 60) : 0;
        
        // Format hour to 00, 01, etc.
        const hourLabel = hourIndex.toString().padStart(2, '0') + ':00';
        return {
          x: hourLabel,
          y: minutes
        };
      });

      return {
        name: day,
        data: hourData
      };
    });
    
    return formattedSeries;
  }, [data]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'heatmap',
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'inherit',
    },
    theme: { mode: 'dark' },
    colors: ['#8b5cf6'], // primary color
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 4,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: 'rgba(255, 255, 255, 0.05)', name: '0m' },
            { from: 1, to: 30, color: '#c4b5fd', name: '< 30m' },
            { from: 31, to: 60, color: '#a78bfa', name: '30m - 1h' },
            { from: 61, to: 120, color: '#8b5cf6', name: '1h - 2h' },
            { from: 121, to: 9999, color: '#6d28d9', name: '> 2h' }
          ]
        }
      }
    },
    dataLabels: { enabled: false },
    stroke: { width: 1, colors: ['var(--card-bg)'] },
    xaxis: {
      type: 'category',
      labels: { style: { colors: 'var(--text-muted)' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: 'var(--text-muted)' } }
    },
    grid: { show: false },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `${val} minutes` }
    }
  };

  return (
    <div className="card" style={{ minHeight: '300px' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Activity Heatmap (Mins / Hour)</h3>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading heatmap...</p>
        </div>
      ) : (
        <Chart options={options} series={series} type="heatmap" height={280} />
      )}
    </div>
  );
};
