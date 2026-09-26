import { useState, useEffect, useCallback } from 'react';

export interface SavedPalette {
  id: string;
  name: string;
  hue: number;
}

const DEFAULT_PALETTES: SavedPalette[] = [
  { id: '1', name: 'Violet Spark', hue: 260 },
  { id: '2', name: 'Emerald Cyan', hue: 160 },
  { id: '3', name: 'Solar Sunset', hue: 35 },
  { id: '4', name: 'Neon Rose', hue: 330 },
];

export function useTheme() {
  const [accentHue, setAccentHue] = useState<number>(() => {
    const saved = localStorage.getItem('lmt_accent_hue');
    return saved ? Number(saved) : 260;
  });

  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(() => {
    const saved = localStorage.getItem('lmt_saved_palettes');
    return saved ? JSON.parse(saved) : DEFAULT_PALETTES;
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-hue', accentHue.toString());
    localStorage.setItem('lmt_accent_hue', accentHue.toString());
  }, [accentHue]);

  useEffect(() => {
    localStorage.setItem('lmt_saved_palettes', JSON.stringify(savedPalettes));
  }, [savedPalettes]);

  const updateHue = useCallback((hue: number) => {
    setAccentHue(hue);
  }, []);

  const saveCurrentPalette = useCallback((name: string) => {
    if (!name.trim()) return;

    const newPalette: SavedPalette = {
      id: Date.now().toString(),
      name: name.trim(),
      hue: accentHue,
    };
    setSavedPalettes((prev) => [...prev, newPalette]);
  }, [accentHue]);

  const deletePalette = useCallback((id: string) => {
    setSavedPalettes((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    accentHue,
    savedPalettes,
    updateHue,
    saveCurrentPalette,
    deletePalette,
  };
}
