import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { CommitCorrelationItem } from '../../types';

interface PairingCorrelationChartProps {
  data: CommitCorrelationItem[];
  isLoading: boolean;
}

export const PairingCorrelationChart: React.FC<PairingCorrelationChartProps> = ({ data, isLoading }) => {
  const series = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    // Sort by most time logged and take top 10
    const sorted = [...safeData].sort((a, b) => (b.total_seconds_logged || 0) - (a.total_seconds_logged || 0)).slice(0, 10);
    
    return [{
      name: 'Hours Logged',
      data: sorted.map(d => ({
        x: d.commit_sha ? d.commit_sha.substring(0, 7) : 'Unpaired',
        y: Number((d.total_seconds_logged / 3600).toFixed(2)),
        // We'll store message in goals/extra for the tooltip
        goals: [{
          name: d.commit_message || 'No commit message',
          value: 0, // Dmmy value
          strokeWidth: 0
        }]
      }))
    }];
  }, [data]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'inherit',
    },
    theme: { mode: 'dark' },
    colors: ['#10b981'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        dataLabels: { position: 'top' },
      }
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      style: { colors: ['#fff'], fontSize: '12px' },
      formatter: function (_val: any, opt?: any) {
        if (!opt) return "";
        return opt.w.globals.series[opt.seriesIndex][opt.dataPointIndex] + "h";
      },
      offsetX: 0,
    },
    stroke: { show: true, width: 1, colors: ['transparent'] },
    xaxis: {
      labels: { style: { colors: 'var(--text-muted)' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: 'var(--text-muted)' } }
    },
    grid: { 
      borderColor: 'rgba(255,255,255,0.05)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `${val} hours` },
      custom: function({ seriesIndex, dataPointIndex, w }: any) {
        const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
        return `
          <div style="padding: 10px; background: var(--card-bg); border: 1px solid var(--card-border);">
            <div style="font-weight: bold; margin-bottom: 5px;">${data.x}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 5px; max-width: 200px; white-space: normal;">
              ${data.goals[0].name}
            </div>
            <div><span style="color: #10b981;">●</span> ${data.y} hours</div>
          </div>
        `;
      }
    }
  };

  return (
    <div className="card" style={{ minHeight: '350px' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Top 10 Commits by Time</h3>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading commits...</p>
        </div>
      ) : (
        <Chart options={options} series={series} type="bar" height={300} />
      )}
    </div>
  );
};
