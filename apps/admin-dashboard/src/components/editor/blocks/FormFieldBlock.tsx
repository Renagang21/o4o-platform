/**
 * Form Field Block Component
 *
 * Individual form field (text, email, textarea, select, etc.)
 * Integrates with React Hook Form
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { BlockProps } from '@/blocks/registry/types';
import { FormFieldAttributes, getAttributes } from '@/blocks/definitions/form-types';

const FormFieldBlock: React.FC<BlockProps> = ({
  attributes,
  setAttributes,
  isSelected,
}) => {
  const { register, formState: { errors } } = useFormContext();

  const fieldAttributes = getAttributes<FormFieldAttributes>(attributes);

  const {
    name = '',
    label = 'Field Label',
    fieldType = 'text',
    placeholder = '',
    defaultValue = '',
    required = false,
    helpText = '',
    rows = 4,
    options = [],
    minLength = 0,
    maxLength = 0,
    min = 0,
    max = 0,
  } = fieldAttributes;

  const fieldError = name ? errors[name] : undefined;

  /**
   * Render field based on type
   */
  const renderField = () => {
    const commonProps = {
      id: name,
      ...register(name),
      placeholder,
      className: `w-full px-3 py-2 border rounded-md ${
        fieldError ? 'border-red-500' : 'border-gray-300'
      } focus:outline-none focus:ring-2 focus:ring-blue-500`,
    };

    switch (fieldType) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={rows}
          />
        );

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select an option...</option>
            {options.map((option, index: number) => {
              const optValue = typeof option === 'string' ? option : option.value;
              const optLabel = typeof option === 'string' ? option : option.label;
              return (
                <option key={index} value={optValue}>
                  {optLabel}
                </option>
              );
            })}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register(name)}
              id={name}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">{helpText}</span>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {options.map((option, index: number) => {
              const optValue = typeof option === 'string' ? option : option.value;
              const optLabel = typeof option === 'string' ? option : option.label;
              return (
                <label key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    {...register(name)}
                    value={optValue}
                    id={`${name}-${index}`}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm">{optLabel}</span>
                </label>
              );
            })}
          </div>
        );

      case 'file':
        return (
          <input
            type="file"
            {...register(name)}
            id={name}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        );

      default:
        return (
          <input
            type={fieldType}
            {...commonProps}
            {...(fieldType === 'number' && { min, max })}
          />
        );
    }
  };

  return (
    <div className="o4o-form-field-block mb-4">
      {/* Editor Settings Panel */}
      {isSelected && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
          <h4 className="font-semibold mb-2">Field Settings</h4>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-xs text-gray-600">Field Name:</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setAttributes?.({ name: e.target.value })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="field_name"
              />
            </label>

            <label>
              <span className="text-xs text-gray-600">Label:</span>
              <input
                type="text"
                value={label}
                onChange={(e) => setAttributes?.({ label: e.target.value })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              />
            </label>

            <label>
              <span className="text-xs text-gray-600">Field Type:</span>
              <select
                value={fieldType}
                onChange={(e) => setAttributes?.({ fieldType: e.target.value })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="number">Number</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select</option>
                <option value="checkbox">Checkbox</option>
                <option value="radio">Radio</option>
                <option value="file">File</option>
              </select>
            </label>

            <label>
              <span className="text-xs text-gray-600">Placeholder:</span>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setAttributes?.({ placeholder: e.target.value })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              />
            </label>

            <label className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setAttributes?.({ required: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-xs text-gray-600">Required</span>
            </label>

            <label className="col-span-2">
              <span className="text-xs text-gray-600">Map to Field:</span>
              <input
                type="text"
                value={fieldAttributes.mapToField || ''}
                onChange={(e) => setAttributes?.({ mapToField: e.target.value })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="title, content, excerpt, meta.{key}"
              />
            </label>

            {(fieldType === 'select' || fieldType === 'radio') && (
              <label className="col-span-2">
                <span className="text-xs text-gray-600">Options (one per line):</span>
                <textarea
                  value={Array.isArray(options) ? options.join('\n') : ''}
                  onChange={(e) => setAttributes?.({ options: e.target.value.split('\n').filter(Boolean) })}
                  className="w-full mt-1 px-2 py-1 border rounded text-sm"
                  rows={3}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Field Render */}
      <div className="form-field">
        {fieldType !== 'checkbox' && (
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {renderField()}

        {helpText && fieldType !== 'checkbox' && (
          <p className="mt-1 text-xs text-gray-500">{helpText}</p>
        )}

        {fieldError && (
          <p className="mt-1 text-xs text-red-600">
            {typeof fieldError === 'object' && 'message' in fieldError && typeof fieldError.message === 'string'
              ? fieldError.message
              : 'This field is required'}
          </p>
        )}
      </div>
    </div>
  );
};

export default FormFieldBlock;
