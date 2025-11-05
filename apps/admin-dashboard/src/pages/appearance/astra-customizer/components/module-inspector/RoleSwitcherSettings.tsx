import React from 'react';

interface RoleSwitcherSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const RoleSwitcherSettings: React.FC<RoleSwitcherSettingsProps> = ({
  settings,
  onChange
}) => {
  const displayCondition = settings.displayCondition || 'multi-role';
  const showLabel = settings.showLabel !== false; // Default true
  const variant = settings.variant || 'with-label';

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Role Switcher Settings</h4>

      {/* Display Condition */}
      <div className="inspector-field">
        <label className="inspector-label">Display Condition</label>
        <select
          className="inspector-select"
          value={displayCondition}
          onChange={(e) => onChange('displayCondition', e.target.value)}
        >
          <option value="always">Always Show</option>
          <option value="multi-role">Only for Multi-Role Users</option>
        </select>
        <p className="inspector-help">
          "Multi-Role" shows only when user has multiple roles available
        </p>
      </div>

      {/* Variant */}
      <div className="inspector-field">
        <label className="inspector-label">Display Style</label>
        <select
          className="inspector-select"
          value={variant}
          onChange={(e) => onChange('variant', e.target.value)}
        >
          <option value="icon-only">Icon Only</option>
          <option value="with-label">Icon with Label</option>
        </select>
        <p className="inspector-help">How to display the role switcher</p>
      </div>

      {/* Show Label (legacy support) */}
      <div className="inspector-field">
        <label className="inspector-label">
          <input
            type="checkbox"
            checked={showLabel}
            onChange={(e) => onChange('showLabel', e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Show Text Label
        </label>
        <p className="inspector-help">Display text label next to icon</p>
      </div>
    </div>
  );
};
