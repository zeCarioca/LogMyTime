/**
 * HTML Templates for Data Dashboard Nodes
 */
(function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

  function renderRepoNode(repoNode, userNode, formatDuration) {
    const repoSecs = userNode ? userNode.summary.total_seconds : 0;
    const repoCommits = userNode ? userNode.commits.length : 0;

    return `
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
  }

  window.LogMyTimeTemplates = {
    escapeHtml,
    renderRepoNode,
    renderUserNode
  };
})();
