import React from 'react';

interface SiteTitleSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const SiteTitleSettings: React.FC<SiteTitleSettingsProps> = ({
  settings,
  onChange
}) => {
  const showTagline = settings.showTagline || false;
  const href = settings.href || '/';

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Site Title Settings</h4>

      {/* Show Tagline */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTagline}
            onChange={(e) => onChange('showTagline', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Tagline</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Display site tagline below title</p>
      </div>

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
        <p className="text-xs text-gray-500 mt-1">URL to navigate when title is clicked</p>
      </div>
    </div>
  );
};
