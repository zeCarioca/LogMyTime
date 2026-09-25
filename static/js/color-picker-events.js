/**
 * Event Handlers & DOM Wireup for Oklch Palette Picker
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./color-math', './color-harmony'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./color-math'), require('./color-harmony'));
  } else {
    root.ColorPickerEvents = factory(root.ColorMathUtils, root.ColorHarmonyUtils);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function (ColorMath, ColorHarmony) {
  'use strict';

  const math = ColorMath || (typeof window !== 'undefined' ? window.ColorMathUtils : {});
  const harmony = ColorHarmony || (typeof window !== 'undefined' ? window.ColorHarmonyUtils : {});
  const { parseHex, srgbToOklch } = math;
  const { PROFILES } = harmony;

  function bindPickerEvents(picker) {
    const container = picker.container;
    if (!container) return;

    const header = container.querySelector('.bg-theme-header');
    const toggleBtn = container.querySelector('.btn-theme-expand');
    const hueSlider = container.querySelector('.bg-hue-range-slider');
    const harmonySelect = container.querySelector('.theme-select');
    const profileButtons = container.querySelectorAll('.profile-chip');
    const randomizeBtn = container.querySelector('.randomize-btn');
    const resetBtn = container.querySelector('.reset-btn');
    const hexInput = container.querySelector('.hex-edit-input');
    const nativePicker = container.querySelector('.native-color-input');
    const lockActiveBtn = container.querySelector('.btn-lock-active');

    const togglePanel = () => {
      const isExpanded = container.classList.toggle('is-expanded');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        const chevron = toggleBtn.querySelector('.theme-chevron');
        if (chevron) chevron.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    };

    if (toggleBtn) toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
    if (header) header.addEventListener('click', togglePanel);

    if (hueSlider) {
      hueSlider.addEventListener('input', (e) => {
        picker.state.baseHue = parseFloat(e.target.value) || 0;
        picker.state.isCustom = true;
        picker.generateAndApply(false);
      });
    }

    if (harmonySelect) {
      harmonySelect.addEventListener('change', (e) => {
        picker.state.harmony = e.target.value;
        picker.state.isCustom = true;
        picker.generateAndApply(false);
      });
    }

    profileButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        picker.state.profile = btn.dataset.profile;
        picker.state.isCustom = true;
        picker.generateAndApply(false);
      });
    });

    if (randomizeBtn) {
      randomizeBtn.addEventListener('click', () => {
        const harmonies = ['triadic', 'analogous', 'complementary', 'split-complementary', 'tetradic'];
        const profileKeys = Object.keys(PROFILES);
        picker.state.baseHue = Math.floor(Math.random() * 360);
        picker.state.harmony = harmonies[Math.floor(Math.random() * harmonies.length)];
        picker.state.profile = profileKeys[Math.floor(Math.random() * profileKeys.length)];
        picker.state.isCustom = true;
        picker.generateAndApply(false);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        picker.state = {
          baseHue: picker.options.defaultHue,
          harmony: picker.options.defaultHarmony,
          profile: picker.options.defaultProfile,
          isCustom: false,
          colors: [],
        };
        picker.selectedColorIndex = 0;
        picker.generateAndApply(true);
      });
    }

    if (hexInput) {
      hexInput.addEventListener('input', (e) => {
        const parsed = parseHex(e.target.value);
        if (parsed && picker.state.colors[picker.selectedColorIndex]) {
          const oklch = srgbToOklch(parsed.r, parsed.g, parsed.b);
          const targetColor = picker.state.colors[picker.selectedColorIndex];
          targetColor.hex = parsed.hex;
          targetColor.rgb = { r: parsed.r, g: parsed.g, b: parsed.b };
          targetColor.oklch = oklch;
          targetColor.cssOklch = `oklch(${(oklch.l * 100).toFixed(2)}% ${oklch.c.toFixed(4)} ${oklch.h.toFixed(2)}deg)`;

          if (picker.selectedColorIndex === 0) picker.state.baseHue = oklch.h;

          picker.state.isCustom = true;
          picker.updateInspector();
          picker.renderSwatches();
          picker.applyCssTokens(picker.state.colors);
          picker._saveState();
        }
      });
    }

    if (nativePicker) {
      nativePicker.addEventListener('input', (e) => {
        if (hexInput) {
          hexInput.value = e.target.value.replace(/^#/, '');
          hexInput.dispatchEvent(new Event('input'));
        }
      });
    }

    if (lockActiveBtn) {
      lockActiveBtn.addEventListener('click', () => {
        const currentColor = picker.state.colors[picker.selectedColorIndex];
        if (currentColor) {
          currentColor.isLocked = !currentColor.isLocked;
          picker.state.isCustom = true;
          picker.updateInspector();
          picker.renderSwatches();
          picker._saveState();
        }
      });
    }
  }

  return {
    bindPickerEvents,
  };
});
