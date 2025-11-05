import React from 'react';

interface MenuSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const MenuSettings: React.FC<MenuSettingsProps> = ({
  settings,
  onChange
}) => {
  const menuRef = settings.menuRef || 'primary';
  const style = settings.style || 'default';
  const itemGap = settings.itemGap || 20;

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Menu Settings</h4>

      {/* Menu Selection */}
      <div className="inspector-field">
        <label className="inspector-label">Menu</label>
        <select
          className="inspector-select"
          value={menuRef}
          onChange={(e) => onChange('menuRef', e.target.value)}
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
        <p className="inspector-help">Style for dropdown submenu items</p>
      </div>

      {/* Item Gap */}
      <div className="inspector-field">
        <label className="inspector-label">Item Gap (px)</label>
        <input
          type="number"
          className="inspector-input"
          value={itemGap}
          onChange={(e) => onChange('itemGap', parseInt(e.target.value) || 20)}
          min="0"
          max="100"
        />
        <p className="inspector-help">Space between menu items</p>
      </div>
    </div>
  );
};
