import React from 'react';
import { Upload } from 'lucide-react';

interface LogoSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const LogoSettings: React.FC<LogoSettingsProps> = ({
  settings,
  onChange
}) => {
  const logoUrl = settings.logoUrl || '';
  const href = settings.href || '/';
  const width = settings.width || 120;
  const retinaUrl = settings.retinaUrl || '';

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Logo Settings</h4>

      {/* Logo Image URL */}
      <div className="inspector-field">
        <label className="inspector-label">Logo Image URL</label>
        <input
          type="text"
          className="inspector-input"
          value={logoUrl}
          onChange={(e) => onChange('logoUrl', e.target.value)}
          placeholder="https://example.com/logo.png"
        />
        <p className="inspector-help">Enter the URL of your logo image</p>
      </div>

      {/* Logo Preview */}
      {logoUrl && (
        <div className="inspector-field">
          <div className="logo-preview">
            <img src={logoUrl} alt="Logo preview" style={{ maxWidth: `${width}px` }} />
          </div>
        </div>
      )}

      {/* Link URL */}
      <div className="inspector-field">
        <label className="inspector-label">Link URL</label>
        <input
          type="text"
          className="inspector-input"
          value={href}
          onChange={(e) => onChange('href', e.target.value)}
          placeholder="/"
        />
        <p className="inspector-help">URL to navigate when logo is clicked (default: /)</p>
      </div>

      {/* Width */}
      <div className="inspector-field">
        <label className="inspector-label">Width (px)</label>
        <input
          type="number"
          className="inspector-input"
          value={width}
          onChange={(e) => onChange('width', parseInt(e.target.value) || 120)}
          min="20"
          max="500"
        />
        <p className="inspector-help">Logo width in pixels</p>
      </div>

      {/* Retina Image (Optional) */}
      <div className="inspector-field">
        <label className="inspector-label">Retina Image URL (Optional)</label>
        <input
          type="text"
          className="inspector-input"
          value={retinaUrl}
          onChange={(e) => onChange('retinaUrl', e.target.value)}
          placeholder="https://example.com/logo@2x.png"
        />
        <p className="inspector-help">High-resolution image for retina displays</p>
      </div>

      <style>{`
        .logo-preview {
          padding: 16px;
          background: #f5f5f5;
          border: 1px dashed #d0d0d0;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-preview img {
          max-height: 80px;
          height: auto;
          display: block;
        }
      `}</style>
    </div>
  );
};
