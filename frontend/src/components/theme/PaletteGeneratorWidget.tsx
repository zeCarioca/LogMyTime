import React from 'react';
import { usePaletteGenerator } from '../../context/PaletteContext';
import { OklchPaletteGenerator } from '../../utils/OklchPaletteGenerator';

export const PaletteGeneratorWidget: React.FC = () => {
  const { 
    isOpen, toggleWidget, 
    baseHue, setBaseHue, 
    profile, setProfile, 
    harmony, setHarmony, 
    currentPalette, generate 
  } = usePaletteGenerator();

  if (!isOpen) {
    return (
      <button 
        className="btn btn-primary" 
        style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        onClick={toggleWidget}
        title="Open Palette Generator"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
        </svg>
      </button>
    );
  }

  return (
    <div 
      className="card" 
      style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        width: '350px', 
        zIndex: 1000,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Palette Generator</h3>
        <button className="btn btn-outline" onClick={toggleWidget} style={{ padding: '0.2rem 0.5rem' }}>✕</button>
      </div>

      <div className="form-group">
        <label>Base Hue ({baseHue}°)</label>
        <input 
          type="range" 
          min="0" 
          max="360" 
          value={baseHue} 
          onChange={(e) => setBaseHue(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div className="form-group">
          <label>Profile</label>
          <select 
            value={profile} 
            onChange={(e) => setProfile(e.target.value as any)}
            className="input-field"
          >
            <option value="pastel">Pastel</option>
            <option value="vibrant">Vibrant</option>
            <option value="neon">Neon</option>
            <option value="deep">Deep/Jewel</option>
            <option value="muted">Muted/Earthy</option>
          </select>
        </div>

        <div className="form-group">
          <label>Harmony</label>
          <select 
            value={harmony} 
            onChange={(e) => setHarmony(e.target.value as any)}
            className="input-field"
          >
            <option value="analogous">Analogous</option>
            <option value="complementary">Complementary</option>
            <option value="triadic">Triadic</option>
            <option value="split-complementary">Split-Complementary</option>
            <option value="tetradic">Tetradic</option>
          </select>
        </div>
      </div>

      <button className="btn btn-primary" onClick={generate} style={{ width: '100%' }}>
        Regenerate
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', height: '50px', borderRadius: '8px', overflow: 'hidden' }}>
          {currentPalette.map((color, idx) => (
            <div 
              key={idx} 
              style={{ 
                flex: 1, 
                backgroundColor: OklchPaletteGenerator.formatOklch(color),
                transition: 'background-color 0.3s ease'
              }} 
              title={OklchPaletteGenerator.formatOklch(color)}
            />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${currentPalette.length}, 1fr)`, gap: '4px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {currentPalette.map((color, idx) => (
            <span key={idx}>L:{Math.round(color.l*100)} C:{color.c.toFixed(2)}</span>
          ))}
        </div>
      </div>

    </div>
  );
};
