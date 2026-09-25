/**
 * Oklch Palette State Management & LocalStorage Persistence
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ColorPickerStorage = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function loadPickerState(storageKey, defaultState) {
    if (!storageKey) return Object.assign({}, defaultState);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          baseHue: typeof parsed.baseHue === 'number' ? parsed.baseHue : defaultState.baseHue,
          harmony: parsed.harmony || defaultState.harmony,
          profile: parsed.profile || defaultState.profile,
          isCustom: typeof parsed.isCustom === 'boolean' ? parsed.isCustom : defaultState.isCustom,
          colors: Array.isArray(parsed.colors) && parsed.colors.length > 0 ? parsed.colors : defaultState.colors,
        };
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return Object.assign({}, defaultState);
  }

  function savePickerState(storageKey, state) {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  return {
    loadPickerState,
    savePickerState,
  };
});
