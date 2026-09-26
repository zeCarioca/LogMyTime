/**
 * Renderers for Data Visualizations (Bar Chart & 52-Week Heatmap)
 */
(function () {
  'use strict';

  function formatDuration(totalSeconds) {
    const secs = totalSeconds || 0;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function renderBarPlot(entries, container, metaSummary, legendEl, setupTooltips) {
    const dailyMap = {};
    let totalSecs = 0;

    entries.forEach(e => {
      const day = e.date || 'Unknown';
      if (!dailyMap[day]) {
        dailyMap[day] = { seconds: 0, entries: 0, tasks: [] };
      }
      dailyMap[day].seconds += e.duration_seconds || 0;
      dailyMap[day].entries += 1;
      dailyMap[day].tasks.push(e.task_description || 'Time log');
      totalSecs += e.duration_seconds || 0;
    });

    const days = Object.keys(dailyMap).sort();
    if (!days.length) return;

    const maxSecs = Math.max(...days.map(d => dailyMap[d].seconds), 60);
    metaSummary.textContent = `${days.length} active day(s) · Total: ${formatDuration(totalSecs)}`;
    legendEl.innerHTML = `<div class="legend-item"><span class="legend-bullet bar-fill-bullet"></span> Tracked Duration</div>`;

    const chartHeight = 220;
    const barWidth = Math.max(18, Math.min(50, Math.floor(680 / (days.length || 1))));
    const gap = 14;
    const chartWidth = Math.max(700, days.length * (barWidth + gap) + 80);

    let barsSvg = '';
    days.forEach((day, idx) => {
      const data = dailyMap[day];
      const barH = Math.max(4, Math.round((data.seconds / maxSecs) * (chartHeight - 60)));
      const x = 50 + idx * (barWidth + gap);
      const y = chartHeight - 35 - barH;

      barsSvg += `
        <g class="bar-group" data-day="${day}" data-secs="${data.seconds}" data-tasks="${encodeURIComponent(data.tasks.slice(0, 3).join(', '))}">
          <rect class="plot-bar" x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" />
          <text class="bar-label-val" x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle">${formatDuration(data.seconds)}</text>
          <text class="bar-label-date" x="${x + barWidth / 2}" y="${chartHeight - 16}" text-anchor="middle">${day.slice(5)}</text>
        </g>
      `;
    });

    container.innerHTML = `
      <div class="svg-scroll-container">
        <svg class="plot-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" style="min-width: ${chartWidth}px; height: ${chartHeight}px;">
          <line x1="40" y1="${chartHeight - 35}" x2="${chartWidth - 20}" y2="${chartHeight - 35}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="2,2"/>
          ${barsSvg}
        </svg>
      </div>
    `;
    setupTooltips(container, 'bar', formatDuration);
  }

  function renderHeatmapPlot(entries, container, metaSummary, legendEl, setupTooltips) {
    const dailyMap = {};
    let totalSecs = 0;

    entries.forEach(e => {
      if (e.date) {
        dailyMap[e.date] = (dailyMap[e.date] || 0) + (e.duration_seconds || 0);
        totalSecs += (e.duration_seconds || 0);
      }
    });

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 363);

    metaSummary.textContent = `52-Week Activity Overview · Total: ${formatDuration(totalSecs)}`;
    legendEl.innerHTML = `
      <div class="legend-scale">
        <span class="scale-label">Less</span>
        <span class="heat-box lvl-0"></span><span class="heat-box lvl-1"></span>
        <span class="heat-box lvl-2"></span><span class="heat-box lvl-3"></span>
        <span class="heat-box lvl-4"></span>
        <span class="scale-label">More</span>
      </div>
    `;

    const cellSize = 12;
    const colWidth = 15;
    const svgWidth = 53 * colWidth + 40;
    const svgHeight = 7 * colWidth + 30;

    let rectsSvg = '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cur = new Date(startDate);

    for (let w = 0; w < 53; w++) {
      for (let d = 0; d < 7; d++) {
        if (cur > now) break;
        const dateStr = cur.toISOString().split('T')[0];
        const secs = dailyMap[dateStr] || 0;
        let lvl = 0;
        if (secs > 7200) lvl = 4;
        else if (secs > 3600) lvl = 3;
        else if (secs > 1800) lvl = 2;
        else if (secs > 0) lvl = 1;

        rectsSvg += `
          <rect class="heatmap-cell lvl-${lvl}" x="${30 + w * colWidth}" y="${18 + d * colWidth}" width="${cellSize}" height="${cellSize}" rx="2"
                data-date="${dateStr}" data-dayname="${dayNames[d]}" data-secs="${secs}" />
        `;
        cur.setDate(cur.getDate() + 1);
      }
    }

    container.innerHTML = `
      <div class="svg-scroll-container">
        <svg class="plot-svg heatmap-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" style="min-width: ${svgWidth}px; height: ${svgHeight}px;">
          <text class="heatmap-day-label" x="8" y="32">Mon</text>
          <text class="heatmap-day-label" x="8" y="62">Wed</text>
          <text class="heatmap-day-label" x="8" y="92">Fri</text>
          ${rectsSvg}
        </svg>
      </div>
    `;
    setupTooltips(container, 'heatmap', formatDuration);
  }

  window.LogMyTimePlotRenderers = {
    renderBarPlot,
    renderHeatmapPlot,
    formatDuration
  };
})();
