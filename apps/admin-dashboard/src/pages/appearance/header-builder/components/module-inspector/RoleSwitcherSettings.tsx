import React from 'react';

interface RoleSwitcherSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const RoleSwitcherSettings: React.FC<RoleSwitcherSettingsProps> = ({
  settings,
  onChange
}) => {
  const showIcons = settings.showIcons !== false; // Default true
  const style = settings.style || 'dropdown';

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Role Switcher Settings</h4>

      {/* Display Style */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Display Style</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={style}
          onChange={(e) => onChange('style', e.target.value)}
        >
          <option value="dropdown">Dropdown</option>
          <option value="inline">Inline Buttons</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">How to display role options</p>
      </div>

      {/* Show Icons */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showIcons}
            onChange={(e) => onChange('showIcons', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Role Icons</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Display icons next to role names</p>
      </div>
    </div>
  );
};
