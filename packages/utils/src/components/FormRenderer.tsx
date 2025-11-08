import React, { useState } from 'react';
import type {
  FormPreset,
  PresetFieldConfig,
  PresetValidationRule,
  PresetConditionalLogic,
  PresetConditionalRule
} from '@o4o/types';

/**
 * Props for FormRenderer
 */
export interface FormRendererProps {
  preset: FormPreset;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
  className?: string;
}

/**
 * Field value state
 */
interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

/**
 * Check if field should be visible based on conditional logic
 */
function evaluateConditional(
  conditional: PresetConditionalLogic | undefined,
  values: Record<string, any>
): boolean {
  if (!conditional || !conditional.rules || conditional.rules.length === 0) {
    return true;
  }

  const results = conditional.rules.map((rule: PresetConditionalRule) => {
    const fieldValue = values[rule.field];
    const compareValue = rule.value;

    switch (rule.operator) {
      case '==':
        return fieldValue === compareValue;
      case '!=':
        return fieldValue !== compareValue;
      case '>':
        return Number(fieldValue) > Number(compareValue);
      case '<':
        return Number(fieldValue) < Number(compareValue);
      case 'contains':
        return String(fieldValue).includes(String(compareValue));
      default:
        return true;
    }
  });

  return conditional.operator === 'AND'
    ? results.every((r) => r)
    : results.some((r) => r);
}

/**
 * Validate a single field
 */
function validateField(
  fieldKey: string,
  value: any,
  validationRules: PresetValidationRule[]
): string | null {
  const rule = validationRules.find((r) => r.field === fieldKey);
  if (!rule) return null;

  switch (rule.type) {
    case 'required':
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return rule.message || 'This field is required';
      }
      break;
    case 'email':
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return rule.message || 'Invalid email address';
      }
      break;
    case 'url':
      if (value && !/^https?:\/\/.+/.test(value)) {
        return rule.message || 'Invalid URL';
      }
      break;
    case 'number':
      if (value && isNaN(Number(value))) {
        return rule.message || 'Must be a number';
      }
      break;
    case 'pattern':
      if (value && rule.pattern && !new RegExp(rule.pattern).test(value)) {
        return rule.message || 'Invalid format';
      }
      break;
  }

  return null;
}

/**
 * Render a single form field
 */
