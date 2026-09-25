/**
 * Theme CSS Custom Property Applier Engine
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ThemeTokens = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function applyCssTokens(palette, isCustom = true) {
    const root = document.documentElement;
    if (!isCustom || !palette || palette.length === 0) {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-hover');
      root.style.removeProperty('--primary-gradient');
      root.style.removeProperty('--card-glow');
      root.style.removeProperty('--card-border');
      root.style.removeProperty('--card-bg');
      root.style.removeProperty('--bg-gradient');
      document.body.style.removeProperty('background');
      return;
    }

    const c1 = palette[0];
    const c2 = palette[1] || palette[0];
    const c3 = palette[2] || palette[0];

    root.style.setProperty('--primary', c1.hex);
    root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${c1.hex} 0%, ${c2.hex} 100%)`);
    root.style.setProperty(
      '--card-glow',
      `rgba(${Math.round(c1.rgb.r * 255)}, ${Math.round(c1.rgb.g * 255)}, ${Math.round(c1.rgb.b * 255)}, 0.22)`
    );

    const tintR = Math.round(c1.rgb.r * 25);
    const tintG = Math.round(c1.rgb.g * 25);
    const tintB = Math.round(c1.rgb.b * 35);
    root.style.setProperty('--card-bg', `rgba(${12 + tintR}, ${18 + tintG}, ${28 + tintB}, 0.75)`);
    root.style.setProperty(
      '--card-border',
      `rgba(${Math.round(c1.rgb.r * 255)}, ${Math.round(c1.rgb.g * 255)}, ${Math.round(c1.rgb.b * 255)}, 0.16)`
    );

    const bgGrad = `radial-gradient(ellipse at 80% 10%, rgba(${Math.round(c2.rgb.r * 70)}, ${Math.round(c2.rgb.g * 70)}, ${Math.round(c2.rgb.b * 70)}, 0.35) 0%, transparent 60%), radial-gradient(ellipse at 20% 90%, rgba(${Math.round(c3.rgb.r * 60)}, ${Math.round(c3.rgb.g * 60)}, ${Math.round(c3.rgb.b * 60)}, 0.3) 0%, transparent 65%), linear-gradient(135deg, #090d16 0%, #0d1322 50%, #04060c 100%)`;
    root.style.setProperty('--bg-gradient', bgGrad);
    document.body.style.background = bgGrad;
  }

  return {
    applyCssTokens,
  };
});
