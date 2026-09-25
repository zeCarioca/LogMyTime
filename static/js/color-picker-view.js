/**
 * HTML Template Rendering for Oklch Palette Customizer
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ColorPickerView = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function renderPickerTemplate(container, options, state, profiles) {
    if (!container) return;
    container.classList.add('oklch-picker-root');
    const profileChips = Object.keys(profiles)
      .map(
        (key) => `
        <button type="button" class="profile-chip ${state.profile === key ? 'active' : ''}" data-profile="${key}">
          ${profiles[key].name}
        </button>`
      )
      .join('');

    container.innerHTML = `
      <div class="card-header bg-theme-header">
        <div class="title-with-count">
          <span class="theme-icon">🎨</span>
          <h2>${options.title}</h2>
        </div>
        <button type="button" class="btn-theme-expand" aria-expanded="false" title="Toggle palette generator panel">
          <span class="theme-toggle-text">Customize</span>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" class="theme-chevron">
            <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>

      <div class="bg-theme-content">
        <p class="theme-explainer">
          Click swatches to edit or lock. Locked colors persist through randomizations.
        </p>

        <div class="palette-swatches-strip" title="Active Oklch Palette"></div>

        <div class="theme-inspector-card">
          <div class="inspector-color-wrapper">
            <label for="colorPickerNative" class="inspector-swatch-label" title="Click to open color picker">
              <span class="theme-color-preview"></span>
              <input type="color" id="colorPickerNative" class="native-color-input" />
            </label>
            <div class="theme-badge-meta">
              <span class="theme-color-name">Tone 1 (Dominant)</span>
              <span class="theme-color-oklch">oklch(...)</span>
            </div>
          </div>

          <div class="inspector-hex-input-group">
            <span class="hex-prefix">#</span>
            <input type="text" class="hex-edit-input" maxlength="6" placeholder="6366f1" spellcheck="false" title="Enter 6-digit hex color" />
            <button type="button" class="btn-lock-active" title="Toggle lock for this color">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="lock-icon">
                <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
              </svg>
              <span class="lock-label">Lock</span>
            </button>
          </div>
        </div>

        <div class="slider-wrapper">
          <div class="slider-label-row">
            <label class="slider-label">Base Hue</label>
            <span class="slider-value-display">${Math.round(state.baseHue)}°</span>
          </div>
          <input type="range" class="bg-hue-range-slider" min="0" max="360" value="${state.baseHue}" step="1" />
          <div class="slider-ticks">
            <span>0° Red</span>
            <span>120° Grn</span>
            <span>240° Blu</span>
            <span>360°</span>
          </div>
        </div>

        <div class="theme-control-group">
          <label class="slider-label">Harmony Engine</label>
          <select class="theme-select">
            <option value="triadic" ${state.harmony === 'triadic' ? 'selected' : ''}>Triadic (0°, 120°, 240°)</option>
            <option value="analogous" ${state.harmony === 'analogous' ? 'selected' : ''}>Analogous (0°, ±30°)</option>
            <option value="complementary" ${state.harmony === 'complementary' ? 'selected' : ''}>Complementary (0°, 180°)</option>
            <option value="split-complementary" ${state.harmony === 'split-complementary' ? 'selected' : ''}>Split-Complementary (0°, 150°, 210°)</option>
            <option value="tetradic" ${state.harmony === 'tetradic' ? 'selected' : ''}>Tetradic (0°, 90°, 180°, 270°)</option>
            <option value="monochromatic" ${state.harmony === 'monochromatic' ? 'selected' : ''}>Monochromatic (0°)</option>
          </select>
        </div>

        <div class="theme-control-group">
          <label class="slider-label">Aesthetic Profile</label>
          <div class="profile-chips-grid">${profileChips}</div>
        </div>

        <div class="theme-actions-row">
          <button type="button" class="btn-theme-secondary randomize-btn" title="Randomize unlocked colors">🎲 Randomize</button>
          <button type="button" class="btn-theme-reset reset-btn" title="Reset all to default">Reset Default</button>
        </div>
      </div>
    `;
  }

  return {
    renderPickerTemplate,
  };
});
