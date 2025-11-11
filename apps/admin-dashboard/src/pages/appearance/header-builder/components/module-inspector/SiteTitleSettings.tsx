import React from 'react';

interface SiteTitleSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const SiteTitleSettings: React.FC<SiteTitleSettingsProps> = ({
  settings,
  onChange
}) => {
  const text = settings.text || '';
  const tagline = settings.tagline || '';
  const showTitle = settings.showTitle !== false; // Default to true
  const showTagline = settings.showTagline || false;
  const href = settings.href || '/';
  const isLink = settings.isLink !== false; // Default to true

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Site Title Settings</h4>

      {/* Site Title Text */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Site Title</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={text}
          onChange={(e) => onChange('text', e.target.value)}
          placeholder="My Website"
        />
        <p className="text-xs text-gray-500 mt-1">The title of your site (leave empty to use site default)</p>
      </div>

      {/* Show Site Title */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTitle}
            onChange={(e) => onChange('showTitle', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Site Title</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Display the site title</p>
      </div>

      {/* Tagline Text */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={tagline}
          onChange={(e) => onChange('tagline', e.target.value)}
          placeholder="Your site's tagline"
        />
        <p className="text-xs text-gray-500 mt-1">The tagline/slogan for your site</p>
      </div>

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

      {/* Make it a Link */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isLink}
            onChange={(e) => onChange('isLink', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Make it a Link</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Allow clicking the title to navigate</p>
      </div>

      {/* Link URL */}
      {isLink && (
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
      )}
    </div>
  );
};
