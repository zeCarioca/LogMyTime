/**
 * Inspector and Swatches Strip Components for Oklch Palette Picker
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ColorInspectorComponent = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function renderSwatches(container, colors, selectedIndex, onSelect) {
    if (!container) return;
    const swatchesStrip = container.querySelector('.palette-swatches-strip');
    if (!swatchesStrip) return;

    swatchesStrip.innerHTML = '';
    (colors || []).forEach((color, idx) => {
      const itemWrap = document.createElement('div');
      itemWrap.className = 'swatch-slot-container' + (idx === selectedIndex ? ' is-selected' : '');

      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'palette-swatch-item' + (color.isLocked ? ' is-locked' : '');
      swatch.style.backgroundColor = color.hex;
      swatch.title = `Tone ${idx + 1}: ${color.hex}\nClick to inspect & edit`;

      if (color.isLocked) {
        const lockBadge = document.createElement('span');
        lockBadge.className = 'swatch-lock-badge';
        lockBadge.innerHTML = '🔒';
        swatch.appendChild(lockBadge);
      }

      swatch.addEventListener('click', () => {
        if (typeof onSelect === 'function') {
          onSelect(idx);
        }
      });

      itemWrap.appendChild(swatch);
      swatchesStrip.appendChild(itemWrap);
    });
  }

  function updateInspector(container, colors, selectedIndex) {
    if (!container || !colors) return;
    const currentColor = colors[selectedIndex];
    if (!currentColor) return;

    const previewSwatch = container.querySelector('.theme-color-preview');
    const colorNameLabel = container.querySelector('.theme-color-name');
    const colorOklchLabel = container.querySelector('.theme-color-oklch');
    const hexInput = container.querySelector('.hex-edit-input');
    const nativePicker = container.querySelector('.native-color-input');
    const lockActiveBtn = container.querySelector('.btn-lock-active');

    if (previewSwatch) previewSwatch.style.backgroundColor = currentColor.hex;
    if (nativePicker) nativePicker.value = currentColor.hex;
    if (colorNameLabel) {
      colorNameLabel.textContent = `Tone ${selectedIndex + 1} ${selectedIndex === 0 ? '(Dominant)' : ''}`;
    }
    if (colorOklchLabel) {
      colorOklchLabel.textContent =
        currentColor.cssOklch ||
        `oklch(${(currentColor.oklch.l * 100).toFixed(1)}% ${currentColor.oklch.c.toFixed(3)} ${Math.round(
          currentColor.oklch.h
        )}deg)`;
    }
    if (hexInput && document.activeElement !== hexInput) {
      hexInput.value = currentColor.hex.replace(/^#/, '');
    }

    if (lockActiveBtn) {
      lockActiveBtn.classList.toggle('active', !!currentColor.isLocked);
      const lockLabel = lockActiveBtn.querySelector('.lock-label');
      if (lockLabel) {
        lockLabel.textContent = currentColor.isLocked ? 'Locked' : 'Lock';
      }
    }
  }

  return {
    renderSwatches,
    updateInspector,
  };
});
