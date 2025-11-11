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
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Menu Settings</h4>

      {/* Menu Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Menu</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={menuRef}
          onChange={(e) => onChange('menuRef', e.target.value)}
        >
          <option value="primary">Primary Menu</option>
          <option value="secondary">Secondary Menu</option>
          <option value="footer">Footer Menu</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Select which menu to display</p>
      </div>

      {/* Dropdown Style */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Dropdown Style</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={style}
          onChange={(e) => onChange('style', e.target.value)}
        >
          <option value="default">Default</option>
          <option value="minimal">Minimal</option>
          <option value="bordered">Bordered</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Style for dropdown submenu items</p>
      </div>

      {/* Item Gap */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Item Gap (px)</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[120px]"
          value={itemGap}
          onChange={(e) => onChange('itemGap', parseInt(e.target.value) || 20)}
          min="0"
          max="100"
        />
        <p className="text-xs text-gray-500 mt-1">Space between menu items</p>
      </div>
    </div>
  );
};
