import React from 'react';
import { usePaletteGenerator } from '../../context/PaletteContext';
import { OklchPaletteGenerator } from '../../utils/OklchPaletteGenerator';

const FUNNY_PHRASES = [
  "git push --force",
  "LGTM",
  "YOLO",
  "Ship It!",
  "It works on my machine",
  "Roll the dice",
  "Reticulating splines",
  "sudo make me a palette",
  "Drop tables",
  "Panic!",
  "Blame the intern",
  "Have you tried turning it off and on?",
  "That's a feature, not a bug",
  "Copying from StackOverflow...",
  "npm install colors",
  "Waking up the hamsters",
  "rm -rf /node_modules",
  "undefined is not a function",
  "Let's fix it in prod",
  "I'll write tests later",
  "git commit -m 'stuff'",
  "Compiling...",
  "Deploy on Friday",
  "Works locally",
  "418 I'm a teapot",
  "Escaping VIM...",
  "git blame",
  "A wild bug appears!"
];

const ColorSwatch: React.FC<{ color: any, idx: number, locked: boolean, toggleLock: () => void, openEditor: () => void }> = ({ color, idx, locked, toggleLock, openEditor }) => {
  const [hovered, setHovered] = React.useState(false);
  const isLight = color.l > 0.6;
  const iconColor = isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={openEditor}
      style={{
        flex: 1,
        backgroundColor: `oklch(${OklchPaletteGenerator.formatOklch(color)})`,
        transition: 'background-color 0.3s ease',
        cursor: 'pointer',
        position: 'relative'
      }}
      title={`oklch(${OklchPaletteGenerator.formatOklch(color)}) - Click to edit, click lock to toggle`}
    >
      {(hovered || locked) && (
        <svg 
           onClick={(e) => { e.stopPropagation(); toggleLock(); }}
           style={{ position: 'absolute', top: '4px', right: '4px', color: iconColor }} 
           width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          {locked ? (
            <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></>
          ) : (
            <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></>
          )}
        </svg>
      )}
    </div>
  );
};

const ColorEditorPopover: React.FC<{
  index: number;
  color: any;
  onChange: (color: any) => void;
  onClose: () => void;
}> = ({ index, color, onChange, onClose }) => {
  const [hexInput, setHexInput] = React.useState(OklchPaletteGenerator.oklchToHex(color));

  React.useEffect(() => {
    setHexInput(OklchPaletteGenerator.oklchToHex(color));
  }, [color.l, color.c, color.h]);

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
      onChange(OklchPaletteGenerator.hexToOklch(val));
    }
  };

  return (
    <div className="card" style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: '10px',
      width: '100%',
      zIndex: 1010,
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8rem',
      boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Edit Tone {index}</h4>
        <button className="btn btn-xs btn-outline" onClick={onClose}>✕</button>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Lightness</span> <span>{Math.round(color.l * 100)}%</span>
        </label>
        <input type="range" min="0" max="1" step="0.01" value={color.l} onChange={e => onChange({...color, l: Number(e.target.value)})} style={{width: '100%'}}/>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Chroma</span> <span>{color.c.toFixed(2)}</span>
        </label>
        <input type="range" min="0" max="0.4" step="0.01" value={color.c} onChange={e => onChange({...color, c: Number(e.target.value)})} style={{width: '100%'}}/>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Hue</span> <span>{Math.round(color.h)}°</span>
        </label>
        <input type="range" min="0" max="360" step="1" value={color.h} onChange={e => onChange({...color, h: Number(e.target.value)})} style={{width: '100%'}}/>
      </div>

      <div className="form-group" style={{ marginBottom: 0, marginTop: '0.5rem' }}>
        <label style={{ fontSize: '0.75rem' }}>HEX Code</label>
        <input type="text" className="form-control" value={hexInput} onChange={e => handleHexChange(e.target.value)} style={{ fontFamily: 'monospace', padding: '0.3rem' }}/>
      </div>
    </div>
  );
};

export const PaletteGeneratorWidget: React.FC = () => {
  const [saveName, setSaveName] = React.useState('');
  const [randomText, setRandomText] = React.useState(() => FUNNY_PHRASES[Math.floor(Math.random() * FUNNY_PHRASES.length)]);
  const [activeEditorIndex, setActiveEditorIndex] = React.useState<number | null>(null);
  const {
    isOpen, toggleWidget,
    baseHue, setBaseHue,
    profile, setProfile,
    harmony, setHarmony,
    currentPalette,
    lockedColors, toggleColorLock, setSpecificColor,
    savedPalettes, saveCurrentPalette, loadPalette, deletePalette
  } = usePaletteGenerator();

  const handleRandomize = () => {
    const profiles: any[] = ['pastel', 'vibrant', 'neon', 'deep', 'muted'];
    const harmonies: any[] = ['analogous', 'complementary', 'triadic', 'split-complementary', 'tetradic'];
    
    setBaseHue(Math.floor(Math.random() * 361));
    setProfile(profiles[Math.floor(Math.random() * profiles.length)]);
    setHarmony(harmonies[Math.floor(Math.random() * harmonies.length)]);
    
    let newPhrase;
    do {
      newPhrase = FUNNY_PHRASES[Math.floor(Math.random() * FUNNY_PHRASES.length)];
    } while (newPhrase === randomText);
    setRandomText(newPhrase);
  };

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

      <button className="btn btn-outline" onClick={handleRandomize} style={{ width: '100%', fontStyle: 'italic', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
        {randomText}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', position: 'relative' }}>
        <div style={{ display: 'flex', height: '50px', borderRadius: '8px', overflow: 'hidden' }}>
          {currentPalette.map((color, idx) => (
            <ColorSwatch 
              key={idx} 
              color={color} 
              idx={idx} 
              locked={lockedColors[idx]} 
              toggleLock={() => toggleColorLock(idx)} 
              openEditor={() => setActiveEditorIndex(activeEditorIndex === idx ? null : idx)}
            />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${currentPalette.length}, 1fr)`, gap: '4px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {currentPalette.map((color, idx) => (
            <span key={idx}>L:{Math.round(color.l * 100)} C:{color.c.toFixed(2)}</span>
          ))}
        </div>

        {activeEditorIndex !== null && currentPalette[activeEditorIndex] && (
          <ColorEditorPopover 
            index={activeEditorIndex}
            color={currentPalette[activeEditorIndex]}
            onChange={(c) => setSpecificColor(activeEditorIndex, c)}
            onClose={() => setActiveEditorIndex(null)}
          />
        )}
      </div>

      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Saved Palettes</h4>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Palette Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveCurrentPalette(saveName);
                setSaveName('');
              }
            }}
            className="form-control"
            style={{ flex: 1, padding: '0.4rem' }}
          />
          <button
            className="btn btn-outline"
            onClick={() => { saveCurrentPalette(saveName); setSaveName(''); }}
          >
            Save
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
          {savedPalettes.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.85rem' }}>{p.name}</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button className="btn btn-xs btn-primary" onClick={() => loadPalette(p.id)}>Load</button>
                <button className="btn btn-xs btn-danger" onClick={() => deletePalette(p.id)}>✕</button>
              </div>
            </div>
          ))}
          {savedPalettes.length === 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No saved palettes.</div>
          )}
        </div>
      </div>

    </div>
  );
};
