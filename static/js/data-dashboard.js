/**
 * Data Tab Dashboard Controller
 * Fetches and coordinates hierarchy: Repository -> User -> Commits -> Time -> Date
 */
(function () {
  'use strict';

  function formatDuration(totalSeconds) {
    const secs = totalSeconds || 0;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  async function loadHierarchyData(repoFilter) {
    const loadingEl = document.getElementById('hierarchy-loading');
    const containerEl = document.getElementById('hierarchy-container');
    const emptyEl = document.getElementById('hierarchy-empty');

    if (!loadingEl || !containerEl) return;

    loadingEl.style.display = 'flex';
    containerEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    if (repoFilter === undefined) {
      const repoSelect = document.getElementById('data-repo-select');
      if (repoSelect) repoFilter = repoSelect.value;
    }

    try {
      let url = '/data/hierarchy';
      if (repoFilter) {
        url += `?repo=${encodeURIComponent(repoFilter)}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load data: ${response.statusText}`);
      const data = await response.json();

      if (data.selected_repository && repoFilter === undefined) {
        const repoSelect = document.getElementById('data-repo-select');
        if (repoSelect && !repoSelect.value) repoSelect.value = data.selected_repository;
      }

      renderHierarchy(data);
    } catch (err) {
      loadingEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.style.display = 'block';
        const esc = window.LogMyTimeTemplates ? window.LogMyTimeTemplates.escapeHtml : String;
        emptyEl.innerHTML = `<p class="text-danger">Failed to load analytics: ${esc(err.message)}</p>`;
      }
    }
  }

  function renderHierarchy(payload) {
    const loadingEl = document.getElementById('hierarchy-loading');
    const containerEl = document.getElementById('hierarchy-container');
    const emptyEl = document.getElementById('hierarchy-empty');

    const kpiRepos = document.getElementById('kpi-repos-count');
    const kpiCommits = document.getElementById('kpi-commits-count');
    const kpiTotalTime = document.getElementById('kpi-total-time');

    const hierarchy = payload.hierarchy || [];
    loadingEl.style.display = 'none';

    if (!hierarchy.length) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (kpiRepos) kpiRepos.textContent = '0';
      if (kpiCommits) kpiCommits.textContent = '0';
      if (kpiTotalTime) kpiTotalTime.textContent = '0m';
      if (window.LogMyTimePlots && typeof window.LogMyTimePlots.render === 'function') {
        window.LogMyTimePlots.render([]);
      }
      return;
    }

    let totalGlobalSeconds = 0;
    let totalGlobalCommits = 0;
    let html = '';

    const templates = window.LogMyTimeTemplates;

    hierarchy.forEach((repoNode) => {
      const userNode = repoNode.user_list && repoNode.user_list[0] ? repoNode.user_list[0] : null;
      if (userNode) {
        totalGlobalSeconds += userNode.summary.total_seconds;
        totalGlobalCommits += userNode.commits.length;
      }
      if (templates) {
        html += templates.renderRepoNode(repoNode, userNode, formatDuration);
      }
    });

    containerEl.innerHTML = html;
    containerEl.style.display = 'block';

    if (kpiRepos) kpiRepos.textContent = hierarchy.length;
    if (kpiCommits) kpiCommits.textContent = totalGlobalCommits;
    if (kpiTotalTime) kpiTotalTime.textContent = formatDuration(totalGlobalSeconds);

    if (window.LogMyTimePlots && typeof window.LogMyTimePlots.render === 'function') {
      window.LogMyTimePlots.render(hierarchy);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const dataTabBtn = document.getElementById('tab-btn-data');
    const refreshBtn = document.getElementById('btn-refresh-hierarchy');

    if (dataTabBtn) {
      dataTabBtn.addEventListener('click', () => loadHierarchyData());
    }
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => loadHierarchyData());
    }
  });

  window.LogMyTimeDataDashboard = {
    loadData: loadHierarchyData
  };
})();
