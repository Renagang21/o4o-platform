import React from 'react';

interface CommonSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const CommonSettings: React.FC<CommonSettingsProps> = ({
  settings,
  onChange
}) => {
  const alignment = settings.alignment || 'left';
  const visibility = settings.visibility || { desktop: true, tablet: true, mobile: true };
  const spacing = settings.spacing || {
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 }
  };
  const className = settings.className || '';
  const ariaLabel = settings.ariaLabel || '';

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Common Settings</h4>

      {/* Alignment */}
      <div className="inspector-field">
        <label className="inspector-label">Alignment</label>
        <select
          className="inspector-select"
          value={alignment}
          onChange={(e) => onChange('alignment', e.target.value)}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Visibility */}
      <div className="inspector-field">
        <label className="inspector-label">Visibility</label>
        <div className="visibility-controls">
          <label className="visibility-option">
            <input
              type="checkbox"
              checked={visibility.desktop}
              onChange={(e) => onChange('visibility', {
                ...visibility,
                desktop: e.target.checked
              })}
            />
            <span>Desktop</span>
          </label>
          <label className="visibility-option">
            <input
              type="checkbox"
              checked={visibility.tablet}
              onChange={(e) => onChange('visibility', {
                ...visibility,
                tablet: e.target.checked
              })}
            />
            <span>Tablet</span>
          </label>
          <label className="visibility-option">
            <input
              type="checkbox"
              checked={visibility.mobile}
              onChange={(e) => onChange('visibility', {
                ...visibility,
                mobile: e.target.checked
              })}
            />
            <span>Mobile</span>
          </label>
        </div>
      </div>

      {/* Spacing - Margin */}
      <div className="inspector-field">
        <label className="inspector-label">Margin (px)</label>
        <div className="spacing-grid">
          <input
            type="number"
            placeholder="Top"
            value={spacing.margin.top}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              margin: { ...spacing.margin, top: parseInt(e.target.value) || 0 }
            })}
            className="inspector-input"
          />
          <input
            type="number"
            placeholder="Right"
            value={spacing.margin.right}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              margin: { ...spacing.margin, right: parseInt(e.target.value) || 0 }
            })}
            className="inspector-input"
          />
          <input
            type="number"
            placeholder="Bottom"
            value={spacing.margin.bottom}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              margin: { ...spacing.margin, bottom: parseInt(e.target.value) || 0 }
            })}
            className="inspector-input"
          />
          <input
            type="number"
            placeholder="Left"
            value={spacing.margin.left}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              margin: { ...spacing.margin, left: parseInt(e.target.value) || 0 }
            })}
            className="inspector-input"
          />
        </div>
      </div>

      {/* Spacing - Padding */}
      <div className="inspector-field">
        <label className="inspector-label">Padding (px)</label>
        <div className="spacing-grid">
          <input
            type="number"
            placeholder="Top"
            value={spacing.padding.top}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              padding: { ...spacing.padding, top: parseInt(e.target.value) || 0 }
            })}
            className="inspector-input"
          />
          <input
            type="number"
            placeholder="Right"
            value={spacing.padding.right}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              padding: { ...spacing.padding, right: parseInt(e.target.value) || 0 }
            })}
            className="inspector-input"
          />
          <input
            type="number"
            placeholder="Bottom"
            value={spacing.padding.bottom}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              padding: { ...spacing.padding, bottom: parseInt(e.target.value) || 0 }
            })}
            className="inspector-input"
          />
          <input
            type="number"
            placeholder="Left"
            value={spacing.padding.left}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              padding: { ...spacing.padding, left: parseInt(e.target.value) || 0 }
            })}
            className="inspector-input"
          />
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="inspector-field">
        <label className="inspector-label">CSS Class</label>
        <input
          type="text"
          className="inspector-input"
          value={className}
          onChange={(e) => onChange('className', e.target.value)}
          placeholder="custom-class"
        />
        <p className="inspector-help">Add custom CSS classes for styling</p>
      </div>

      <div className="inspector-field">
        <label className="inspector-label">ARIA Label</label>
        <input
          type="text"
          className="inspector-input"
          value={ariaLabel}
          onChange={(e) => onChange('ariaLabel', e.target.value)}
          placeholder="Accessible label"
        />
        <p className="inspector-help">Improves accessibility for screen readers</p>
      </div>

      <style>{`
        .visibility-controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .visibility-option {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 13px;
          color: #444;
        }

        .visibility-option input[type="checkbox"] {
          cursor: pointer;
        }

        .spacing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .spacing-grid input {
          width: 100%;
        }
      `}</style>
    </div>
  );
};
