/**
 * Activity Visualizations & Plots Controller for Data Tab
 * Coordinates display type selector, tooltips, and rendering
 */
(function () {
  'use strict';

  let currentHierarchyData = null;
  let activeDisplayType = 'bar';

  function extractAllTimeEntries(hierarchy) {
    const entries = [];
    if (!hierarchy || !Array.isArray(hierarchy)) return entries;
    hierarchy.forEach(repo => {
      const userNode = repo.user_list && repo.user_list[0] ? repo.user_list[0] : null;
      if (userNode && userNode.time_records) {
        userNode.time_records.forEach(rec => {
          entries.push({
            ...rec,
            repo: repo.repository
          });
        });
      }
    });
    return entries;
  }

  function renderActivePlot(hierarchy) {
    if (hierarchy !== undefined) {
      currentHierarchyData = hierarchy;
    }
    const entries = extractAllTimeEntries(currentHierarchyData);
    const emptyState = document.getElementById('plots-empty-state');
    const viewport = document.getElementById('plot-viewport');
    const renderArea = document.getElementById('plot-render-area');
    const metaSummary = document.getElementById('plot-meta-summary');
    const legendEl = document.getElementById('plot-legend');

    if (!renderArea || !emptyState || !viewport) return;

    if (!entries.length) {
      emptyState.style.display = 'flex';
      viewport.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    viewport.style.display = 'block';

    const selector = document.getElementById('plot-display-type');
    activeDisplayType = selector ? selector.value : 'bar';

    const renderers = window.LogMyTimePlotRenderers;
    if (!renderers) return;

    if (activeDisplayType === 'bar') {
      renderers.renderBarPlot(entries, renderArea, metaSummary, legendEl, setupPlotTooltips);
    } else if (activeDisplayType === 'heatmap') {
      renderers.renderHeatmapPlot(entries, renderArea, metaSummary, legendEl, setupPlotTooltips);
    }
  }

  function setupPlotTooltips(container, type, formatDuration) {
    const tooltip = document.getElementById('plot-tooltip');
    if (!tooltip) return;

    const targets = container.querySelectorAll(type === 'bar' ? '.bar-group' : '.heatmap-cell');
    targets.forEach(el => {
      el.addEventListener('mouseenter', (e) => {
        const secs = parseInt(el.getAttribute('data-secs') || '0', 10);
        let content = '';

        if (type === 'bar') {
          const day = el.getAttribute('data-day');
          const tasks = decodeURIComponent(el.getAttribute('data-tasks') || '');
          content = `
            <strong>${day}</strong>
            <div>⏱️ Logged: ${formatDuration(secs)}</div>
            ${tasks ? `<div class="tooltip-tasks">Recent: ${tasks}</div>` : ''}
          `;
        } else {
          const date = el.getAttribute('data-date');
          const dayname = el.getAttribute('data-dayname');
          content = `
            <strong>${dayname}, ${date}</strong>
            <div>${secs > 0 ? `⏱️ ${formatDuration(secs)} logged` : 'No activity logged'}</div>
          `;
        }

        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        positionTooltip(e, tooltip);
      });

      el.addEventListener('mousemove', (e) => {
        positionTooltip(e, tooltip);
      });

      el.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    });
  }

  function positionTooltip(e, tooltip) {
    const rect = document.getElementById('plot-viewport').getBoundingClientRect();
    const x = e.clientX - rect.left + 15;
    const y = e.clientY - rect.top + 10;
    tooltip.style.left = `${Math.min(x, rect.width - 180)}px`;
    tooltip.style.top = `${y}px`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('plot-display-type');
    if (selector) {
      selector.addEventListener('change', () => {
        renderActivePlot();
      });
    }
  });

  window.LogMyTimePlots = {
    render: renderActivePlot
  };
})();
