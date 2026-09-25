/**
 * Oklch Harmonization Engine & Profiles
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./color-math'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./color-math'));
  } else {
    root.ColorHarmonyUtils = factory(root.ColorMathUtils);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function (math) {
  'use strict';

  const { wrapHue, fitIntoSrgbGamut, oklchToRgb, rgbToHex } = math || (typeof window !== 'undefined' ? window.ColorMathUtils : {});

  const PROFILES = {
    pastel: {
      name: 'Pastel',
      lMin: 0.82,
      lMax: 0.94,
      cMin: 0.035,
      cMax: 0.10,
      hueBias: (h) => {
        const isWarm = h >= 50 && h <= 110;
        return { targetL: isWarm ? 0.87 : 0.89, targetC: 0.065 };
      },
    },
    vibrant: {
      name: 'Vibrant',
      lMin: 0.58,
      lMax: 0.76,
      cMin: 0.18,
      cMax: 0.28,
      hueBias: (h) => {
        const isYellowGreen = h >= 95 && h <= 145;
        return { targetL: isYellowGreen ? 0.74 : 0.65, targetC: 0.25 };
      },
    },
    neon: {
      name: 'Neon',
      lMin: 0.78,
      lMax: 0.93,
      cMin: 0.20,
      cMax: 0.35,
      hueBias: (h) => {
        const peaks = [100, 135, 195, 325];
        let minDist = 360;
        for (const p of peaks) {
          const d = Math.abs(wrapHue(h - p));
          const cd = Math.min(d, 360 - d);
          if (cd < minDist) minDist = cd;
        }
        const factor = Math.max(0, 1.0 - minDist / 45.0);
        return { targetL: 0.82 + factor * 0.09, targetC: 0.22 + factor * 0.10 };
      },
    },
    'deep-jewel': {
      name: 'Jewel',
      lMin: 0.25,
      lMax: 0.44,
      cMin: 0.12,
      cMax: 0.22,
      hueBias: () => ({ targetL: 0.34, targetC: 0.17 }),
    },
    'muted-earthy': {
      name: 'Earthy',
      lMin: 0.40,
      lMax: 0.62,
      cMin: 0.03,
      cMax: 0.09,
      hueBias: (h) => {
        const isWarm = h >= 20 && h <= 80;
        return { targetL: isWarm ? 0.52 : 0.47, targetC: isWarm ? 0.08 : 0.05 };
      },
    },
  };

  function getHarmonyOffsets(harmony) {
    switch (harmony) {
      case 'monochromatic':
        return [0];
      case 'analogous':
        return [0, -30, 30];
      case 'complementary':
        return [0, 180];
      case 'triadic':
        return [0, 120, 240];
      case 'split-complementary':
        return [0, 150, 210];
      case 'tetradic':
        return [0, 90, 180, 270];
      default:
        return [0, 120, 240];
    }
  }

  function generatePalette(options = {}) {
    const baseHue = typeof options.baseHue === 'number' ? options.baseHue : 240;
    const harmony = options.harmony || 'triadic';
    const profileKey = options.profile || 'vibrant';
    const count = typeof options.count === 'number' ? options.count : 5;

    const profile = PROFILES[profileKey] || PROFILES.vibrant;
    const offsets = getHarmonyOffsets(harmony);
    const palette = [];

    for (let i = 0; i < count; i++) {
      const baseOffset = offsets[i % offsets.length];
      const cycle = Math.floor(i / offsets.length);
      const microShift = cycle * (360.0 / (count * 2.0));
      const h = wrapHue(baseHue + baseOffset + microShift);

      const target = profile.hueBias(h);

      let lRatio;
      let cRatio;
      if (i === 0) {
        lRatio = 0.50;
        cRatio = 0.85;
      } else {
        const factor = i % 2 === 1 ? 1 : -1;
        const step = Math.min(0.42, 0.16 + i * 0.05);
        lRatio = Math.max(0, Math.min(1, 0.50 + factor * step));
        cRatio = Math.max(0, Math.min(1, 0.75 - (i % 3) * 0.15));
      }

      const lSpread = profile.lMax - profile.lMin;
      const cSpread = profile.cMax - profile.cMin;

      const rawL = profile.lMin + lSpread * (0.60 * lRatio + 0.40 * ((target.targetL - profile.lMin) / lSpread));
      const rawC = profile.cMin + cSpread * (0.50 * cRatio + 0.50 * ((target.targetC - profile.cMin) / cSpread));

      const fitted = fitIntoSrgbGamut({ l: rawL, c: rawC, h });
      const rgb = oklchToRgb(fitted);
      const hex = rgbToHex(rgb);

      palette.push({
        oklch: fitted,
        rgb,
        hex,
        cssOklch: `oklch(${(fitted.l * 100).toFixed(2)}% ${fitted.c.toFixed(4)} ${fitted.h.toFixed(2)}deg)`,
        isLocked: false,
      });
    }

    return palette;
  }

  return {
    PROFILES,
    getHarmonyOffsets,
    generatePalette,
  };
});
