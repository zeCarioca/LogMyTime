/**
 * ============================================================================
 * Algorithmic Palette Generator (Oklch Color Model)
 * ============================================================================
 * 
 * Coordinate System:
 *   - L (Lightness): [0, 1] - Perceived brightness
 *   - C (Chroma):    [0, ~0.37+] - Purity / Saturation
 *   - H (Hue):       [0°, 360°) - Euclidean angular direction
 * 
 * Pure Math Foundations:
 * 
 * 1. Forward Transform (Linear sRGB -> LMS -> Oklab -> Oklch):
 *    - Linear sRGB to LMS cone space:
 *        [l]   [ 0.4122214708  0.5363325363  0.0514459929 ] [r_linear]
 *        [m] = [ 0.2119034982  0.6806995451  0.1073969566 ] [g_linear]
 *        [s]   [ 0.0883024619  0.2817188376  0.6299787005 ] [b_linear]
 * 
 *    - Non-linear cone companding:
 *        l' = cbrt(l),  m' = cbrt(m),  s' = cbrt(s)
 * 
 *    - LMS' to Cartesian Oklab (L, a, b):
 *        [L]   [ 0.2104542553  0.7936177850 -0.0040720468 ] [l']
 *        [a] = [ 1.9779984951 -2.4285922050  0.4505937099 ] [m']
 *        [b]   [ 0.0259040371  0.7827717662 -0.8086757660 ] [s']
 * 
 *    - Cartesian Oklab to Cylindrical Oklch:
 *        C = sqrt(a^2 + b^2)
 *        H = wrapHue(atan2(b, a) * (180 / π))
 * 
 * 2. Reverse Transform (Oklch -> Oklab -> LMS -> Linear sRGB -> sRGB):
 *    - Cylindrical Oklch to Cartesian Oklab:
 *        a = C * cos(H_rad)
 *        b = C * sin(H_rad)
 * 
 *    - Inverse M2 (Oklab -> Non-linear LMS'):
 *        [l']   [ 1.0  0.3963377774  0.2158037573 ] [L]
 *        [m'] = [ 1.0 -0.1055613458 -0.0638541728 ] [a]
 *        [s']   [ 1.0 -0.0894841775 -1.2914855480 ] [b]
 * 
 *    - De-companding:
 *        l = (l')^3,  m = (m')^3,  s = (s')^3
 * 
 *    - Inverse M1 (LMS -> Linear sRGB):
 *        [r_linear]   [  4.0767416621 -3.3077115913  0.2309699292 ] [l]
 *        [g_linear] = [ -1.2684380046  2.6097574011 -0.3413193965 ] [m]
 *        [b_linear]   [ -0.0041960863 -0.7034186147  1.7076147010 ] [s]
 * 
 *    - Linear sRGB to standard encoded sRGB:
 *        C_srgb = 12.92 * C_linear                        if C_linear <= 0.0031308
 *        C_srgb = 1.055 * (C_linear)^(1/2.4) - 0.055      if C_linear > 0.0031308
 * 
 * 3. Gamut Protection:
 *    - Binary Search Chroma contraction: C ∈ [0, C_target] to find the maximum in-gamut saturation.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface Oklch {
  l: number; // Lightness [0, 1]
  c: number; // Chroma [0, ~0.37+]
  h: number; // Hue in degrees [0, 360)
}

export interface Oklab {
  L: number;
  a: number;
  b: number;
}

export interface RGB {
  r: number; // [0, 1]
  g: number; // [0, 1]
  b: number; // [0, 1]
}

export interface ColorEntry {
  oklch: Oklch;
  rgb: RGB;
  hex: string;
  css: string;
}

export type HarmonicHarmony =
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'triadic'
  | 'split-complementary'
  | 'tetradic';

export type AestheticProfile =
  | 'pastel'
  | 'vibrant'
  | 'neon'
  | 'deep-jewel'
  | 'muted-earthy';

export interface ProfileBoundingBox {
  lMin: number;
  lMax: number;
  cMin: number;
  cMax: number;
  hueDependentTarget: (hue: number) => { targetL: number; targetC: number };
}

// ============================================================================
// Matrix Constants (Björn Ottosson, 2020)
// ============================================================================

/** Linear sRGB to LMS Matrix */
export const M1 = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
] as const;

/** Non-linear LMS to Oklab Matrix */
export const M2 = [
  [0.2104542553, 0.7936177850, -0.0040720468],
  [1.9779984951, -2.4285922050, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.8086757660],
] as const;

