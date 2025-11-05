import React from 'react';

interface ButtonSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const ButtonSettings: React.FC<ButtonSettingsProps> = ({
  settings,
  onChange
}) => {
  const label = settings.label || 'Button';
  const href = settings.href || '#';
  const variant = settings.variant || 'primary';
  const size = settings.size || 'medium';
  const borderRadius = settings.borderRadius || 4;

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Button Settings</h4>

      {/* Button Label */}
      <div className="inspector-field">
        <label className="inspector-label">Button Label</label>
        <input
          type="text"
          className="inspector-input"
          value={label}
          onChange={(e) => onChange('label', e.target.value)}
          placeholder="Button"
        />
        <p className="inspector-help">Text displayed on the button</p>
      </div>

      {/* Link URL */}
      <div className="inspector-field">
        <label className="inspector-label">Link URL</label>
        <input
          type="text"
          className="inspector-input"
          value={href}
          onChange={(e) => onChange('href', e.target.value)}
          placeholder="https://example.com"
        />
        <p className="inspector-help">URL to navigate when clicked</p>
      </div>

      {/* Button Style */}
      <div className="inspector-field">
        <label className="inspector-label">Button Style</label>
        <select
          className="inspector-select"
          value={variant}
          onChange={(e) => onChange('variant', e.target.value)}
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
        <p className="inspector-help">Visual style of the button</p>
      </div>

      {/* Button Size */}
      <div className="inspector-field">
        <label className="inspector-label">Button Size</label>
        <select
          className="inspector-select"
          value={size}
          onChange={(e) => onChange('size', e.target.value)}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
        <p className="inspector-help">Size of the button</p>
      </div>

      {/* Border Radius */}
      <div className="inspector-field">
        <label className="inspector-label">Border Radius (px)</label>
        <input
          type="number"
          className="inspector-input"
          value={borderRadius}
          onChange={(e) => onChange('borderRadius', parseInt(e.target.value) || 4)}
          min="0"
          max="50"
        />
        <p className="inspector-help">Rounded corners of the button</p>
      </div>

      {/* Preview */}
      <div className="inspector-field">
        <label className="inspector-label">Preview</label>
        <div className="button-preview">
          <button
            className={`preview-button ${variant} ${size}`}
            style={{ borderRadius: `${borderRadius}px` }}
          >
            {label}
          </button>
        </div>
      </div>

      <style>{`
        .button-preview {
          padding: 16px;
          background: #f5f5f5;
          border: 1px dashed #d0d0d0;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-button {
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .preview-button.primary {
          background: #2196F3;
          color: white;
        }

        .preview-button.secondary {
          background: #6c757d;
          color: white;
        }

        .preview-button.outline {
          background: transparent;
          color: #2196F3;
          border: 2px solid #2196F3;
        }

        .preview-button.small {
          padding: 6px 12px;
          font-size: 12px;
        }

        .preview-button.medium {
          padding: 10px 20px;
          font-size: 14px;
        }

        .preview-button.large {
          padding: 14px 28px;
          font-size: 16px;
        }

        .preview-button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};
