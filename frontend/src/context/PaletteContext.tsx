import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Oklch, OklchPaletteGenerator, PaletteProfile, HarmonyType } from '../utils/OklchPaletteGenerator';

interface PaletteState {
  baseHue: number;
  profile: PaletteProfile;
  harmony: HarmonyType;
  currentPalette: Oklch[];
  isOpen: boolean;
}

interface PaletteContextType extends PaletteState {
  setBaseHue: (hue: number) => void;
  setProfile: (profile: PaletteProfile) => void;
  setHarmony: (harmony: HarmonyType) => void;
  generate: () => void;
  toggleWidget: () => void;
}

const defaultState: PaletteState = {
  baseHue: 260,
  profile: 'vibrant',
  harmony: 'analogous',
  currentPalette: [],
  isOpen: false,
};

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

export const PaletteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PaletteState>(() => {
    const saved = localStorage.getItem('lmt_palette_generator_state');
    return saved ? JSON.parse(saved) : defaultState;
  });

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('lmt_palette_generator_state', JSON.stringify(state));
  }, [state]);

  const generate = useCallback(() => {
    const palette = OklchPaletteGenerator.generatePalette(state.baseHue, state.profile, state.harmony);
    setState(prev => ({ ...prev, currentPalette: palette }));
  }, [state.baseHue, state.profile, state.harmony]);

  // Initial generation if empty
  useEffect(() => {
    if (state.currentPalette.length === 0) {
      generate();
    }
  }, [state.currentPalette.length, generate]);

  const setBaseHue = (hue: number) => setState(prev => ({ ...prev, baseHue: hue }));
  const setProfile = (profile: PaletteProfile) => setState(prev => ({ ...prev, profile }));
  const setHarmony = (harmony: HarmonyType) => setState(prev => ({ ...prev, harmony }));
  const toggleWidget = () => setState(prev => ({ ...prev, isOpen: !prev.isOpen }));

  // Apply the first color as the primary hue for the app (integration with useTheme concept)
  // Actually, wait, useTheme already controls --primary-hue. We can just set CSS variables for the palette here:
  useEffect(() => {
    if (state.currentPalette.length > 0) {
      state.currentPalette.forEach((color, index) => {
        document.documentElement.style.setProperty(
          `--palette-color-${index}`, 
          OklchPaletteGenerator.formatOklch(color)
        );
      });
      // Optionally override --primary if requested, but let's just expose them as --palette-color-X for now.
    }
  }, [state.currentPalette]);

  return (
    <PaletteContext.Provider value={{ ...state, setBaseHue, setProfile, setHarmony, generate, toggleWidget }}>
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