/** Inverse M2: Oklab to Non-linear LMS */
export const M2_INV = [
  [1.0,  0.3963377774,  0.2158037573],
  [1.0, -0.1055613458, -0.0638541728],
  [1.0, -0.0894841775, -1.2914855480],
] as const;

/** Inverse M1: LMS to Linear sRGB */
export const M1_INV = [
  [ 4.0767416621, -3.3077115913,  0.2309699292],
  [-1.2684380046,  2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147,  1.7076147010],
] as const;

// ============================================================================
// Core Mathematical Foundations & Color Transformations
// ============================================================================

/**
 * Enforces Euclidean modular angle wrapping:
 * wrapHue(θ) = ((θ % 360) + 360) % 360
 */
export function wrapHue(theta: number): number {
  return ((theta % 360) + 360) % 360;
}

/**
 * Converts standard sRGB component [0, 1] to Linear sRGB
 */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts Linear sRGB component to standard sRGB [0, 1]
 */
export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1.0 / 2.4) - 0.055;
}

/**
 * Transforms Linear sRGB [r, g, b] to Oklab
 */
export function linearRgbToOklab(r: number, g: number, b: number): Oklab {
  // Step 1: Linear sRGB -> LMS
  const l = M1[0][0] * r + M1[0][1] * g + M1[0][2] * b;
  const m = M1[1][0] * r + M1[1][1] * g + M1[1][2] * b;
  const s = M1[2][0] * r + M1[2][1] * g + M1[2][2] * b;

  // Step 2: Cone non-linearity (cubic root)
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // Step 3: LMS' -> Oklab
  const L = M2[0][0] * l_ + M2[0][1] * m_ + M2[0][2] * s_;
  const a = M2[1][0] * l_ + M2[1][1] * m_ + M2[1][2] * s_;
  const bOklab = M2[2][0] * l_ + M2[2][1] * m_ + M2[2][2] * s_;

  return { L, a, b: bOklab };
}

/**
 * Transforms Cartesian Oklab to Cylindrical Oklch
 */
export function oklabToOklch(lab: Oklab): Oklch {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  const hRad = Math.atan2(lab.b, lab.a);
  const hDeg = (hRad * 180.0) / Math.PI;

  return {
    l: lab.L,
    c: c,
    h: wrapHue(hDeg),
  };
}

/**
 * Transforms Cylindrical Oklch to Cartesian Oklab
 */
export function oklchToOklab(lch: Oklch): Oklab {
  const hRad = (wrapHue(lch.h) * Math.PI) / 180.0;
  return {
    L: lch.l,
    a: lch.c * Math.cos(hRad),
    b: lch.c * Math.sin(hRad),
  };
}

/**
 * Transforms Cartesian Oklab to Linear sRGB components [r, g, b]
 */
export function oklabToLinearRgb(lab: Oklab): [number, number, number] {
  // Step 1: Oklab -> non-linear LMS'
  const l_ = M2_INV[0][0] * lab.L + M2_INV[0][1] * lab.a + M2_INV[0][2] * lab.b;
  const m_ = M2_INV[1][0] * lab.L + M2_INV[1][1] * lab.a + M2_INV[1][2] * lab.b;
  const s_ = M2_INV[2][0] * lab.L + M2_INV[2][1] * lab.a + M2_INV[2][2] * lab.b;

  // Step 2: Invert cone non-linearity
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Step 3: LMS -> Linear sRGB
  const rLinear = M1_INV[0][0] * l + M1_INV[0][1] * m + M1_INV[0][2] * s;
  const gLinear = M1_INV[1][0] * l + M1_INV[1][1] * m + M1_INV[1][2] * s;
  const bLinear = M1_INV[2][0] * l + M1_INV[2][1] * m + M1_INV[2][2] * s;

  return [rLinear, gLinear, bLinear];
}

/**
 * Full Reverse Transform: Oklch to Clamped sRGB [0, 1]
 */
export function oklchToRgb(lch: Oklch): RGB {
  const lab = oklchToOklab(lch);
  const [rLin, gLin, bLin] = oklabToLinearRgb(lab);

  return {
    r: Math.min(1, Math.max(0, linearToSrgb(rLin))),
    g: Math.min(1, Math.max(0, linearToSrgb(gLin))),
    b: Math.min(1, Math.max(0, linearToSrgb(bLin))),
  };
}

