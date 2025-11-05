import React from 'react';

interface SecondaryMenuSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const SecondaryMenuSettings: React.FC<SecondaryMenuSettingsProps> = ({
  settings,
  onChange
}) => {
  const menuId = settings.menuId || 'secondary';
  const style = settings.style || 'default';
  const itemGap = settings.itemGap || 16;

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Secondary Menu Settings</h4>

      {/* Menu Selection */}
      <div className="inspector-field">
        <label className="inspector-label">Menu</label>
        <select
          className="inspector-select"
          value={menuId}
          onChange={(e) => onChange('menuId', e.target.value)}
        >
          <option value="primary">Primary Menu</option>
          <option value="secondary">Secondary Menu</option>
          <option value="footer">Footer Menu</option>
        </select>
        <p className="inspector-help">Select which menu to display</p>
      </div>

      {/* Dropdown Style */}
      <div className="inspector-field">
        <label className="inspector-label">Dropdown Style</label>
        <select
          className="inspector-select"
          value={style}
          onChange={(e) => onChange('style', e.target.value)}
        >
          <option value="default">Default</option>
          <option value="minimal">Minimal</option>
          <option value="bordered">Bordered</option>
        </select>
        <p className="inspector-help">Visual style for dropdown menus</p>
      </div>

      {/* Item Gap */}
      <div className="inspector-field">
        <label className="inspector-label">Item Gap (px)</label>
        <input
          type="number"
          className="inspector-input"
          min="0"
          max="100"
          value={itemGap}
          onChange={(e) => onChange('itemGap', parseInt(e.target.value) || 16)}
        />
        <p className="inspector-help">Spacing between menu items</p>
      </div>
    </div>
  );
};
