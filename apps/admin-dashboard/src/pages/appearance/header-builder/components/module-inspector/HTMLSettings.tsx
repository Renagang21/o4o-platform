import React, { useState } from 'react';

interface HTMLSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const HTMLSettings: React.FC<HTMLSettingsProps> = ({ settings, onChange }) => {
  const html = settings.html || '';
  const height = settings.height || 'medium';
  const safeMode = settings.safeMode !== false;

  const [showPreview, setShowPreview] = useState(false);

  const heightOptions = {
    small: '150px',
    medium: '300px',
    large: '500px'
  };

  // Simple HTML sanitizer
  const sanitizeHTML = (html: string): string => {
    let sanitized = html;
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<(object|embed|applet|meta|link|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
    return sanitized;
  };

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">HTML Module Settings</h4>

      {/* HTML Code */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">HTML Code</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          value={html}
          onChange={(e) => onChange('html', e.target.value)}
          placeholder="<div>Your HTML here...</div>"
          style={{ height: heightOptions[height as keyof typeof heightOptions] }}
        />
        <p className="text-xs text-gray-500 mt-1">Enter custom HTML code. Scripts will be filtered in safe mode.</p>
      </div>

      {/* Editor Height */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Editor Height</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={height}
          onChange={(e) => onChange('height', e.target.value)}
        >
          <option value="small">Small (150px)</option>
          <option value="medium">Medium (300px)</option>
          <option value="large">Large (500px)</option>
        </select>
      </div>

      {/* Safe Mode */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={safeMode}
            onChange={(e) => onChange('safeMode', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Safe Mode (Recommended)</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Filters dangerous HTML tags and attributes (scripts, iframes, etc.)</p>
      </div>

      {/* Preview Toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPreview}
            onChange={(e) => setShowPreview(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Preview</span>
        </label>
      </div>

      {/* Preview */}
      {showPreview && html && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
          <div
            className="border border-gray-300 rounded-md p-3 bg-gray-50 min-h-[100px] max-h-[300px] overflow-auto"
            dangerouslySetInnerHTML={{ __html: safeMode ? sanitizeHTML(html) : html }}
          />
        </div>
      )}

      <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm">
        <strong>⚠️ Warning:</strong> Disabling safe mode allows all HTML, including scripts. Use with caution.
      </div>
    </div>
  );
};