/**
 * Evaluates whether an Oklch color falls inside the sRGB gamut
 */
export function isInSrgbGamut(lch: Oklch, tolerance: number = 0.0001): boolean {
  const lab = oklchToOklab(lch);
  const [rLin, gLin, bLin] = oklabToLinearRgb(lab);
  const r = linearToSrgb(rLin);
  const g = linearToSrgb(gLin);
  const b = linearToSrgb(bLin);

  const minV = -tolerance;
  const maxV = 1.0 + tolerance;
  return r >= minV && r <= maxV && g >= minV && g <= maxV && b >= minV && b <= maxV;
}

/**
 * Gamut Boundary Protection:
 * Performs an iterative binary search along the Chroma axis (holding L and H constant)
 * to project out-of-gamut colors to the exact sRGB gamut boundary.
 */
export function fitIntoSrgbGamut(target: Oklch, iterations: number = 24): Oklch {
  if (target.l <= 0) return { l: 0, c: 0, h: target.h };
  if (target.l >= 1) return { l: 1, c: 0, h: target.h };

  if (isInSrgbGamut(target)) {
    return { ...target };
  }

  let lowC = 0.0;
  let highC = target.c;
  let maxValidC = 0.0;

  for (let i = 0; i < iterations; i++) {
    const midC = (lowC + highC) * 0.5;
    const testColor: Oklch = { l: target.l, c: midC, h: target.h };

    if (isInSrgbGamut(testColor)) {
      maxValidC = midC;
      lowC = midC; // Expand outward
    } else {
      highC = midC; // Contract inward
    }
  }

  return {
    l: target.l,
    c: maxValidC,
    h: target.h,
  };
}

// ============================================================================
// Five Aesthetic Profiles (Bounding Boxes & Optical Hue Dependencies)
// ============================================================================

export const AESTHETIC_PROFILES: Record<AestheticProfile, ProfileBoundingBox> = {
  /**
   * 1. Pastel Profile:
   * High perceived lightness, delicate saturation, smooth and airy contrast.
   */
  pastel: {
    lMin: 0.82,
    lMax: 0.94,
    cMin: 0.035,
    cMax: 0.10,
    hueDependentTarget: (h: number) => {
      // Warm yellow/orange hues reach gamut limits at slightly lower lightness
      const isWarmYellow = h >= 50 && h <= 110;
      return {
        targetL: isWarmYellow ? 0.87 : 0.89,
        targetC: 0.065,
      };
    },
  },

  /**
   * 2. Vibrant Profile:
   * Balanced mid-lightness with high chroma pushed toward the sRGB gamut edge.
   */
  vibrant: {
    lMin: 0.58,
    lMax: 0.76,
    cMin: 0.18,
    cMax: 0.28,
    hueDependentTarget: (h: number) => {
      // High-efficiency yellow/lime/green hues have naturally higher lightness in sRGB
      const isYellowGreen = h >= 95 && h <= 145;
      return {
        targetL: isYellowGreen ? 0.74 : 0.65,
        targetC: 0.25,
      };
    },
  },

  /**
   * 3. Neon Profile:
   * High lightness & maximum chroma, clustered along human luminescent peaks:
   * Yellow (~100°), Lime (~135°), Cyan (~195°), Magenta (~325°).
   */
  neon: {
    lMin: 0.78,
    lMax: 0.93,
    cMin: 0.20,
    cMax: 0.35,
    hueDependentTarget: (h: number) => {
      const fluorescentHues = [100, 135, 195, 325];
      let shortestDistance = 360;
      for (const fHue of fluorescentHues) {
        const rawDiff = Math.abs(wrapHue(h - fHue));
        const circularDiff = Math.min(rawDiff, 360 - rawDiff);
        if (circularDiff < shortestDistance) shortestDistance = circularDiff;
      }
      const resonance = Math.max(0, 1.0 - shortestDistance / 45.0);
      return {
        targetL: 0.82 + resonance * 0.09,
        targetC: 0.22 + resonance * 0.10,
      };
    },
  },

  /**
   * 4. Deep / Jewel Profile:
   * Low lightness, rich chroma, intense gemstone pigment concentration.
   */
  'deep-jewel': {
    lMin: 0.25,
    lMax: 0.44,
    cMin: 0.12,
    cMax: 0.22,
    hueDependentTarget: () => ({
      targetL: 0.34,
      targetC: 0.17,
    }),
  },

  /**
   * 5. Muted / Earthy Profile:
   * Mid-to-low lightness, understated chroma, organic warmth (ochre, clay, sage).
   */
  'muted-earthy': {
    lMin: 0.40,
    lMax: 0.62,
    cMin: 0.03,
    cMax: 0.09,
    hueDependentTarget: (h: number) => {
      // Natural terracotta & ochre range [20° - 80°] sustains richer pigment
      const isWarmOchre = h >= 20 && h <= 80;
      return {
        targetL: isWarmOchre ? 0.52 : 0.47,
        targetC: isWarmOchre ? 0.08 : 0.05,
      };
    },
  },
};

