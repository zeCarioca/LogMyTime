import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { DailyBreakdownItem } from '../../types';
import { format, parseISO } from 'date-fns';

interface TimeTrendsChartProps {
  data: DailyBreakdownItem[];
  isLoading: boolean;
}

export const TimeTrendsChart: React.FC<TimeTrendsChartProps> = ({ data, isLoading }) => {
  const series = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    // Sort chronologically
    const sorted = [...safeData].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    
    return [{
      name: 'Hours Logged',
      data: sorted.map(d => ({
        x: format(parseISO(d.date), 'MMM dd'),
        y: Number((d.total_seconds / 3600).toFixed(2))
      }))
    }];
  }, [data]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'inherit',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
      }
    },
    theme: { mode: 'dark' },
    colors: ['#3b82f6'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.0,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: {
      type: 'category',
      labels: { style: { colors: 'var(--text-muted)' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: 'var(--text-muted)' } }
    },
    grid: { 
      borderColor: 'rgba(255,255,255,0.05)',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `${val} hours` }
    }
  };

  return (
    <div className="card" style={{ minHeight: '350px' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Time Trends</h3>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading trends...</p>
        </div>
      ) : (
        <Chart options={options} series={series} type="area" height={300} />
      )}
    </div>
  );
};
