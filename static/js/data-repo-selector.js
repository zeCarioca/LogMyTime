/**
 * Repository Selector Controller for Data Tab
 * Manages repository scope, filter sync, and user preference persistence
 */
(function () {
  'use strict';

  async function saveSelectedRepoPreference(repoFullName) {
    const statusBadge = document.getElementById('selector-saved-status');
    const badgeText = statusBadge ? statusBadge.querySelector('.status-text') : null;
    const activeBadge = document.getElementById('active-repo-badge');

    if (statusBadge && badgeText) {
      statusBadge.classList.add('saving');
      badgeText.textContent = 'Saving preference...';
    }

    try {
      const response = await fetch('/data/preference/selected-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ repository: repoFullName })
      });

      if (response.ok) {
        if (statusBadge && badgeText) {
          statusBadge.classList.remove('saving');
          badgeText.textContent = repoFullName ? 'Preference saved' : 'All repos active';
        }
        if (activeBadge) {
          activeBadge.textContent = repoFullName || 'All Repositories';
        }
      }
    } catch (err) {
      console.error('Failed to save selected repository preference:', err);
      if (statusBadge && badgeText) {
        statusBadge.classList.remove('saving');
        badgeText.textContent = 'Error saving';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const repoSelect = document.getElementById('data-repo-select');
    const clearBtn = document.getElementById('btn-clear-repo-filter');
    const exportCsvBtn = document.getElementById('btn-export-csv');

    function updateExportLink(repoName) {
      if (!exportCsvBtn) return;
      if (repoName) {
        exportCsvBtn.href = `/data/export/csv?repo=${encodeURIComponent(repoName)}`;
      } else {
        exportCsvBtn.href = '/data/export/csv';
      }
    }

    if (repoSelect) {
      // Initialize export link with pre-selected value
      updateExportLink(repoSelect.value);

      repoSelect.addEventListener('change', async (e) => {
        const selectedValue = e.target.value;
        updateExportLink(selectedValue);
        await saveSelectedRepoPreference(selectedValue);

        // Notify data dashboard to refresh hierarchy with the selected repository filter
        if (window.LogMyTimeDataDashboard && typeof window.LogMyTimeDataDashboard.loadData === 'function') {
          window.LogMyTimeDataDashboard.loadData(selectedValue);
        }
      });
    }

    if (clearBtn && repoSelect) {
      clearBtn.addEventListener('click', async () => {
        if (repoSelect.value !== '') {
          repoSelect.value = '';
          updateExportLink('');
          await saveSelectedRepoPreference('');

          if (window.LogMyTimeDataDashboard && typeof window.LogMyTimeDataDashboard.loadData === 'function') {
            window.LogMyTimeDataDashboard.loadData('');
          }
        }
      });
    }
  });
})();
