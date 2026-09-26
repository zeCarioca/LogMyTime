/**
 * Data Tab Dashboard Controller
 * Fetches and renders hierarchy: Repository -> User -> Commits -> Time -> Date
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function loadHierarchyData() {
    const loadingEl = document.getElementById('hierarchy-loading');
    const containerEl = document.getElementById('hierarchy-container');
    const emptyEl = document.getElementById('hierarchy-empty');

    if (!loadingEl || !containerEl) return;

    loadingEl.style.display = 'flex';
    containerEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    try {
      const response = await fetch('/data/hierarchy');
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      const data = await response.json();
      renderHierarchy(data);
    } catch (err) {
      loadingEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.style.display = 'block';
        emptyEl.innerHTML = `<p class="text-danger">Failed to load analytics: ${escapeHtml(err.message)}</p>`;
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
      return;
    }

    let totalGlobalSeconds = 0;
    let totalGlobalCommits = 0;

    let html = '';

    hierarchy.forEach((repoNode, repoIdx) => {
      const userNode = repoNode.user_list && repoNode.user_list[0] ? repoNode.user_list[0] : null;
      const repoSecs = userNode ? userNode.summary.total_seconds : 0;
      const repoCommits = userNode ? userNode.commits.length : 0;

      totalGlobalSeconds += repoSecs;
      totalGlobalCommits += repoCommits;

      html += `
        <div class="hierarchy-repo-block">
          <div class="hierarchy-level repo-level" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="hierarchy-title-group">
              <span class="hierarchy-toggle-icon">▾</span>
              <span class="repo-badge-icon">📦</span>
              <strong class="hierarchy-name">${escapeHtml(repoNode.repository)}</strong>
              <span class="branch-pill">${escapeHtml(repoNode.default_branch || 'main')}</span>
            </div>
            <div class="hierarchy-meta-group">
              <span class="meta-tag commits-count">${repoCommits} commits</span>
              <span class="meta-tag duration-badge">${formatDuration(repoSecs)}</span>
            </div>
          </div>

          <div class="hierarchy-children">
            ${userNode ? renderUserNode(userNode) : '<div class="empty-child">No user activity recorded.</div>'}
          </div>
        </div>
      `;
    });

    containerEl.innerHTML = html;
    containerEl.style.display = 'block';

    if (kpiRepos) kpiRepos.textContent = hierarchy.length;
    if (kpiCommits) kpiCommits.textContent = totalGlobalCommits;
    if (kpiTotalTime) kpiTotalTime.textContent = formatDuration(totalGlobalSeconds);
  }

  function renderUserNode(user) {
    return `
      <div class="hierarchy-user-block">
        <div class="hierarchy-level user-level">
          <div class="hierarchy-title-group">
            <span class="user-badge-icon">👤</span>
            <span class="user-handle">@${escapeHtml(user.username)}</span>
            <span class="role-pill">Default: Self</span>
          </div>
          <div class="hierarchy-meta-group">
            <span class="user-summary">${user.time_records.length} time logs</span>
          </div>
        </div>

        <div class="hierarchy-split-grid">
          <!-- Commits Branch -->
          <div class="hierarchy-subcard commits-subcard">
            <div class="subcard-header">
              <span class="subcard-icon">⚡</span>
              <h4>Recent Commits</h4>
              <span class="count-tag">${user.commits.length}</span>
            </div>
            <div class="subcard-list">
              ${user.commits.length ? user.commits.map(c => `
                <div class="commit-item">
                  <span class="commit-sha"><code>${escapeHtml(c.sha)}</code></span>
                  <span class="commit-msg" title="${escapeHtml(c.message)}">${escapeHtml(c.message)}</span>
                  <span class="commit-date">${c.date ? escapeHtml(c.date.slice(0, 10)) : ''}</span>
                </div>
              `).join('') : '<div class="empty-subtext">No commits found for current user</div>'}
            </div>
          </div>

          <!-- Time & Date Records Branch -->
          <div class="hierarchy-subcard time-subcard">
            <div class="subcard-header">
              <span class="subcard-icon">⏱️</span>
              <h4>Time Records & Date</h4>
              <span class="count-tag">${user.time_records.length}</span>
            </div>
            <div class="subcard-list">
              ${user.time_records.length ? user.time_records.map(t => `
                <div class="time-item ${t.is_synced ? 'synced' : 'pending'}">
                  <div class="time-main">
                    <span class="time-task">${escapeHtml(t.task_description)}</span>
                    <span class="time-date-badge">${escapeHtml(t.date)}</span>
                  </div>
                  <div class="time-meta">
                    <span class="time-duration">${escapeHtml(t.formatted_duration)}</span>
                    <span class="time-status-dot" title="${t.is_synced ? 'Synced' : 'Pending'}"></span>
                  </div>
                </div>
              `).join('') : '<div class="empty-subtext">No time tracked for this repo yet</div>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const dataTabBtn = document.getElementById('tab-btn-data');
    const refreshBtn = document.getElementById('btn-refresh-hierarchy');

    if (dataTabBtn) {
      dataTabBtn.addEventListener('click', () => {
        // Load on-demand when switching to data tab
        loadHierarchyData();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadHierarchyData();
      });
    }
  });
})();
