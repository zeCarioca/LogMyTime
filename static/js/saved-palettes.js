/**
 * Saved Palettes Manager Component
 * Handles saving, loading, deleting, and persisting custom palette profiles.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SavedPaletteManager = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class SavedPaletteManager {
    constructor(pickerInstance, options = {}) {
      this.picker = pickerInstance;
      this.options = Object.assign(
        {
          container: '#savedPalettesContainer',
          storageKey: 'logmytime_saved_palette_profiles',
        },
        options
      );

      this.container =
        typeof this.options.container === 'string'
          ? document.querySelector(this.options.container)
          : this.options.container;

      this.profiles = this._loadProfiles();
      this._bindEvents();
      this.render();
    }

    _loadProfiles() {
      try {
        const raw = localStorage.getItem(this.options.storageKey);
        if (raw) {
          const list = JSON.parse(raw);
          return Array.isArray(list) ? list : [];
        }
      } catch (e) {
        // Ignore storage errors
      }
      return [];
    }

    _saveProfiles() {
      try {
        localStorage.setItem(this.options.storageKey, JSON.stringify(this.profiles));
      } catch (e) {
        // Ignore storage errors
      }
    }

    _bindEvents() {
      if (!this.container) return;
      const header = this.container.querySelector('.saved-profiles-header');
      const toggleBtn = this.container.querySelector('#savedProfilesToggleBtn');
      const saveBtn = this.container.querySelector('#savePaletteBtn');
      const nameInput = this.container.querySelector('#profileNameInput');

      const togglePanel = () => {
        const isExpanded = this.container.classList.toggle('is-expanded');
        if (toggleBtn) {
          toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
          const toggleText = toggleBtn.querySelector('.saved-profiles-toggle-text');
          if (toggleText) {
            toggleText.textContent = isExpanded ? 'Hide' : 'View';
          }
          const chevron = toggleBtn.querySelector('.saved-profiles-chevron');
          if (chevron) {
            chevron.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        }
      };

      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          togglePanel();
        });
      }

      if (header) {
        header.addEventListener('click', togglePanel);
      }

      const handleSave = () => {
        const name = (nameInput.value || '').trim();
        if (!name) {
          if (!this.container.classList.contains('is-expanded')) {
            togglePanel();
          }
          nameInput.focus();
          nameInput.classList.add('input-error');
          setTimeout(() => nameInput.classList.remove('input-error'), 1200);
          return;
        }

        const snapshot = this.picker.getPaletteSnapshot();
        const newProfile = {
          id: 'profile_' + Date.now(),
          name,
          ...snapshot,
        };

        this.profiles.unshift(newProfile);
        this._saveProfiles();
        nameInput.value = '';
        this.render();
      };

      if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
      }

      if (nameInput) {
        nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
        });
      }
    }

    render() {
      if (!this.container) return;
      const listEl = this.container.querySelector('#savedProfilesList');
      const countEl = this.container.querySelector('#savedProfilesCount');
      if (countEl) countEl.textContent = `${this.profiles.length} saved`;
      if (!listEl) return;
      listEl.innerHTML = '';

      if (this.profiles.length === 0) {
        listEl.innerHTML = '<div class="empty-profiles-hint"><span>No saved palettes yet. Name and save your favorite combination above!</span></div>';
        return;
      }

      this.profiles.forEach((profile) => {
        const item = document.createElement('div');
        item.className = 'saved-profile-item';

        const swatchesHtml = (profile.colors || [])
          .map((c) => `<span class="mini-swatch" style="background-color: ${c.hex};" title="${c.hex}"></span>`)
          .join('');

        item.innerHTML = `
          <div class="saved-profile-info">
            <div class="saved-profile-title-row">
              <strong class="saved-profile-name">${this._escapeHtml(profile.name)}</strong>
              <span class="saved-profile-meta">${profile.harmony || 'triadic'} • ${profile.profile || 'vibrant'}</span>
            </div>
            <div class="saved-profile-swatches">${swatchesHtml}</div>
          </div>
          <div class="saved-profile-actions">
            <button type="button" class="btn-load-profile" title="Apply this palette to the app">Load</button>
            <button type="button" class="btn-delete-profile" title="Delete saved profile">&times;</button>
          </div>
        `;

        item.querySelector('.btn-load-profile')?.addEventListener('click', () => {
          this.picker.loadPalette(profile);
          document.querySelectorAll('.saved-profile-item').forEach((el) => el.classList.remove('is-active'));
          item.classList.add('is-active');
        });

        item.querySelector('.btn-delete-profile')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.profiles = this.profiles.filter((p) => p.id !== profile.id);
          this._saveProfiles();
          this.render();
        });

        listEl.appendChild(item);
      });
    }

    _escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  return SavedPaletteManager;
});
