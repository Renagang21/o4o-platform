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
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Button Settings</h4>

      {/* Button Label */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Button Label</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={label}
          onChange={(e) => onChange('label', e.target.value)}
          placeholder="Button"
        />
        <p className="text-xs text-gray-500 mt-1">Text displayed on the button</p>
      </div>

      {/* Link URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={href}
          onChange={(e) => onChange('href', e.target.value)}
          placeholder="https://example.com"
        />
        <p className="text-xs text-gray-500 mt-1">URL to navigate when clicked</p>
      </div>

      {/* Button Style */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Button Style</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={variant}
          onChange={(e) => onChange('variant', e.target.value)}
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Visual style of the button</p>
      </div>

      {/* Button Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Button Size</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={size}
          onChange={(e) => onChange('size', e.target.value)}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Size of the button</p>
      </div>

      {/* Border Radius */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius (px)</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[120px]"
          value={borderRadius}
          onChange={(e) => onChange('borderRadius', parseInt(e.target.value) || 4)}
          min="0"
          max="50"
        />
        <p className="text-xs text-gray-500 mt-1">Rounded corners of the button</p>
      </div>

      {/* Preview */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
        <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
          <button
            className={`px-4 py-2 font-medium transition-all ${
              variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
              variant === 'secondary' ? 'bg-gray-600 text-white hover:bg-gray-700' :
              'bg-transparent text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
            } ${
              size === 'small' ? 'text-xs px-3 py-1.5' :
              size === 'large' ? 'text-base px-6 py-3' :
              'text-sm px-4 py-2'
            }`}
            style={{ borderRadius: `${borderRadius}px` }}
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
};
