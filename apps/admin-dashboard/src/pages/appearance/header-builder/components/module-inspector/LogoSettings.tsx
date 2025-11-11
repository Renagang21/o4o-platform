import React from 'react';

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
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Logo Settings</h4>

      {/* Logo Image URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo Image URL</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={logoUrl}
          onChange={(e) => onChange('logoUrl', e.target.value)}
          placeholder="https://example.com/logo.png"
        />
        <p className="text-xs text-gray-500 mt-1">Enter the URL of your logo image</p>
      </div>

      {/* Logo Preview */}
      {logoUrl && (
        <div className="mb-4">
          <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
            <img src={logoUrl} alt="Logo preview" style={{ maxWidth: `${width}px` }} className="max-h-20" />
          </div>
        </div>
      )}

      {/* Link URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={href}
          onChange={(e) => onChange('href', e.target.value)}
          placeholder="/"
        />
        <p className="text-xs text-gray-500 mt-1">URL to navigate when logo is clicked (default: /)</p>
      </div>

      {/* Width */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Width (px)</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[120px]"
          value={width}
          onChange={(e) => onChange('width', parseInt(e.target.value) || 120)}
          min="20"
          max="500"
        />
        <p className="text-xs text-gray-500 mt-1">Logo width in pixels</p>
      </div>

      {/* Retina Image (Optional) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Retina Image URL (Optional)</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={retinaUrl}
          onChange={(e) => onChange('retinaUrl', e.target.value)}
          placeholder="https://example.com/logo@2x.png"
        />
        <p className="text-xs text-gray-500 mt-1">High-resolution image for retina displays</p>
      </div>
    </div>
  );
};
