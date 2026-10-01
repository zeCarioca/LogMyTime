export type Oklch = { l: number; c: number; h: number };
export type Rgb = { r: number; g: number; b: number };
export type PaletteProfile = 'pastel' | 'vibrant' | 'neon' | 'deep' | 'muted';
export type HarmonyType = 'analogous' | 'complementary' | 'triadic' | 'split-complementary' | 'tetradic';

export class OklchPaletteGenerator {
  
  // ==========================================
  // Core Math & Transformations
  // ==========================================
  
  public static wrapHue(hue: number): number {
    return ((hue % 360) + 360) % 360;
  }

  public static oklchToOklab(oklch: Oklch) {
    const hRad = (oklch.h * Math.PI) / 180;
    return {
      L: oklch.l,
      a: oklch.c * Math.cos(hRad),
      b: oklch.c * Math.sin(hRad)
    };
  }

  public static oklabToLinearSrgb({ L, a, b }: { L: number; a: number; b: number }) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    return {
      r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    };
  }

  public static linearToSrgb(c: number): number {
    const abs = Math.abs(c);
    const val = abs > 0.0031308 ? 1.055 * Math.pow(abs, 1 / 2.4) - 0.055 : 12.92 * abs;
    return c < 0 ? -val : val;
  }

  public static oklchToSrgb(oklch: Oklch): Rgb {
    const oklab = this.oklchToOklab(oklch);
    const lin = this.oklabToLinearSrgb(oklab);
    return {
      r: this.linearToSrgb(lin.r),
      g: this.linearToSrgb(lin.g),
      b: this.linearToSrgb(lin.b)
    };
  }

  public static isWithinSrgbGamut(rgb: Rgb): boolean {
    return (
      rgb.r >= 0 && rgb.r <= 1 &&
      rgb.g >= 0 && rgb.g <= 1 &&
      rgb.b >= 0 && rgb.b <= 1
    );
  }

  public static clipToGamut(oklch: Oklch): Oklch {
    let safeColor = { ...oklch };
    let rgb = this.oklchToSrgb(safeColor);
    
    // Iteratively reduce chroma by 5% until it fits in sRGB gamut
    while (!this.isWithinSrgbGamut(rgb) && safeColor.c > 0.001) {
      safeColor.c *= 0.95;
      rgb = this.oklchToSrgb(safeColor);
    }
    
    return safeColor;
  }

  public static formatRgb(rgb: Rgb): string {
    const r = Math.round(Math.max(0, Math.min(1, rgb.r)) * 255);
    const g = Math.round(Math.max(0, Math.min(1, rgb.g)) * 255);
    const b = Math.round(Math.max(0, Math.min(1, rgb.b)) * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  public static formatOklch(oklch: Oklch): string {
    return `${Math.round(oklch.l * 100)}% ${oklch.c.toFixed(3)} ${Math.round(oklch.h)}`;
  }

  // ==========================================
  // Profiles & Generation
  // ==========================================

  private static getProfileBounds(profile: PaletteProfile) {
    switch (profile) {
      case 'pastel': return { lMin: 0.85, lMax: 0.95, cMin: 0.02, cMax: 0.08 };
      case 'vibrant': return { lMin: 0.55, lMax: 0.75, cMin: 0.15, cMax: 0.25 };
      case 'neon': return { lMin: 0.75, lMax: 0.90, cMin: 0.25, cMax: 0.35 };
      case 'deep': return { lMin: 0.25, lMax: 0.45, cMin: 0.10, cMax: 0.18 };
      case 'muted': return { lMin: 0.45, lMax: 0.65, cMin: 0.03, cMax: 0.09 };
      default: return { lMin: 0.5, lMax: 0.8, cMin: 0.05, cMax: 0.15 };
    }
  }

  private static applyHueClustering(profile: PaletteProfile, baseHue: number): number {
    if (profile === 'neon') {
      const targets = [120, 200, 320]; // Lime, Cyan, Magenta
      return targets.reduce((prev, curr) => 
        Math.abs(curr - baseHue) < Math.abs(prev - baseHue) ? curr : prev
      );
    }
    if (profile === 'muted') {
      // Force towards warm earthy tones if it strays too far into blues
      if (baseHue > 180 && baseHue < 320) return this.wrapHue(baseHue - 120);
    }
    return baseHue;
  }

  private static randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  // ==========================================
  // Harmonization Engine
  // ==========================================

  public static getHarmonicHues(baseHue: number, harmony: HarmonyType): number[] {
    switch (harmony) {
      case 'analogous': return [baseHue, baseHue + 30, baseHue + 60, baseHue - 30].map(this.wrapHue);
      case 'complementary': return [baseHue, baseHue + 180].map(this.wrapHue);
      case 'triadic': return [baseHue, baseHue + 120, baseHue + 240].map(this.wrapHue);
      case 'split-complementary': return [baseHue, baseHue + 150, baseHue + 210].map(this.wrapHue);
      case 'tetradic': return [baseHue, baseHue + 90, baseHue + 180, baseHue + 270].map(this.wrapHue);
      default: return [baseHue];
    }
  }

  public static generatePalette(
    baseHue: number, 
    profile: PaletteProfile, 
    harmony: HarmonyType
  ): Oklch[] {
    const bounds = this.getProfileBounds(profile);
    const clusteredHue = this.applyHueClustering(profile, baseHue);
    const hues = this.getHarmonicHues(clusteredHue, harmony);
    
    // Safely cycle through harmonic hues if we need more colors than the harmony provides
    const getHue = (idx: number) => hues[idx % hues.length];

    // Role 0: Primary Accent
    const c0 = this.clipToGamut({
      l: this.randomInRange(bounds.lMin, bounds.lMax),
      c: this.randomInRange(bounds.cMin, bounds.cMax),
      h: getHue(0)
    });

    // Role 1: Secondary/Hover (Slightly shifted L/C)
    const c1 = this.clipToGamut({
      l: Math.max(0, Math.min(1, c0.l + (c0.l > 0.8 ? -0.07 : 0.07))),
      c: Math.max(0, c0.c + (c0.c > 0.2 ? -0.02 : 0.02)),
      h: getHue(1)
    });

    // Role 2: Borders (Dark mid-tone, low chroma tinted by profile)
    const c2 = this.clipToGamut({
      l: 0.35,
      c: Math.min(bounds.cMax * 0.4, 0.06), 
      h: getHue(2)
    });

    // Role 3: App Body Background (Deep dark tone)
    const c3 = this.clipToGamut({
      l: 0.14,
      c: Math.min(bounds.cMax * 0.15, 0.025),
      h: getHue(3)
    });

    // Role 4: Card Background (Slightly lighter dark tone)
    const c4 = this.clipToGamut({
      l: 0.20,
      c: Math.min(bounds.cMax * 0.2, 0.035),
      h: getHue(4)
    });

    return [c0, c1, c2, c3, c4];
  }
}
