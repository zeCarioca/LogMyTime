import React, { useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { CommitCorrelationItem } from '../../types';
import { format, parseISO } from 'date-fns';

interface PairingCorrelationChartProps {
  data: CommitCorrelationItem[];
  isLoading: boolean;
}

export const PairingCorrelationChart: React.FC<PairingCorrelationChartProps> = ({ data, isLoading }) => {
  const [pinnedCommit, setPinnedCommit] = useState<CommitCorrelationItem | null>(null);

  const safeData = Array.isArray(data) ? data : [];
  const sorted = useMemo(() => {
    return [...safeData].sort((a, b) => (b.total_seconds_logged || 0) - (a.total_seconds_logged || 0)).slice(0, 10);
  }, [safeData]);

  const series = useMemo(() => {
    return [{
      name: 'Hours Logged',
      data: sorted.map(d => Number((d.total_seconds_logged / 3600).toFixed(2)))
    }];
  }, [sorted]);

  const categories = useMemo(() => {
    return sorted.map(d => {
      const msg = d.commit_message || 'No message';
      return msg.length > 12 ? msg.slice(0, 12) + '…' : msg;
    });
  }, [sorted]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'inherit',
      events: {
        dataPointSelection: (_event, _chartContext, config) => {
          const idx = config.dataPointIndex;
          if (idx >= 0 && idx < sorted.length) {
            setPinnedCommit(sorted[idx]);
          }
        }
      }
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
      formatter: function (val: any) {
        return val + "h";
      },
      offsetX: 0,
    },
    stroke: { show: true, width: 1, colors: ['transparent'] },
    xaxis: {
      categories: categories,
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
      custom: function({ seriesIndex, dataPointIndex, w }: any) {
        const item = sorted[dataPointIndex];
        if (!item) return '';
        const val = w.globals.series[seriesIndex][dataPointIndex];
        const shaShort = item.commit_sha ? item.commit_sha.substring(0, 7) : 'Unpaired';
        const formattedDate = item.commit_date ? format(parseISO(item.commit_date), 'MMM dd, yyyy HH:mm') : '';

        return `
          <div style="padding: 12px; background: rgba(15, 23, 42, 0.95); border: 1px solid var(--card-border, #334155); border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 320px; font-family: inherit;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px;">
              <span style="font-family: monospace; font-size: 11px; background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
                ${shaShort}
              </span>
              ${item.repo_name ? `<span style="font-size: 11px; color: #94a3b8; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.repo_name}</span>` : ''}
            </div>
            <div style="font-size: 13px; color: #f8fafc; margin-bottom: 8px; line-height: 1.4; word-break: break-word; font-weight: 500;">
              ${item.commit_message || 'No commit message'}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; pt-2; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #94a3b8; margin-top: 6px; padding-top: 6px;">
              <span><strong style="color: #10b981;">●</strong> ${val} hours (${item.entry_count || 1} entries)</span>
              ${formattedDate ? `<span>${formattedDate}</span>` : ''}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 6px; text-align: right;">💡 Click bar to pin details</div>
          </div>
        `;
      }
    }
  };

  return (
    <div className="card" style={{ minHeight: '350px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Top 10 Commits by Time</h3>
        {pinnedCommit && (
          <button
            onClick={() => setPinnedCommit(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Clear Pin
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading commits...</p>
        </div>
      ) : (
        <Chart options={options} series={series} type="bar" height={300} />
      )}

      {pinnedCommit && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: '#10b981', color: '#000', borderRadius: '4px', fontWeight: 'bold' }}>
                PINNED
              </span>
              <code style={{ fontSize: '0.85rem', color: '#10b981' }}>{pinnedCommit.commit_sha}</code>
            </div>
            <button
              onClick={() => setPinnedCommit(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1
              }}
              title="Close panel"
            >
              ✕
            </button>
          </div>

          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {pinnedCommit.commit_message || 'No commit message'}
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <div><strong>Hours Logged:</strong> {(pinnedCommit.total_seconds_logged / 3600).toFixed(2)}h</div>
            <div><strong>Entries:</strong> {pinnedCommit.entry_count}</div>
            {pinnedCommit.repo_name && <div><strong>Repo:</strong> {pinnedCommit.repo_name}</div>}
            {pinnedCommit.commit_date && <div><strong>Date:</strong> {format(parseISO(pinnedCommit.commit_date), 'yyyy-MM-dd HH:mm:ss')}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
