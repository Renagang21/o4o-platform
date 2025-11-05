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
    <div className="inspector-section">
      <h4 className="inspector-section-title">Search Settings</h4>

      {/* Variant */}
      <div className="inspector-field">
        <label className="inspector-label">Display Type</label>
        <select
          className="inspector-select"
          value={variant}
          onChange={(e) => onChange('variant', e.target.value)}
        >
          <option value="icon">Icon Only</option>
          <option value="input">Input Field</option>
        </select>
        <p className="inspector-help">How to display the search element</p>
      </div>

      {/* Placeholder - only show when variant is input */}
      {variant === 'input' && (
        <div className="inspector-field">
          <label className="inspector-label">Placeholder</label>
          <input
            type="text"
            className="inspector-input"
            value={placeholder}
            onChange={(e) => onChange('placeholder', e.target.value)}
            placeholder="Search..."
          />
          <p className="inspector-help">Placeholder text for search input</p>
        </div>
      )}

      {/* Autocomplete */}
      <div className="inspector-field">
        <label className="inspector-label">
          <input
            type="checkbox"
            checked={autocomplete}
            onChange={(e) => onChange('autocomplete', e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Enable Autocomplete
        </label>
        <p className="inspector-help">Show search suggestions as user types</p>
      </div>
    </div>
  );
};
