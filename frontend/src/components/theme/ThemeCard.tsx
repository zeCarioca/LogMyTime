import React, { useState } from 'react';

export const ThemeCard: React.FC = () => {
  const [accentHue, setAccentHue] = useState<number>(260);

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hue = Number(e.target.value);
    setAccentHue(hue);
    document.documentElement.style.setProperty('--primary-hue', hue.toString());
  };

  return (
    <div className="theme-card card">
      <h2 className="card-title">Oklch Theme Palette</h2>
      <div className="theme-control">
        <label htmlFor="hue-slider">Accent Hue: {accentHue}°</label>
        <input
          id="hue-slider"
          type="range"
          min="0"
          max="360"
          value={accentHue}
          onChange={handleHueChange}
          className="hue-slider"
        />
      </div>
      <div className="swatches-preview">
        <div className="swatch primary" style={{ backgroundColor: `oklch(0.65 0.22 ${accentHue})` }} />
        <div className="swatch accent" style={{ backgroundColor: `oklch(0.75 0.18 ${(accentHue + 40) % 360})` }} />
        <div className="swatch muted" style={{ backgroundColor: `oklch(0.40 0.08 ${accentHue})` }} />
      </div>
    </div>
  );
};
