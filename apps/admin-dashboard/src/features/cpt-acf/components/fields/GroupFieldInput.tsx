/**
 * Group Field Input Component
 * Organizes multiple sub-fields into a collapsible group
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CustomField } from '../../types/acf.types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface GroupValue {
  [fieldName: string]: any;
}

export interface GroupFieldInputProps {
  field: CustomField;
  value?: GroupValue | null;
  onChange?: (value: GroupValue | null) => void;
  disabled?: boolean;
  renderSubField?: (
    subField: CustomField,
    value: any,
    onChange: (value: any) => void,
    disabled?: boolean
  ) => React.ReactNode;
}

export const GroupFieldInput: React.FC<GroupFieldInputProps> = ({
  field,
  value = {},
  onChange,
  disabled = false,
  renderSubField,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Get group configuration
  const config = useMemo(() => ({
    layout: (field.layout as 'table' | 'block' | 'row') || 'block',
    subFields: field.subFields || [],
  }), [field]);

  // Ensure value is an object
  const groupValue = useMemo(() => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value;
  }, [value]);

  // Handle sub-field change
  const handleSubFieldChange = useCallback((fieldName: string, fieldValue: any) => {
    if (disabled) return;

    const newValue = {
      ...groupValue,
      [fieldName]: fieldValue,
    };

    onChange?.(newValue);
  }, [disabled, groupValue, onChange]);

  // Render sub-field input
  const renderFieldInput = useCallback((subField: CustomField) => {
    const fieldValue = groupValue[subField.name];

    // If custom renderSubField is provided, use it
    if (renderSubField) {
      return renderSubField(
        subField,
        fieldValue,
        (newValue) => handleSubFieldChange(subField.name, newValue),
        disabled
      );
    }

    // Default fallback rendering
    switch (subField.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <input
            type={subField.type}
            value={fieldValue || ''}
            onChange={(e) => handleSubFieldChange(subField.name, e.target.value)}
            placeholder={subField.placeholder}
            disabled={disabled}
            required={subField.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={fieldValue || ''}
            onChange={(e) => handleSubFieldChange(subField.name, e.target.value)}
            placeholder={subField.placeholder}
            disabled={disabled}
            required={subField.required}
            rows={subField.rows || 3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={fieldValue || ''}
            onChange={(e) => handleSubFieldChange(subField.name, e.target.value)}
            placeholder={subField.placeholder}
            disabled={disabled}
            required={subField.required}
            min={subField.min}
            max={subField.max}
            step={subField.step}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'select':
        return (
          <select
            value={fieldValue || ''}
            onChange={(e) => handleSubFieldChange(subField.name, e.target.value)}
            disabled={disabled}
            required={subField.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {(subField.choices || []).map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <div className="text-sm text-gray-500 italic">
            Field type "{subField.type}" not yet implemented
          </div>
        );
    }
  }, [groupValue, handleSubFieldChange, renderSubField, disabled]);

  // Render block layout
  const renderBlockLayout = () => {
    return (
      <div className="space-y-4 p-4">
        {config.subFields.map((subField) => (
          <div key={subField.name} className="group-field-item">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {subField.label}
              {subField.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {subField.instructions && (
              <p className="text-sm text-gray-500 mb-2">{subField.instructions}</p>
            )}
            {renderFieldInput(subField)}
          </div>
        ))}
      </div>
    );
  };

  // Render table layout
  const renderTableLayout = () => {
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.subFields.map((subField) => (
            <div key={subField.name} className="group-field-item">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {subField.label}
                {subField.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderFieldInput(subField)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render row layout (compact inline)
  const renderRowLayout = () => {
    return (
      <div className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          {config.subFields.map((subField) => (
            <div key={subField.name} className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {subField.label}
                {subField.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderFieldInput(subField)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (config.subFields.length === 0) {
    return (
      <Card className="p-4 bg-gray-50">
        <p className="text-sm text-gray-500 text-center">
          No sub-fields defined for this group
        </p>
      </Card>
    );
  }

  return (
    <Card className="group-field">
      {/* Group Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{field.label}</h4>
          {field.instructions && (
            <p className="text-sm text-gray-500 mt-1">{field.instructions}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-2"
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Group Content */}
      {!collapsed && (
        <div className="group-content">
          {config.layout === 'block' && renderBlockLayout()}
          {config.layout === 'table' && renderTableLayout()}
          {config.layout === 'row' && renderRowLayout()}
        </div>
      )}
    </Card>
  );
};

export default GroupFieldInput;
