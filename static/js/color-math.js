/**
 * Pure Color Space Math Foundations (Björn Ottosson, 2020)
 * Linear sRGB <-> Oklab <-> Oklch & Gamut boundary projection.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ColorMathUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const M1 = [
    [0.4122214708, 0.5363325363, 0.0514459929],
    [0.2119034982, 0.6806995451, 0.1073969566],
    [0.0883024619, 0.2817188376, 0.6299787005],
  ];

  const M2 = [
    [0.2104542553, 0.7936177850, -0.0040720468],
    [1.9779984951, -2.4285922050, 0.4505937099],
    [0.0259040371, 0.7827717662, -0.8086757660],
  ];

  const M2_INV = [
    [1.0, 0.3963377774, 0.2158037573],
    [1.0, -0.1055613458, -0.0638541728],
    [1.0, -0.0894841775, -1.2914855480],
  ];

  const M1_INV = [
    [4.0767416621, -3.3077115913, 0.2309699292],
    [-1.2684380046, 2.6097574011, -0.3413193965],
    [-0.0041960863, -0.7034186147, 1.7076147010],
  ];

  function wrapHue(theta) {
    return ((theta % 360) + 360) % 360;
  }

  function linearToSrgb(c) {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1.0 / 2.4) - 0.055;
  }

  function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function oklchToOklab(lch) {
    const hRad = (wrapHue(lch.h) * Math.PI) / 180.0;
    return {
      L: lch.l,
      a: lch.c * Math.cos(hRad),
      b: lch.c * Math.sin(hRad),
    };
  }

  function oklabToOklch(lab) {
    const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    const hRad = Math.atan2(lab.b, lab.a);
    const hDeg = (hRad * 180.0) / Math.PI;
    return {
      l: lab.L,
      c: c,
      h: wrapHue(hDeg),
    };
  }

  function oklabToLinearRgb(lab) {
    const l_ = M2_INV[0][0] * lab.L + M2_INV[0][1] * lab.a + M2_INV[0][2] * lab.b;
    const m_ = M2_INV[1][0] * lab.L + M2_INV[1][1] * lab.a + M2_INV[1][2] * lab.b;
    const s_ = M2_INV[2][0] * lab.L + M2_INV[2][1] * lab.a + M2_INV[2][2] * lab.b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const rLin = M1_INV[0][0] * l + M1_INV[0][1] * m + M1_INV[0][2] * s;
    const gLin = M1_INV[1][0] * l + M1_INV[1][1] * m + M1_INV[1][2] * s;
    const bLin = M1_INV[2][0] * l + M1_INV[2][1] * m + M1_INV[2][2] * s;

    return [rLin, gLin, bLin];
  }

  function linearRgbToOklab(r, g, b) {
    const l = M1[0][0] * r + M1[0][1] * g + M1[0][2] * b;
    const m = M1[1][0] * r + M1[1][1] * g + M1[1][2] * b;
    const s = M1[2][0] * r + M1[2][1] * g + M1[2][2] * b;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    const L = M2[0][0] * l_ + M2[0][1] * m_ + M2[0][2] * s_;
    const a = M2[1][0] * l_ + M2[1][1] * m_ + M2[1][2] * s_;
    const bOklab = M2[2][0] * l_ + M2[2][1] * m_ + M2[2][2] * s_;

    return { L, a, b: bOklab };
  }

  function srgbToOklch(r, g, b) {
    const rLin = srgbToLinear(r);
    const gLin = srgbToLinear(g);
    const bLin = srgbToLinear(b);
    const lab = linearRgbToOklab(rLin, gLin, bLin);
    return oklabToOklch(lab);
  }

  function parseHex(hex) {
    let clean = (hex || '').replace(/^#/, '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (clean.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(clean)) {
      return null;
    }
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return { r, g, b, hex: `#${clean.toLowerCase()}` };
  }

  function isInSrgbGamut(lch, tol = 0.0001) {
    const lab = oklchToOklab(lch);
    const [rLin, gLin, bLin] = oklabToLinearRgb(lab);
    const r = linearToSrgb(rLin);
    const g = linearToSrgb(gLin);
    const b = linearToSrgb(bLin);
    const minV = -tol;
    const maxV = 1.0 + tol;
    return r >= minV && r <= maxV && g >= minV && g <= maxV && b >= minV && b <= maxV;
  }

  function fitIntoSrgbGamut(target, iterations = 24) {
    if (target.l <= 0) return { l: 0, c: 0, h: target.h };
    if (target.l >= 1) return { l: 1, c: 0, h: target.h };
    if (isInSrgbGamut(target)) return { ...target };

    let lowC = 0.0;
    let highC = target.c;
    let maxValidC = 0.0;

    for (let i = 0; i < iterations; i++) {
      const midC = (lowC + highC) * 0.5;
      const testColor = { l: target.l, c: midC, h: target.h };
      if (isInSrgbGamut(testColor)) {
        maxValidC = midC;
        lowC = midC;
      } else {
        highC = midC;
      }
    }

    return { l: target.l, c: maxValidC, h: target.h };
  }

  function oklchToRgb(lch) {
    const lab = oklchToOklab(lch);
    const [rLin, gLin, bLin] = oklabToLinearRgb(lab);
    return {
      r: Math.min(1, Math.max(0, linearToSrgb(rLin))),
      g: Math.min(1, Math.max(0, linearToSrgb(gLin))),
      b: Math.min(1, Math.max(0, linearToSrgb(bLin))),
    };
  }

  function rgbToHex(rgb) {
    const r = Math.round(rgb.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(rgb.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(rgb.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return {
    wrapHue,
    linearToSrgb,
    srgbToLinear,
    oklchToOklab,
    oklabToOklch,
    oklabToLinearRgb,
    linearRgbToOklab,
    srgbToOklch,
    parseHex,
    isInSrgbGamut,
    fitIntoSrgbGamut,
    oklchToRgb,
    rgbToHex,
  };
});
