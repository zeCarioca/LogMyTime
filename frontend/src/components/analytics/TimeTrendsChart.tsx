import React, { useMemo, useEffect, useRef, useState } from 'react';
import Chart from 'react-apexcharts';
import ApexCharts from 'apexcharts';
import { DailyBreakdownItem } from '../../types';
import { parseISO } from 'date-fns';

interface TimeTrendsChartProps {
  data: DailyBreakdownItem[];
  isLoading: boolean;
}

export const TimeTrendsChart: React.FC<TimeTrendsChartProps> = React.memo(({ data, isLoading }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [useSineWave, setUseSineWave] = useState(false);
  const CHART_ID = 'time-trends-chart';

  const series = useMemo(() => {
    if (useSineWave) {
      // Generate synthetic sine wave over 30 days (60 data points)
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const points = 60;
      const sineData = [];

      for (let i = 0; i < points; i++) {
        const time = now - thirtyDaysMs + (i * (thirtyDaysMs / points));
        // Sine wave between 1h and 9h
        const val = Number((5 + 4 * Math.sin((i / points) * 4 * Math.PI)).toFixed(2));
        sineData.push({ x: time, y: val });
      }

      return [{
        name: 'Sine Wave (Test)',
        data: sineData
      }];
    }

    const safeData = Array.isArray(data) ? data : [];
    // Sort chronologically
    const sorted = [...safeData].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    
    // Decimation logic for large datasets
    let chartData: { x: number; y: number }[] = [];
    
    if (sorted.length > 180) {
      // Aggregate into ~90 buckets
      const bucketSize = Math.ceil(sorted.length / 90);
      for (let i = 0; i < sorted.length; i += bucketSize) {
        const chunk = sorted.slice(i, i + bucketSize);
        const sumSec = chunk.reduce((acc, curr) => acc + curr.total_seconds, 0);
        // Use the middle date of the chunk
        const midIndex = Math.floor(chunk.length / 2);
        const middleDateStr = chunk[midIndex].date;
        
        chartData.push({
          x: parseISO(middleDateStr).getTime(),
          y: Number((sumSec / 3600).toFixed(2))
        });
      }
    } else {
      chartData = sorted.map(d => ({
        x: parseISO(d.date).getTime(),
        y: Number((d.total_seconds / 3600).toFixed(2))
      }));
    }

    return [{
      name: 'Hours Logged',
      data: chartData
    }];
  }, [data, useSineWave]);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || isLoading) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Stop page scroll
      
      const chartInstance = ApexCharts.getChartByID(CHART_ID);
      if (!chartInstance) return;

      const w = (chartInstance as any).w;
      if (!w || !w.globals) return;
      
      const currentMin = w.globals.minX;
      const currentMax = w.globals.maxX;
      const range = currentMax - currentMin;
      
      // Calculate zoom factor (15% per scroll tick)
      const zoomFactor = 0.15;
      const zoomAmount = range * zoomFactor;
      
      let newMin, newMax;
      
      if (e.deltaY > 0) {
        // Scroll down -> Zoom Out
        newMin = currentMin - zoomAmount;
        newMax = currentMax + zoomAmount;
      } else {
        // Scroll up -> Zoom In
        newMin = currentMin + zoomAmount;
        newMax = currentMax - zoomAmount;
      }
      
      const initialMin = w.globals.initialMinX;
      const initialMax = w.globals.initialMaxX;
      
      if (newMin < initialMin) newMin = initialMin;
      if (newMax > initialMax) newMax = initialMax;
      if (newMax <= newMin + 3600000) return; // Prevent inverse or infinite zooming (1 hour min)

      ApexCharts.exec(CHART_ID, 'zoomX', newMin, newMax);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isLoading, data, useSineWave]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      id: CHART_ID,
      type: 'area',
      toolbar: { 
        show: true,
        tools: {
          download: false,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      },
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
      type: 'datetime',
      labels: { 
        style: { colors: 'var(--text-muted)' },
        datetimeUTC: false,
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM \'yy',
          day: 'MMM dd',
          hour: 'HH:mm'
        }
      },
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
      x: { format: 'MMM dd, yyyy' },
      y: { formatter: (val) => `${val} hours` }
    }
  };

  return (
    <div className="card" style={{ minHeight: '350px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Time Trends</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={useSineWave}
            onChange={(e) => setUseSineWave(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Sine Wave Test Mode
        </label>
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading trends...</p>
        </div>
      ) : (
        <div ref={chartContainerRef}>
          <Chart options={options} series={series} type="area" height={300} />
        </div>
      )}
    </div>
  );
});
