import React from 'react';
import type {
  ViewPreset,
  ViewField
} from '@o4o/types';

/**
 * Props for PresetRenderer
 */
export interface PresetRendererProps {
  preset: ViewPreset;
  data?: any[];
  loading?: boolean;
}

/**
 * Render a single field value based on its format
 */
function renderFieldValue(value: any, field: ViewField): React.ReactNode {
  if (value === null || value === undefined) {
    return '-';
  }

  switch (field.format) {
    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: value }} />;

    case 'image':
      if (typeof value === 'string') {
        return <img src={value} alt={field.label || field.fieldKey} className="max-w-xs h-auto" />;
      }
      return '-';

    case 'date':
      if (field.formatter?.type === 'date') {
        const date = new Date(value);
        if (field.formatter.pattern === 'relative') {
          // Simple relative time
          const now = new Date();
          const diff = now.getTime() - date.getTime();
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          if (days === 0) return 'Today';
          if (days === 1) return 'Yesterday';
          if (days < 7) return `${days} days ago`;
          if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
          return date.toLocaleDateString();
        }
        return date.toLocaleDateString();
      }
      return String(value);

    case 'number':
      if (field.formatter?.type === 'number') {
        const num = Number(value);
        if (field.formatter.currency) {
          return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: field.formatter.currency,
            minimumFractionDigits: field.formatter.decimals ?? 0,
            maximumFractionDigits: field.formatter.decimals ?? 0
          }).format(num);
        }
        return num.toLocaleString();
      }
      return String(value);

    case 'badge':
      if (field.formatter?.type === 'badge') {
        const colorMap = field.formatter.colorMap || {};
        const color = colorMap[String(value)] || 'gray';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
            {value}
          </span>
        );
      }
      return String(value);

    case 'text':
    default:
      return String(value);
  }
}

/**
 * Render list mode
 */
function renderList(preset: ViewPreset, data: any[]): React.ReactNode {
  const fields = preset.config.fields.sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="space-y-1">
            {fields.map((field) => {
              const value = item[field.fieldKey];
              const label = field.label || field.fieldKey;

              return (
                <div key={field.fieldKey} className="flex gap-2">
                  <span className="font-medium text-gray-700 min-w-[120px]">{label}:</span>
                  <span className="text-gray-900 flex-1">{renderFieldValue(value, field)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Render grid mode
 */
function renderGrid(preset: ViewPreset, data: any[]): React.ReactNode {
  const fields = preset.config.fields.sort((a, b) => a.order - b.order);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((item, index) => (
        <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="space-y-2">
            {fields.map((field) => {
              const value = item[field.fieldKey];
              const label = field.label || field.fieldKey;

              return (
                <div key={field.fieldKey}>
                  <div className="text-sm font-medium text-gray-500">{label}</div>
                  <div className="text-gray-900">{renderFieldValue(value, field)}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Render card mode
 */
function renderCard(preset: ViewPreset, data: any[]): React.ReactNode {
  const fields = preset.config.fields.sort((a, b) => a.order - b.order);
  const firstField = fields[0];
  const otherFields = fields.slice(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((item, index) => (
        <div key={index} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          {firstField && (
            <div className="bg-gray-100 p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {renderFieldValue(item[firstField.fieldKey], firstField)}
              </h3>
            </div>
          )}
          <div className="p-4 space-y-2">
            {otherFields.map((field) => {
              const value = item[field.fieldKey];
              const label = field.label || field.fieldKey;

              return (
                <div key={field.fieldKey}>
                  <div className="text-xs font-medium text-gray-500 uppercase">{label}</div>
                  <div className="text-gray-900">{renderFieldValue(value, field)}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Render table mode
 */
function renderTable(preset: ViewPreset, data: any[]): React.ReactNode {
  const fields = preset.config.fields.sort((a, b) => a.order - b.order);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {fields.map((field) => (
              <th
                key={field.fieldKey}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {field.label || field.fieldKey}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              {fields.map((field) => (
                <td key={field.fieldKey} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {renderFieldValue(item[field.fieldKey], field)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * PresetRenderer Component
 *
 * Renders content based on ViewPreset configuration
 */
export function PresetRenderer({ preset, data = [], loading = false }: PresetRendererProps): React.ReactElement {
  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available</div>;
  }

  const { renderMode } = preset.config;

  switch (renderMode) {
    case 'list':
      return <>{renderList(preset, data)}</>;
    case 'grid':
      return <>{renderGrid(preset, data)}</>;
    case 'card':
      return <>{renderCard(preset, data)}</>;
    case 'table':
      return <>{renderTable(preset, data)}</>;
    default:
      return <>{renderList(preset, data)}</>;
  }
}
