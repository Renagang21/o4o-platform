import React from 'react';

interface FaviconSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const FaviconSettings: React.FC<FaviconSettingsProps> = ({
  settings,
  onChange
}) => {
  const faviconUrl = settings.faviconUrl || '';
  const type = settings.type || 'png';
  const sizes = settings.sizes || '32x32';
  const appleTouchIcon = settings.appleTouchIcon || '';
  const appleIconSizes = settings.appleIconSizes || '180x180';

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Favicon Settings</h4>

      {/* Favicon URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Favicon URL</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={faviconUrl}
          onChange={(e) => onChange('faviconUrl', e.target.value)}
          placeholder="https://example.com/favicon.png"
        />
        <p className="text-xs text-gray-500 mt-1">Enter the URL of your favicon image</p>
      </div>

      {/* Favicon Preview */}
      {faviconUrl && (
        <div className="mb-4">
          <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
            <img src={faviconUrl} alt="Favicon preview" className="w-8 h-8" />
          </div>
        </div>
      )}

      {/* Favicon Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={type}
          onChange={(e) => onChange('type', e.target.value)}
        >
          <option value="ico">ICO (.ico)</option>
          <option value="png">PNG (.png)</option>
          <option value="svg">SVG (.svg)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Select the favicon file type</p>
      </div>

      {/* Sizes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Sizes</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={sizes}
          onChange={(e) => onChange('sizes', e.target.value)}
        >
          <option value="16x16">16x16</option>
          <option value="32x32">32x32</option>
          <option value="48x48">48x48</option>
          <option value="64x64">64x64</option>
          <option value="any">any (for SVG)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Favicon size (default: 32x32)</p>
      </div>

      {/* Apple Touch Icon */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Apple Touch Icon (Optional)</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={appleTouchIcon}
          onChange={(e) => onChange('appleTouchIcon', e.target.value)}
          placeholder="https://example.com/apple-touch-icon.png"
        />
        <p className="text-xs text-gray-500 mt-1">Apple devices home screen icon</p>
      </div>

      {/* Apple Icon Preview */}
      {appleTouchIcon && (
        <div className="mb-4">
          <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
            <img src={appleTouchIcon} alt="Apple icon preview" className="w-12 h-12 rounded-lg" />
          </div>
        </div>
      )}

      {/* Apple Icon Sizes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Apple Icon Sizes</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={appleIconSizes}
          onChange={(e) => onChange('appleIconSizes', e.target.value)}
        >
          <option value="120x120">120x120</option>
          <option value="152x152">152x152</option>
          <option value="180x180">180x180 (recommended)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Apple touch icon size (default: 180x180)</p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Favicon will be automatically added to the HTML head section.
          It won't be visible in the header layout but will appear in the browser tab.
        </p>
      </div>
    </div>
  );
};
