import React, { useState } from 'react';

interface SavedPalettesProps {
  accentHue: number;
  savedPalettes: Array<{ id: string; name: string; hue: number }>;
  onSelectHue: (hue: number) => void;
  onSavePalette: (name: string) => void;
  onDeletePalette: (id: string) => void;
}

export const SavedPalettes: React.FC<SavedPalettesProps> = ({
  accentHue,
  savedPalettes,
  onSelectHue,
  onSavePalette,
  onDeletePalette,
}) => {
  const [newPaletteName, setNewPaletteName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaletteName.trim()) return;
    onSavePalette(newPaletteName.trim());
    setNewPaletteName('');
  };

  return (
    <div className="saved-palettes-card card">
      <div className="card-header-row" onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
        <h2 className="card-title">Saved Palettes ({savedPalettes.length})</h2>
        <button className="btn btn-sm btn-icon" aria-label="Toggle container">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="palettes-content">
          <form onSubmit={handleSave} className="palette-save-form">
            <input
              type="text"
              placeholder="Palette Name..."
              value={newPaletteName}
              onChange={(e) => setNewPaletteName(e.target.value)}
              className="input input-sm"
            />
            <button type="submit" className="btn btn-sm btn-primary">
              Save Current ({accentHue}°)
            </button>
          </form>

          <div className="palettes-grid">
            {savedPalettes.map((p) => (
              <div
                key={p.id}
                className={`palette-chip ${accentHue === p.hue ? 'active' : ''}`}
                onClick={() => onSelectHue(p.hue)}
              >
                <div className="chip-dot" style={{ backgroundColor: `oklch(0.65 0.22 ${p.hue})` }} />
                <span className="chip-name">{p.name}</span>
                <span className="chip-hue">{p.hue}°</span>
                <button
                  type="button"
                  className="chip-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePalette(p.id);
                  }}
                  title="Delete Palette"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
