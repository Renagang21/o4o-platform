import React from 'react';

interface WidgetSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const WidgetSettings: React.FC<WidgetSettingsProps> = ({
  settings,
  onChange
}) => {
  const widgetAreaId = settings.widgetAreaId || '';

  // TODO: Fetch available widget areas from API
  // For now, use hardcoded list of common widget areas
  const availableAreas = [
    { id: 'header-widgets', name: 'Header Widgets' },
    { id: 'footer-widgets', name: 'Footer Widgets' },
    { id: 'sidebar-widgets', name: 'Sidebar Widgets' },
    { id: 'primary-sidebar', name: 'Primary Sidebar' },
    { id: 'secondary-sidebar', name: 'Secondary Sidebar' }
  ];

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Widget Area Settings</h4>

      {/* Widget Area Selection */}
      <div className="inspector-field">
        <label className="inspector-label">Widget Area</label>
        <select
          className="inspector-select"
          value={widgetAreaId}
          onChange={(e) => onChange('widgetAreaId', e.target.value)}
        >
          <option value="">Select a widget area...</option>
          {availableAreas.map(area => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
        <p className="inspector-help">Select which widget area to display</p>
      </div>

      {/* Empty State Warning */}
      {!widgetAreaId && (
        <div className="inspector-warning">
          <p style={{
            padding: '12px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#856404',
            margin: '0'
          }}>
            Please select a widget area. The widget block will not be displayed until an area is selected.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="inspector-help" style={{ marginTop: '12px' }}>
        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
          Displays all widgets assigned to the selected widget area. Widgets can be managed in the Widgets section.
        </p>
      </div>
    </div>
  );
};
