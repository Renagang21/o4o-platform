/**
 * Front-end Form Renderer
 * Renders forms created with FormBuilder and handles submission
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

// Form Field Types
export interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: any;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: string;
  };
  order: number;
}

export interface FormData {
  id: string;
  name: string;
  description?: string;
  type: 'contact' | 'post' | 'user' | 'search' | 'cpt';
  cptSlug?: string;
  status: 'active' | 'inactive';
  fields: FormField[];
  settings: {
    submitAction?: 'create_post' | 'create_user' | 'send_email' | 'both';
    userRole?: string;
    redirectUrl?: string;
    successMessage?: string;
    errorMessage?: string;
    notification?: {
      enabled: boolean;
      email?: string;
    };
  };
}

export interface FormRendererProps {
  /** Form ID to load */
  formId?: string;
  /** Form slug to load (alternative to formId) */
  formSlug?: string;
  /** Pre-loaded form data (skip fetching) */
  formData?: FormData;
  /** Custom submit handler (overrides default) */
  onSubmit?: (values: Record<string, any>) => Promise<void>;
  /** Custom success callback */
  onSuccess?: (response: any) => void;
  /** Custom error callback */
  onError?: (error: any) => void;
  /** Additional CSS classes */
  className?: string;
  /** Show form title */
  showTitle?: boolean;
  /** Show form description */
  showDescription?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  formId,
  formSlug,
  formData: providedFormData,
  onSubmit: customSubmit,
  onSuccess,
  onError,
  className = '',
  showTitle = true,
  showDescription = true,
}) => {
  const [formData, setFormData] = useState<FormData | null>(providedFormData || null);
  const [loading, setLoading] = useState(!providedFormData);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load form data if not provided
  React.useEffect(() => {
    if (providedFormData) {
      setFormData(providedFormData);
      setLoading(false);
      return;
    }

    if (!formId && !formSlug) {
      console.error('FormRenderer: Either formId or formSlug must be provided');
      setLoading(false);
      return;
    }

    const loadForm = async () => {
      try {
        setLoading(true);
        const endpoint = formId
          ? `/api/cpt-engine/forms/${formId}`
          : `/api/cpt-engine/forms/slug/${formSlug}`;

        const response = await authClient.fetch(endpoint);
        const data = await response.json();

        if (data.success && data.data) {
          setFormData(data.data);
        } else {
          throw new Error(data.error || 'Failed to load form');
        }
      } catch (error) {
        console.error('FormRenderer: Error loading form:', error);
        setSubmitError(error instanceof Error ? error.message : 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [formId, formSlug, providedFormData]);

  // Sorted fields by order
  const sortedFields = useMemo(() => {
    if (!formData?.fields) return [];
    return [...formData.fields].sort((a, b) => a.order - b.order);
  }, [formData]);

  // Validate single field
  const validateField = useCallback((field: FormField, value: any): string | null => {
    // Required validation
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`;
    }

    if (!value || (typeof value === 'string' && !value.trim())) {
      return null; // Skip other validations if empty and not required
    }

    const validation = field.validation;
    if (!validation) return null;

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return `${field.label} format is invalid`;
      }
    }

    // Length validation
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `${field.label} must be at most ${validation.maxLength} characters`;
      }
    }

    // Number validation
    if (field.type === 'number' && typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `${field.label} must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `${field.label} must be at most ${validation.max}`;
      }
    }

    // Email validation
    if (field.type === 'email' && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${field.label} must be a valid email address`;
      }
    }

    // URL validation
    if (field.type === 'url' && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        return `${field.label} must be a valid URL`;
      }
    }

    return null;
  }, []);

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationError[] = [];

    sortedFields.forEach(field => {
      const value = values[field.name];
      const error = validateField(field, value);

      if (error) {
        newErrors.push({ field: field.name, message: error });
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [sortedFields, values, validateField]);

  // Handle field change
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    setErrors(prev => prev.filter(e => e.field !== fieldName));
    setSubmitError(null);
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      if (customSubmit) {
        // Use custom submit handler
        await customSubmit(values);
      } else {
        // Default submit handler
        const response = await authClient.fetch('/api/cpt-engine/forms/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: formData?.id,
            values,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Form submission failed');
        }

        // Success
        setSuccess(true);
        setValues({}); // Reset form

        if (onSuccess) {
          onSuccess(result.data);
        }

        // Redirect if configured
        if (formData?.settings.redirectUrl) {
          setTimeout(() => {
            window.location.href = formData.settings.redirectUrl!;
          }, 1500);
        }
      }
    } catch (error) {
      console.error('FormRenderer: Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setSubmitError(errorMessage);

      if (onError) {
        onError(error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Render field input
  const renderField = (field: FormField) => {
    const value = values[field.name] || '';
    const fieldErrors = errors.filter(e => e.field === field.name);
    const hasError = fieldErrors.length > 0;

    const commonProps = {
      id: field.name,
      name: field.name,
      required: field.required,
      placeholder: field.placeholder,
      disabled: submitting,
      className: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        hasError ? 'border-red-500' : 'border-gray-300'
      }`,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        handleFieldChange(field.name, e.target.value);
      },
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'tel':
        return <input type={field.type} {...commonProps} />;

      case 'number':
        return (
          <input
            type="number"
            {...commonProps}
            min={field.validation?.min}
            max={field.validation?.max}
            onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || '')}
          />
        );

      case 'textarea':
        return <textarea {...commonProps} rows={4} />;

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select...</option>
            {field.options?.choices?.map((choice: any) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.name}
              name={field.name}
              checked={!!value}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              disabled={submitting}
              className="w-4 h-4"
            />
            <label htmlFor={field.name} className="text-sm">
              {field.description || field.label}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.choices?.map((choice: any) => (
              <div key={choice.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`${field.name}_${choice.value}`}
                  name={field.name}
                  value={choice.value}
                  checked={value === choice.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  disabled={submitting}
                  className="w-4 h-4"
                />
                <label htmlFor={`${field.name}_${choice.value}`} className="text-sm">
                  {choice.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'date':
        return <input type="date" {...commonProps} />;

      case 'time':
        return <input type="time" {...commonProps} />;

      case 'datetime':
        return <input type="datetime-local" {...commonProps} />;

      default:
        return (
          <div className="text-sm text-gray-500 italic">
            Field type "{field.type}" not yet implemented
          </div>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading form...</span>
      </div>
    );
  }

  // Form not found
  if (!formData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Form not found. Please check the form ID or slug.
        </AlertDescription>
      </Alert>
    );
  }

  // Inactive form
  if (formData.status === 'inactive') {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This form is currently inactive and cannot be submitted.
        </AlertDescription>
      </Alert>
    );
  }

  // Success state
  if (success) {
    const successMessage = formData.settings.successMessage || 'Form submitted successfully!';
    return (
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          {successMessage}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`form-renderer ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Header */}
        {(showTitle || showDescription) && (
          <div className="form-header">
            {showTitle && formData.name && (
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {formData.name}
              </h2>
            )}
            {showDescription && formData.description && (
              <p className="text-gray-600">{formData.description}</p>
            )}
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {sortedFields.map(field => {
            const fieldErrors = errors.filter(e => e.field === field.name);

            return (
              <div key={field.id} className="form-field">
                {/* Field Label (skip for checkbox type) */}
                {field.type !== 'checkbox' && (
                  <label
                    htmlFor={field.name}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}

                {/* Field Description (skip for checkbox, shown inline) */}
                {field.type !== 'checkbox' && field.description && (
                  <p className="text-sm text-gray-500 mb-2">{field.description}</p>
                )}

                {/* Field Input */}
                {renderField(field)}

                {/* Field Errors */}
                {fieldErrors.map((error, index) => (
                  <p key={index} className="text-sm text-red-600 mt-1">
                    {error.message}
                  </p>
                ))}
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="form-footer">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FormRenderer;
