import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { dataApi } from '../../api/data';

interface AnalyticsData {
  overall: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  by_repo: {
    repo_id: number;
    repo_name: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    duration_seconds: number;
    tokens_per_minute: number;
  }[];
  time_series: {
    date: string;
    tokens: number;
    duration_seconds: number;
  }[];
}

export const TokenAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchTokens = async () => {
      try {
        const res = await dataApi.getTokenAnalytics();
        if (mounted && res.status === 'success') {
          setData(res);
        }
      } catch (err) {
        console.error("Failed to fetch token analytics:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTokens();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="loading-state">Loading AI Analytics...</div>;
  if (!data) return <div className="empty-state">No token data found. Make sure Phase 1/2 sync ran.</div>;

  // KPIs
  const totalTokens = data.overall.total_tokens.toLocaleString();
  const estimatedCost = ((data.overall.prompt_tokens / 1000000) * 1.25 + (data.overall.completion_tokens / 1000000) * 3.75).toFixed(2);

  // Line Chart Data
  const seriesData = [
    {
      name: 'AI Tokens',
      type: 'line',
      data: data.time_series.map(ts => ts.tokens)
    },
    {
      name: 'Hours Logged',
      type: 'column',
      data: data.time_series.map(ts => Number((ts.duration_seconds / 3600).toFixed(2)))
    }
  ];

  const lineChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, background: 'transparent' },
    stroke: { width: [3, 0], curve: 'smooth' },
    colors: ['#8b5cf6', '#3b82f6'],
    labels: data.time_series.map(ts => ts.date),
    xaxis: { type: 'datetime' },
    yaxis: [
      { title: { text: 'Tokens' } },
      { opposite: true, title: { text: 'Hours' } }
    ],
    theme: { mode: 'dark' }
  };

  // Heatmap Data (Basic implementation grouping by repo for a heatmap effect)
  const heatmapSeries = data.by_repo.map(repo => ({
    name: repo.repo_name,
    data: [
      { x: 'Prompt', y: repo.prompt_tokens },
      { x: 'Completion', y: repo.completion_tokens },
      { x: 'Intensity (Tokens/Min)', y: repo.tokens_per_minute }
    ]
  }));

  const heatmapOptions: ApexCharts.ApexOptions = {
    chart: { type: 'heatmap', toolbar: { show: false }, background: 'transparent' },
    plotOptions: { heatmap: { shadeIntensity: 0.5, colorScale: { ranges: [{ from: 0, to: 100000, color: '#8b5cf6' }] } } },
    dataLabels: { enabled: false },
    theme: { mode: 'dark' },
    xaxis: { type: 'category' }
  };

  return (
    <div className="token-analytics-container" style={{ marginTop: '2rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>AI Assistance Analytics</h2>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 className="subtitle">Total Tokens Used</h4>
          <h2 style={{ color: 'var(--primary)', marginTop: '0.5rem' }}>{totalTokens}</h2>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 className="subtitle">Estimated Cost</h4>
          <h2 style={{ color: '#10b981', marginTop: '0.5rem' }}>${estimatedCost}</h2>
          <small>Gemini 1.5 Pro Rates</small>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>Burn Rate (Tokens vs Hours Logged)</h3>
        <div style={{ minHeight: '300px' }}>
          {data.time_series.length > 0 ? (
             <Chart options={lineChartOptions} series={seriesData} type="line" height={350} />
          ) : (
            <p>No time series data available.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Repository Intensity Heatmap</h3>
        <p className="subtitle" style={{ marginBottom: '1rem' }}>Token distribution and intensity across repositories</p>
        <div style={{ minHeight: '300px' }}>
          {data.by_repo.length > 0 ? (
             <Chart options={heatmapOptions} series={heatmapSeries} type="heatmap" height={350} />
          ) : (
            <p>No repository data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};
