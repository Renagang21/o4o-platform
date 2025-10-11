/**
 * Fields Renderer Component
 * Renders all fields with conditional logic support
 */

import React, { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CustomField } from '../types/acf.types';
import { useConditionalLogic } from '../hooks/useConditionalLogic';
import { ConditionalFieldWrapper } from './ConditionalFieldWrapper';

interface FieldsRendererProps {
  fields: CustomField[];
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  renderField: (
    field: CustomField,
    value: any,
    onChange: (value: any) => void
  ) => React.ReactNode;
}

export const FieldsRenderer: React.FC<FieldsRendererProps> = ({
  fields,
  values,
  onChange,
  renderField,
}) => {
  // Use conditional logic hook
  const { fieldVisibility, isFieldVisible, hasCircularDeps, circularFields } =
    useConditionalLogic({
      fields,
      fieldValues: values,
    });

  // Handle field value change
  const handleFieldChange = useCallback(
    (fieldName: string, value: any) => {
      onChange(fieldName, value);
    },
    [onChange]
  );

  // Show circular dependency warning
  if (hasCircularDeps) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900 mb-1">
              Circular Dependency Detected
            </h3>
            <p className="text-sm text-red-800 mb-2">
              The following fields have circular dependencies in their conditional logic:
            </p>
            <ul className="text-sm text-red-800 list-disc list-inside">
              {circularFields.map((fieldName) => (
                <li key={fieldName}>{fieldName}</li>
              ))}
            </ul>
            <p className="text-sm text-red-800 mt-2">
              Please review and fix the conditional logic to remove circular references.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = values[field.name];
        const visible = isFieldVisible(field.name);

        return (
          <ConditionalFieldWrapper
            key={field.name}
            field={field}
            isVisible={visible}
          >
            {renderField(field, value, (newValue) =>
              handleFieldChange(field.name, newValue)
            )}
          </ConditionalFieldWrapper>
        );
      })}
    </div>
  );
};

export default FieldsRenderer;
