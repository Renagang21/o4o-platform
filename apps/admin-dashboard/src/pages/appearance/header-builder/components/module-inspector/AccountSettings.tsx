import React from 'react';

interface AccountSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  settings,
  onChange
}) => {
  const accountUrl = settings.accountUrl || '/my-account';
  const loginUrl = settings.loginUrl || '/login';
  const showIcon = settings.showIcon !== false; // Default to true
  const showLabel = settings.showLabel !== false; // Default to true
  const label = settings.label || 'Account';

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Account Settings</h4>

      {/* Account URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Account URL</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={accountUrl}
          onChange={(e) => onChange('accountUrl', e.target.value)}
          placeholder="/my-account"
        />
        <p className="text-xs text-gray-500 mt-1">URL to the account/profile page (for logged-in users)</p>
      </div>

      {/* Login URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Login URL</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={loginUrl}
          onChange={(e) => onChange('loginUrl', e.target.value)}
          placeholder="/login"
        />
        <p className="text-xs text-gray-500 mt-1">URL to the login page (for guests)</p>
      </div>

      {/* Show Icon */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showIcon}
            onChange={(e) => onChange('showIcon', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Icon</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Display user icon</p>
      </div>

      {/* Show Label */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showLabel}
            onChange={(e) => onChange('showLabel', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Label</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Display text label next to icon</p>
      </div>

      {/* Label Text */}
      {showLabel && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Label Text</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={label}
            onChange={(e) => onChange('label', e.target.value)}
            placeholder="Account"
          />
          <p className="text-xs text-gray-500 mt-1">Text to display next to the icon</p>
        </div>
      )}
    </div>
  );
};
