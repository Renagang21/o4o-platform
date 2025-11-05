import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../../../../../utils/apiClient';

interface WidgetSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const WidgetSettings: React.FC<WidgetSettingsProps> = ({
  settings,
  onChange
}) => {
  const widgetAreaId = settings.widgetAreaId || '';

  // Fetch widget areas from API
  const { data: areasData, isLoading, error, refetch } = useQuery({
    queryKey: ['widget-areas'],
    queryFn: async () => {
      const response = await apiClient.get('/widget-areas');
      return response.areas || [];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const availableAreas = areasData || [];

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Widget Area Settings</h4>

      {/* Widget Area Selection */}
      <div className="inspector-field">
        <label className="inspector-label">Widget Area</label>

        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            background: '#f9f9f9',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Loading widget areas...</span>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            background: '#fff3f3',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#c62828'
          }}>
            <AlertCircle size={16} />
            <span>Failed to load widget areas</span>
            <button
              onClick={() => refetch()}
              style={{
                marginLeft: 'auto',
                padding: '4px 8px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <select
              className="inspector-select"
              value={widgetAreaId}
              onChange={(e) => onChange('widgetAreaId', e.target.value)}
            >
              <option value="">Select a widget area...</option>
              {availableAreas.map((area: any) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <p className="inspector-help">Select which widget area to display</p>
          </>
        )}
      </div>

      {/* Empty State Warning */}
      {!widgetAreaId && !isLoading && !error && (
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
            ⚠️ Please select a widget area. The widget block will not be displayed until an area is selected.
          </p>
        </div>
      )}

      {/* Success State */}
      {widgetAreaId && !isLoading && !error && (
        <div className="inspector-info">
          <p style={{
            padding: '12px',
            backgroundColor: '#e8f5e9',
            border: '1px solid #4caf50',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#2e7d32',
            margin: '0'
          }}>
            ✓ Displays all widgets assigned to the selected area.
          </p>
        </div>
      )}

      {/* No Areas Available */}
      {!isLoading && !error && availableAreas.length === 0 && (
        <div className="inspector-info">
          <p style={{
            padding: '12px',
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#1565c0',
            margin: '0'
          }}>
            ℹ️ No widget areas available. Create widget areas in the Widgets section.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