// ============================================================================
// Harmonization Engine
// ============================================================================

/**
 * Returns angular rotational offsets for canonical harmonic geometries
 */
export function getHarmonicHueOffsets(harmony: HarmonicHarmony): number[] {
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
  }
}

/**
 * Converts RGB components to hexadecimal color string
 */
function rgbToHex(rgb: RGB): string {
  const r = Math.round(rgb.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(rgb.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(rgb.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Algorithmic Palette Generator
 * 
 * Generates an optically balanced palette based on:
 *   1. Base hue angular anchor.
 *   2. Harmonic geometric angle vectors.
 *   3. Profile bounding box and hue-specific optimal targets.
 *   4. Dynamic lightness/chroma hierarchical distribution to eliminate optical competition.
 *   5. Strict gamut protection via binary search chroma clipping.
 */
export function generatePalette(options: {
  baseHue: number;
  harmony: HarmonicHarmony;
  profile: AestheticProfile;
  count?: number;
}): ColorEntry[] {
  const { baseHue, harmony, profile, count = 5 } = options;
  const profileConfig = AESTHETIC_PROFILES[profile];
  const harmonicOffsets = getHarmonicHueOffsets(harmony);

  const palette: ColorEntry[] = [];

  for (let i = 0; i < count; i++) {
    // 1. Calculate hue vector with micro-shift if index exceeds harmony vector count
    const baseOffset = harmonicOffsets[i % harmonicOffsets.length];
    const cycle = Math.floor(i / harmonicOffsets.length);
    const microAngle = cycle * (360.0 / (count * 2.0));
    const h = wrapHue(baseHue + baseOffset + microAngle);

    // 2. Query profile target parameters
    const target = profileConfig.hueDependentTarget(h);

    // 3. Dynamic Visual Hierarchy Distribution
    // Prevents equal optical weights across indices (Index 0 = Primary/Hero tone)
    let lRatio: number;
    let cRatio: number;

    if (i === 0) {
      // Primary anchor tone
      lRatio = 0.50;
      cRatio = 0.85;
    } else {
      // Alternating step modulation across secondary and accent colors
      const alternatingFactor = i % 2 === 1 ? 1 : -1;
      const stepMagnitude = Math.min(0.42, 0.16 + i * 0.05);
      lRatio = Math.max(0, Math.min(1, 0.50 + alternatingFactor * stepMagnitude));
      cRatio = Math.max(0, Math.min(1, 0.75 - (i % 3) * 0.15));
    }

    // Interpolate Lightness and Chroma within bounding box
    const lSpread = profileConfig.lMax - profileConfig.lMin;
    const cSpread = profileConfig.cMax - profileConfig.cMin;

    const rawL = profileConfig.lMin + lSpread * (0.60 * lRatio + 0.40 * ((target.targetL - profileConfig.lMin) / lSpread));
    const rawC = profileConfig.cMin + cSpread * (0.50 * cRatio + 0.50 * ((target.targetC - profileConfig.cMin) / cSpread));

    // 4. Gamut Boundary Protection
    const fitted = fitIntoSrgbGamut({ l: rawL, c: rawC, h });
    const rgb = oklchToRgb(fitted);
    const hex = rgbToHex(rgb);
    const css = `oklch(${(fitted.l * 100).toFixed(2)}% ${fitted.c.toFixed(4)} ${fitted.h.toFixed(2)}deg)`;

    palette.push({
      oklch: {
        l: Number(fitted.l.toFixed(4)),
        c: Number(fitted.c.toFixed(4)),
        h: Number(fitted.h.toFixed(2)),
      },
      rgb: {
        r: Number(rgb.r.toFixed(4)),
        g: Number(rgb.g.toFixed(4)),
        b: Number(rgb.b.toFixed(4)),
      },
      hex,
      css,
    });
  }

  return palette;
}