function renderField(
  fieldConfig: PresetFieldConfig,
  fieldType: string,
  state: FormState,
  setState: React.Dispatch<React.SetStateAction<FormState>>
): React.ReactNode {
  const { fieldKey } = fieldConfig;
  const value = state.values[fieldKey] || '';
  const error = state.touched[fieldKey] ? state.errors[fieldKey] : '';

  const handleChange = (newValue: any) => {
    setState((prev) => ({
      ...prev,
      values: { ...prev.values, [fieldKey]: newValue }
    }));
  };

  const handleBlur = () => {
    setState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [fieldKey]: true }
    }));
  };

  const inputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    error ? 'border-red-500' : 'border-gray-300'
  }`;

  // Basic field types - can be extended
  switch (fieldType) {
    case 'text':
    case 'email':
    case 'url':
      return (
        <input
          type={fieldType}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={fieldConfig.placeholder}
          className={inputClasses}
          disabled={state.isSubmitting}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={fieldConfig.placeholder}
          className={inputClasses}
          disabled={state.isSubmitting}
          rows={4}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={fieldConfig.placeholder}
          className={inputClasses}
          disabled={state.isSubmitting}
        />
      );

    case 'select':
      return (
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className={inputClasses}
          disabled={state.isSubmitting}
        >
          <option value="">Select...</option>
          {/* Options would come from field configuration */}
        </select>
      );

    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => handleChange(e.target.checked)}
          onBlur={handleBlur}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={state.isSubmitting}
        />
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {/* Radio options would come from field configuration */}
          <label className="flex items-center">
            <input
              type="radio"
              name={fieldKey}
              value="option1"
              checked={value === 'option1'}
              onChange={(e) => handleChange(e.target.value)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              disabled={state.isSubmitting}
            />
            <span className="ml-2">Option 1</span>
          </label>
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={fieldConfig.placeholder}
          className={inputClasses}
          disabled={state.isSubmitting}
        />
      );
  }
}

/**
 * FormRenderer Component
 *
 * Renders forms based on FormPreset configuration
 */
export function FormRenderer({
  preset,
  onSubmit,
  initialData = {},
  className = ''
}: FormRendererProps): React.ReactElement {
  const [state, setState] = useState<FormState>({
    values: initialData,
    errors: {},
    touched: {},
    isSubmitting: false
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Group fields by section
  const fieldsBySectionId = new Map<string | undefined, PresetFieldConfig[]>();
  preset.config.fields.forEach((field) => {
    const sectionId = field.sectionId;
    if (!fieldsBySectionId.has(sectionId)) {
      fieldsBySectionId.set(sectionId, []);
    }
    fieldsBySectionId.get(sectionId)?.push(field);
  });

  // Sort sections by order
  const sections = [...preset.config.layout.sections].sort((a, b) => a.order - b.order);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    preset.config.fields.forEach((fieldConfig) => {
      const error = validateField(
        fieldConfig.fieldKey,
        state.values[fieldConfig.fieldKey],
        preset.config.validation
      );
      if (error) {
        newErrors[fieldConfig.fieldKey] = error;
        hasErrors = true;
      }
    });

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    preset.config.fields.forEach((field) => {
      allTouched[field.fieldKey] = true;
    });

    setState((prev) => ({
      ...prev,
      errors: newErrors,
      touched: allTouched
    }));

    if (hasErrors) {
      return;
    }

    // Submit form
    setState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      await onSubmit(state.values);
      setSubmitSuccess(true);

      // Handle redirect if configured
      if (preset.config.submitBehavior.redirectTo) {
        window.location.href = preset.config.submitBehavior.redirectTo;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit form';
      setSubmitError(errorMessage);
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div className={`form-renderer ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Render sections */}
        {sections.map((section) => {
          const sectionFields = (fieldsBySectionId.get(section.id) || []).sort(
            (a, b) => a.order - b.order
          );

          if (sectionFields.length === 0) return null;

          return (
            <div
              key={section.id}
              className="border border-gray-200 rounded-lg p-6 bg-white"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {section.title}
              </h3>
              {section.description && (
                <p className="text-sm text-gray-600 mb-4">{section.description}</p>
              )}

              <div className="space-y-4">
                {sectionFields.map((fieldConfig) => {
                  // Check conditional logic
                  if (!evaluateConditional(fieldConfig.conditional, state.values)) {
                    return null;
                  }

                  // Get field type - would normally come from ACF field definition
                  const fieldType = 'text'; // Placeholder

                  const error = state.touched[fieldConfig.fieldKey]
                    ? state.errors[fieldConfig.fieldKey]
                    : '';

                  return (
                    <div key={fieldConfig.fieldKey} className="form-field">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {fieldConfig.fieldKey}
                        {fieldConfig.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>

                      {renderField(fieldConfig, fieldType, state, setState)}

                      {fieldConfig.helpText && (
                        <p className="text-xs text-gray-500 mt-1">
                          {fieldConfig.helpText}
                        </p>
                      )}

                      {error && (
                        <p className="text-xs text-red-600 mt-1">{error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Render fields without sections */}
        {fieldsBySectionId.has(undefined) && (
          <div className="space-y-4">
            {(fieldsBySectionId.get(undefined) || [])
              .sort((a, b) => a.order - b.order)
              .map((fieldConfig) => {
                if (!evaluateConditional(fieldConfig.conditional, state.values)) {
                  return null;
                }

                const fieldType = 'text';
                const error = state.touched[fieldConfig.fieldKey]
                  ? state.errors[fieldConfig.fieldKey]
                  : '';

                return (
                  <div key={fieldConfig.fieldKey} className="form-field">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {fieldConfig.fieldKey}
                      {fieldConfig.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>

                    {renderField(fieldConfig, fieldType, state, setState)}

                    {fieldConfig.helpText && (
                      <p className="text-xs text-gray-500 mt-1">
                        {fieldConfig.helpText}
                      </p>
                    )}

                    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                  </div>
                );
              })}
          </div>
        )}

        {/* Submit button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={state.isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {state.isSubmitting ? 'Submitting...' : 'Submit'}
          </button>

          {submitSuccess && preset.config.submitBehavior.showSuccessMessage && (
            <p className="text-sm text-green-600">
              {preset.config.submitBehavior.successMessage || 'Form submitted successfully!'}
            </p>
          )}

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
        </div>
      </form>
    </div>
  );
}
