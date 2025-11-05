import React from 'react';

interface SiteTitleSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const SiteTitleSettings: React.FC<SiteTitleSettingsProps> = ({ settings, onChange }) => {
  const text = settings.text || '';
  const showTagline = settings.showTagline !== false;
  const typography = settings.typography?.fontSize || 'medium';
  const isLink = settings.isLink !== false;

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Site Title Settings</h4>

      {/* Site Title Text */}
      <div className="inspector-field">
        <label className="inspector-label">Site Title</label>
        <input
          type="text"
          className="inspector-input"
          value={text}
          onChange={(e) => onChange('text', e.target.value)}
          placeholder="Enter site title..."
        />
        <p className="inspector-help">Leave empty to use default site title</p>
      </div>

      {/* Show Tagline */}
      <div className="inspector-field">
        <label className="inspector-checkbox-label">
          <input
            type="checkbox"
            checked={showTagline}
            onChange={(e) => onChange('showTagline', e.target.checked)}
          />
          <span>Show Tagline</span>
        </label>
        <p className="inspector-help">Display site tagline below the title</p>
      </div>

      {/* Typography */}
      <div className="inspector-field">
        <label className="inspector-label">Font Size</label>
        <select
          className="inspector-select"
          value={typography}
          onChange={(e) => onChange('typography', { fontSize: e.target.value })}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      {/* Is Link */}
      <div className="inspector-field">
        <label className="inspector-checkbox-label">
          <input
            type="checkbox"
            checked={isLink}
            onChange={(e) => onChange('isLink', e.target.checked)}
          />
          <span>Link to Homepage</span>
        </label>
        <p className="inspector-help">Make title clickable and link to homepage</p>
      </div>
    </div>
  );
};
