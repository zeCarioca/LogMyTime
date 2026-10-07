import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Oklch, OklchPaletteGenerator, PaletteProfile, HarmonyType } from '../utils/OklchPaletteGenerator';

export interface SavedPalette {
  id: string;
  name: string;
  config: { baseHue: number; profile: PaletteProfile; harmony: HarmonyType };
}

interface PaletteState {
  baseHue: number;
  profile: PaletteProfile;
  harmony: HarmonyType;
  currentPalette: Oklch[];
  lockedColors: boolean[];
  isOpen: boolean;
  savedPalettes: SavedPalette[];
  glassAlpha?: number;
}

interface PaletteContextType extends PaletteState {
  setBaseHue: (hue: number) => void;
  setProfile: (profile: PaletteProfile) => void;
  setHarmony: (harmony: HarmonyType) => void;
  toggleColorLock: (index: number) => void;
  setSpecificColor: (index: number, color: Oklch) => void;
  generate: () => void;
  toggleWidget: () => void;
  saveCurrentPalette: (name: string) => void;
  loadPalette: (id: string) => void;
  deletePalette: (id: string) => void;
}

const defaultState: PaletteState = {
  baseHue: 260,
  profile: 'vibrant',
  harmony: 'analogous',
  currentPalette: [],
  lockedColors: [false, false, false, false, false],
  isOpen: false,
  savedPalettes: [
    { id: '1', name: 'Neon Cyber', config: { baseHue: 320, profile: 'neon', harmony: 'triadic' } },
    { id: '2', name: 'Forest Earth', config: { baseHue: 120, profile: 'muted', harmony: 'analogous' } },
    { id: '3', name: 'Ocean Depth', config: { baseHue: 240, profile: 'deep', harmony: 'complementary' } },
  ],
};

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

export const PaletteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PaletteState>(() => {
    const saved = localStorage.getItem('lmt_palette_generator_state_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultState,
          ...parsed,
          lockedColors: parsed.lockedColors ?? [false, false, false, false, false],
        };
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('lmt_palette_generator_state_v2', JSON.stringify(state));
  }, [state]);

  const generate = useCallback(() => {
    const generated = OklchPaletteGenerator.generatePalette(state.baseHue, state.profile, state.harmony);
    setState(prev => {
      const newPalette = generated.map((color, idx) => {
        if (prev.lockedColors && prev.lockedColors[idx] && prev.currentPalette[idx]) {
          return prev.currentPalette[idx];
        }
        return color;
      });
      return { ...prev, currentPalette: newPalette };
    });
  }, [state.baseHue, state.profile, state.harmony]);

  // Auto-generate whenever baseHue, profile, or harmony changes
  useEffect(() => {
    generate();
  }, [generate]);

  const setBaseHue = (hue: number) => setState(prev => ({ ...prev, baseHue: hue }));
  const setProfile = (profile: PaletteProfile) => setState(prev => ({ ...prev, profile }));
  const setHarmony = (harmony: HarmonyType) => setState(prev => ({ ...prev, harmony }));
  const toggleColorLock = (index: number) => {
    setState(prev => {
      const newLocks = [...(prev.lockedColors ?? [false, false, false, false, false])];
      newLocks[index] = !newLocks[index];
      return { ...prev, lockedColors: newLocks };
    });
  };
  const setSpecificColor = (index: number, color: Oklch) => {
    setState(prev => {
      const newPalette = [...prev.currentPalette];
      newPalette[index] = color;
      
      const newLocks = [...(prev.lockedColors ?? [false, false, false, false, false])];
      newLocks[index] = true;

      return { ...prev, currentPalette: newPalette, lockedColors: newLocks };
    });
  };
  const toggleWidget = () => setState(prev => ({ ...prev, isOpen: !prev.isOpen }));

  const saveCurrentPalette = (name: string) => {
    if (!name.trim()) return;
    const newPalette: SavedPalette = {
      id: Date.now().toString(),
      name: name.trim(),
      config: { baseHue: state.baseHue, profile: state.profile, harmony: state.harmony },
    };
    setState(prev => ({ ...prev, savedPalettes: [...prev.savedPalettes, newPalette] }));
  };

  const loadPalette = (id: string) => {
    const target = state.savedPalettes.find(p => p.id === id);
    if (target) {
      setState(prev => ({
        ...prev,
        baseHue: target.config.baseHue,
        profile: target.config.profile,
        harmony: target.config.harmony,
      }));
    }
  };

  const deletePalette = (id: string) => {
    setState(prev => ({
      ...prev,
      savedPalettes: prev.savedPalettes.filter(p => p.id !== id)
    }));
  };

  useEffect(() => {
    if (state.currentPalette.length > 0) {
      state.currentPalette.forEach((color, index) => {
        document.documentElement.style.setProperty(
          `--palette-color-${index}`,
          OklchPaletteGenerator.formatOklch(color)
        );
      });

      // Monochromatic Heatmap Scale (Interpolate between Card Bg [4] and Primary Accent [0])
      const c0 = state.currentPalette[0];
      const c4 = state.currentPalette[4];
      if (c0 && c4) {
        for (let i = 1; i <= 4; i++) {
          const factor = i / 4;
          const heatmapColor = {
            l: c4.l + (c0.l - c4.l) * factor,
            c: c4.c + (c0.c - c4.c) * factor,
            h: c0.h // strictly follow primary hue
          };
          document.documentElement.style.setProperty(
            `--heatmap-scale-${i}`,
            OklchPaletteGenerator.formatOklch(heatmapColor)
          );
        }
      }
    }
    document.documentElement.style.setProperty('--glass-alpha', (state.glassAlpha ?? 0.75).toString());
  }, [state.currentPalette, state.glassAlpha]);

  return (
    <PaletteContext.Provider value={{
      ...state,
      setBaseHue,
      setProfile,
      setHarmony,
      toggleColorLock,
      setSpecificColor,
      generate,
      toggleWidget,
      saveCurrentPalette,
      loadPalette,
      deletePalette
    }}>
      {children}
    </PaletteContext.Provider>
  );
};

export const usePaletteGenerator = (): PaletteContextType => {
  const context = useContext(PaletteContext);
  if (!context) {
    throw new Error('usePaletteGenerator must be used within a PaletteProvider');
  }
  return context;
};
