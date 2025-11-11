import React from 'react';

interface SearchSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const SearchSettings: React.FC<SearchSettingsProps> = ({
  settings,
  onChange
}) => {
  const variant = settings.variant || 'icon';
  const placeholder = settings.placeholder || 'Search...';
  const autocomplete = settings.autocomplete !== false; // Default true

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Search Settings</h4>

      {/* Variant */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Display Type</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={variant}
          onChange={(e) => onChange('variant', e.target.value)}
        >
          <option value="icon">Icon Only</option>
          <option value="input">Input Field</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">How to display the search element</p>
      </div>

      {/* Placeholder - only show when variant is input */}
      {variant === 'input' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Placeholder</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={placeholder}
            onChange={(e) => onChange('placeholder', e.target.value)}
            placeholder="Search..."
          />
          <p className="text-xs text-gray-500 mt-1">Placeholder text for search input</p>
        </div>
      )}

      {/* Autocomplete */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autocomplete}
            onChange={(e) => onChange('autocomplete', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Enable Autocomplete</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Show search suggestions as user types</p>
      </div>
    </div>
  );
};
