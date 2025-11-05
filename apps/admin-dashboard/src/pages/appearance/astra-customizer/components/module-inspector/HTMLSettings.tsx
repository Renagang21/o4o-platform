import React, { useState } from 'react';

interface HTMLSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const HTMLSettings: React.FC<HTMLSettingsProps> = ({ settings, onChange }) => {
  const html = settings.html || '';
  const height = settings.height || 'medium';
  const enablePreview = settings.enablePreview !== false;
  const safeMode = settings.safeMode !== false;

  const [showPreview, setShowPreview] = useState(false);

  const heightOptions = {
    small: '150px',
    medium: '300px',
    large: '500px'
  };

  // Simple HTML sanitizer (for demo - use DOMPurify in production)
  const sanitizeHTML = (html: string): string => {
    let sanitized = html;

    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove iframe
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    // Remove dangerous tags
    sanitized = sanitized.replace(/<(object|embed|applet|meta|link|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

    return sanitized;
  };

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">HTML Module Settings</h4>

      {/* HTML Code */}
      <div className="inspector-field">
        <label className="inspector-label">HTML Code</label>
        <textarea
          className="inspector-textarea"
          value={html}
          onChange={(e) => onChange('html', e.target.value)}
          placeholder="<div>Your HTML here...</div>"
          style={{
            height: heightOptions[height as keyof typeof heightOptions],
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.5'
          }}
        />
        <p className="inspector-help">
          Enter custom HTML code. Scripts will be filtered in safe mode.
        </p>
      </div>

      {/* Editor Height */}
      <div className="inspector-field">
        <label className="inspector-label">Editor Height</label>
        <select
          className="inspector-select"
          value={height}
          onChange={(e) => onChange('height', e.target.value)}
        >
          <option value="small">Small (150px)</option>
          <option value="medium">Medium (300px)</option>
          <option value="large">Large (500px)</option>
        </select>
      </div>

      {/* Safe Mode */}
      <div className="inspector-field">
        <label className="inspector-checkbox-label">
          <input
            type="checkbox"
            checked={safeMode}
            onChange={(e) => onChange('safeMode', e.target.checked)}
          />
          <span>Safe Mode (Recommended)</span>
        </label>
        <p className="inspector-help">
          Filters dangerous HTML tags and attributes (scripts, iframes, etc.)
        </p>
      </div>

      {/* Preview Toggle */}
      {enablePreview && (
        <div className="inspector-field">
          <label className="inspector-checkbox-label">
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
            />
            <span>Show Preview</span>
          </label>
        </div>
      )}

      {/* Preview */}
      {showPreview && html && (
        <div className="inspector-field">
          <label className="inspector-label">Preview</label>
          <div
            className="html-preview"
            dangerouslySetInnerHTML={{ __html: safeMode ? sanitizeHTML(html) : html }}
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '12px',
              background: '#f9f9f9',
              minHeight: '100px',
              maxHeight: '300px',
              overflow: 'auto'
            }}
          />
        </div>
      )}

      <div className="inspector-warning" style={{
        padding: '12px',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        marginTop: '16px',
        fontSize: '13px'
      }}>
        <strong>⚠️ Warning:</strong> Disabling safe mode allows all HTML, including scripts. Use with caution.
      </div>
    </div>
  );
};
