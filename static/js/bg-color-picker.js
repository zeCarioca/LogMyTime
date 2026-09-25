/**
 * ============================================================================
 * Standalone Oklch Palette Generator & Color Picker Component
 * ============================================================================
 * 
 * Modular orchestrator coordinating:
 * - ColorMathUtils (color-math.js)
 * - ColorHarmonyUtils (color-harmony.js)
 * - ColorPickerStorage (color-picker-storage.js)
 * - ColorPickerView (color-picker-view.js)
 * - ColorInspectorComponent (color-inspector.js)
 * - ColorPickerEvents (color-picker-events.js)
 * - ThemeTokens (theme-tokens.js)
 * - SavedPaletteManager (saved-palettes.js)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./color-math', './color-harmony', './color-picker-storage', './color-picker-view', './color-inspector', './color-picker-events', './theme-tokens', './saved-palettes'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./color-math'), require('./color-harmony'), require('./color-picker-storage'), require('./color-picker-view'), require('./color-inspector'), require('./color-picker-events'), require('./theme-tokens'), require('./saved-palettes'));
  } else {
    root.OklchPalettePicker = factory(root.ColorMathUtils, root.ColorHarmonyUtils, root.ColorPickerStorage, root.ColorPickerView, root.ColorInspectorComponent, root.ColorPickerEvents, root.ThemeTokens, root.SavedPaletteManager);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function (ColorMath, ColorHarmony, ColorStorage, ColorView, Inspector, PickerEvents, Tokens, SavedManagerClass) {
  'use strict';

  const math = ColorMath || (typeof window !== 'undefined' ? window.ColorMathUtils : {});
  const harmony = ColorHarmony || (typeof window !== 'undefined' ? window.ColorHarmonyUtils : {});
  const storage = ColorStorage || (typeof window !== 'undefined' ? window.ColorPickerStorage : {});
  const view = ColorView || (typeof window !== 'undefined' ? window.ColorPickerView : {});
  const inspector = Inspector || (typeof window !== 'undefined' ? window.ColorInspectorComponent : {});
  const events = PickerEvents || (typeof window !== 'undefined' ? window.ColorPickerEvents : {});
  const tokens = Tokens || (typeof window !== 'undefined' ? window.ThemeTokens : {});
  const SavedManager = SavedManagerClass || (typeof window !== 'undefined' ? window.SavedPaletteManager : null);

  const { parseHex, srgbToOklch, oklchToRgb, wrapHue, fitIntoSrgbGamut } = math;
  const { PROFILES, generatePalette } = harmony;

  class OklchPalettePicker {
    constructor(options = {}) {
      this.options = Object.assign(
        {
          container: null,
          title: 'Oklch Palette',
          defaultHue: 240,
          defaultHarmony: 'triadic',
          defaultProfile: 'vibrant',
          count: 5,
          storageKey: 'logmytime_oklch_theme_state',
          autoApplyCssVariables: true,
          onApply: null,
        },
        options
      );

      this.state = storage.loadPickerState(this.options.storageKey, {
        baseHue: this.options.defaultHue,
        harmony: this.options.defaultHarmony,
        profile: this.options.defaultProfile,
        isCustom: false,
        colors: [],
      });

      this.selectedColorIndex = 0;
      this.container = typeof this.options.container === 'string'
        ? document.querySelector(this.options.container)
        : this.options.container;

      if (this.container) this.render();
      this.update(false);
    }

    _saveState() {
      storage.savePickerState(this.options.storageKey, this.state);
    }

    render() {
      if (!this.container) return;
      view.renderPickerTemplate(this.container, this.options, this.state, PROFILES);
      events.bindPickerEvents(this);
    }

    generateAndApply(forceReset = false) {
      const generated = generatePalette({
        baseHue: this.state.baseHue,
        harmony: this.state.harmony,
        profile: this.state.profile,
        count: this.options.count || 5,
      });

      if (forceReset || !this.state.colors || this.state.colors.length === 0) {
        this.state.colors = generated;
      } else {
        this.state.colors = generated.map((gen, i) => (this.state.colors[i]?.isLocked ? this.state.colors[i] : gen));
      }
      this.update();
    }

    update(save = true) {
      if (!this.state.colors || this.state.colors.length === 0) {
        this.generateAndApply(false);
        return;
      }

      if (this.container) {
        const valDisplay = this.container.querySelector('.slider-value-display');
        const hueSlider = this.container.querySelector('.bg-hue-range-slider');
        const harmonySelect = this.container.querySelector('.theme-select');
        const profileButtons = this.container.querySelectorAll('.profile-chip');

        if (valDisplay) valDisplay.textContent = `${Math.round(this.state.baseHue)}°`;
        if (hueSlider) hueSlider.value = this.state.baseHue;
        if (harmonySelect) harmonySelect.value = this.state.harmony;
        profileButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.profile === this.state.profile));

        this.renderSwatches();
        this.updateInspector();
      }

      if (this.options.autoApplyCssVariables) this.applyCssTokens(this.state.colors);
      if (typeof this.options.onApply === 'function') this.options.onApply(this.state.colors, this.state);
      if (save) this._saveState();
    }

    renderSwatches() {
      inspector.renderSwatches(this.container, this.state.colors, this.selectedColorIndex, (idx) => {
        this.selectedColorIndex = idx;
        this.renderSwatches();
        this.updateInspector();
      });
    }

    updateInspector() {
      inspector.updateInspector(this.container, this.state.colors, this.selectedColorIndex);
    }

    applyCssTokens(palette) {
      tokens.applyCssTokens(palette, this.state.isCustom);
    }

    loadPalette(paletteData) {
      if (!paletteData || !Array.isArray(paletteData.colors)) return;
      this.state.baseHue = typeof paletteData.baseHue === 'number' ? paletteData.baseHue : this.state.baseHue;
      this.state.harmony = paletteData.harmony || this.state.harmony;
      this.state.profile = paletteData.profile || this.state.profile;
      this.state.isCustom = true;
      this.state.colors = paletteData.colors.map((c) => Object.assign({}, c));
      this.selectedColorIndex = 0;
      this.update(true);
    }

    getPaletteSnapshot() {
      return {
        baseHue: this.state.baseHue,
        harmony: this.state.harmony,
        profile: this.state.profile,
        colors: this.state.colors.map((c) => ({
          hex: c.hex,
          rgb: Object.assign({}, c.rgb),
          oklch: Object.assign({}, c.oklch),
          cssOklch: c.cssOklch,
          isLocked: !!c.isLocked,
        })),
        createdAt: new Date().toISOString(),
      };
    }

    static init(options = {}) {
      return new OklchPalettePicker(options);
    }
  }

  Object.assign(OklchPalettePicker, { generatePalette, wrapHue, oklchToRgb, srgbToOklch, parseHex, fitIntoSrgbGamut, PROFILES, SavedPaletteManager: SavedManager });
  return OklchPalettePicker;
});

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const themeEl = document.getElementById('bgThemeContainer');
    if (themeEl && typeof OklchPalettePicker !== 'undefined') {
      const picker = OklchPalettePicker.init({ container: themeEl, storageKey: 'logmytime_oklch_theme_state' });
      const savedEl = document.getElementById('savedPalettesContainer');
      const ManagerClass = OklchPalettePicker.SavedPaletteManager || (typeof SavedPaletteManager !== 'undefined' ? SavedPaletteManager : null);
      if (savedEl && ManagerClass) {
        new ManagerClass(picker, { container: savedEl, storageKey: 'logmytime_saved_palette_profiles' });
      }
    }
  });
}
