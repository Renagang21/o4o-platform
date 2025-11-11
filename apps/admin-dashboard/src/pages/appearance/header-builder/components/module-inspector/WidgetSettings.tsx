import React from 'react';

interface WidgetSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const WidgetSettings: React.FC<WidgetSettingsProps> = ({
  settings,
  onChange
}) => {
  const widgetArea = settings.widgetArea || 'header-widget';
  const title = settings.title || '';
  const showTitle = settings.showTitle !== false;

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Widget Settings</h4>

      {/* Widget Area */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Widget Area</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={widgetArea}
          onChange={(e) => onChange('widgetArea', e.target.value)}
        >
          <option value="header-widget">Header Widget</option>
          <option value="sidebar">Sidebar</option>
          <option value="footer-widget-1">Footer Widget 1</option>
          <option value="footer-widget-2">Footer Widget 2</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Select which widget area to display</p>
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Widget Title</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Widget Title"
        />
        <p className="text-xs text-gray-500 mt-1">Optional title for this widget area</p>
      </div>

      {/* Show Title */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTitle}
            onChange={(e) => onChange('showTitle', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Widget Title</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Display title above widget content</p>
      </div>
    </div>
  );
};
