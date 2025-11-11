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
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Common Settings</h4>

      {/* Alignment */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Alignment</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={alignment}
          onChange={(e) => onChange('alignment', e.target.value)}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Visibility */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visibility.desktop}
              onChange={(e) => onChange('visibility', {
                ...visibility,
                desktop: e.target.checked
              })}
              className="rounded"
            />
            <span className="text-sm">Desktop</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visibility.tablet}
              onChange={(e) => onChange('visibility', {
                ...visibility,
                tablet: e.target.checked
              })}
              className="rounded"
            />
            <span className="text-sm">Tablet</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visibility.mobile}
              onChange={(e) => onChange('visibility', {
                ...visibility,
                mobile: e.target.checked
              })}
              className="rounded"
            />
            <span className="text-sm">Mobile</span>
          </label>
        </div>
      </div>

      {/* Spacing - Margin */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Margin (px)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Top"
            value={spacing.margin.top}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              margin: { ...spacing.margin, top: parseInt(e.target.value) || 0 }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Right"
            value={spacing.margin.right}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              margin: { ...spacing.margin, right: parseInt(e.target.value) || 0 }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Bottom"
            value={spacing.margin.bottom}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              margin: { ...spacing.margin, bottom: parseInt(e.target.value) || 0 }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Left"
            value={spacing.margin.left}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              margin: { ...spacing.margin, left: parseInt(e.target.value) || 0 }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Spacing - Padding */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Padding (px)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Top"
            value={spacing.padding.top}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              padding: { ...spacing.padding, top: parseInt(e.target.value) || 0 }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Right"
            value={spacing.padding.right}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              padding: { ...spacing.padding, right: parseInt(e.target.value) || 0 }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Bottom"
            value={spacing.padding.bottom}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              padding: { ...spacing.padding, bottom: parseInt(e.target.value) || 0 }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Left"
            value={spacing.padding.left}
            onChange={(e) => onChange('spacing', {
              ...spacing,
              padding: { ...spacing.padding, left: parseInt(e.target.value) || 0 }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">CSS Class</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={className}
          onChange={(e) => onChange('className', e.target.value)}
          placeholder="custom-class"
        />
        <p className="text-xs text-gray-500 mt-1">Add custom CSS classes for styling</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">ARIA Label</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={ariaLabel}
          onChange={(e) => onChange('ariaLabel', e.target.value)}
          placeholder="Accessible label"
        />
        <p className="text-xs text-gray-500 mt-1">Improves accessibility for screen readers</p>
      </div>
    </div>
  );
};
