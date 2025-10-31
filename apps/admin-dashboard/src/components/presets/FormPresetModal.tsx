import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { formPresetsApi } from '@/api/presets';
import type { FormPreset, CreateFormPresetRequest, UpdateFormPresetRequest } from '@o4o/types';
import toast from 'react-hot-toast';

interface FormPresetModalProps {
  preset?: FormPreset | null;
  onClose: () => void;
  onSuccess: () => void;
}

const FormPresetModal: React.FC<FormPresetModalProps> = ({ preset, onClose, onSuccess }) => {
  const isEdit = !!preset;
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: preset?.name || '',
    description: preset?.description || '',
    cptSlug: preset?.cptSlug || '',
    version: preset?.version || 1,
    isActive: preset?.isActive ?? true,
    roles: preset?.roles?.join(', ') || '',
    // Config
    layoutColumns: preset?.config.layout.columns || 1,
    fields: JSON.stringify(preset?.config.fields || [], null, 2),
    sections: JSON.stringify(preset?.config.layout.sections || [], null, 2),
    validation: JSON.stringify(preset?.config.validation || [], null, 2),
    submitRedirectTo: preset?.config.submitBehavior?.redirectTo || '',
    showSuccessMessage: preset?.config.submitBehavior?.showSuccessMessage ?? true,
    successMessage: preset?.config.submitBehavior?.successMessage || 'Form submitted successfully!'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

    if (!formData.cptSlug.trim()) {
      newErrors.cptSlug = 'CPT Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.cptSlug)) {
      newErrors.cptSlug = 'CPT Slug must contain only lowercase letters, numbers, and hyphens';
    }

    if (formData.version < 1) {
      newErrors.version = 'Version must be a positive integer';
    }

    // Validate JSON fields
    try {
      JSON.parse(formData.fields);
    } catch (e) {
      newErrors.fields = 'Invalid JSON format for fields';
    }

    try {
      JSON.parse(formData.sections);
    } catch (e) {
      newErrors.sections = 'Invalid JSON format for sections';
    }

    try {
      JSON.parse(formData.validation);
    } catch (e) {
      newErrors.validation = 'Invalid JSON format for validation';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }

    setLoading(true);

    try {
      const config = {
        fields: JSON.parse(formData.fields),
        layout: {
          columns: formData.layoutColumns as 1 | 2 | 3,
          sections: JSON.parse(formData.sections)
        },
        validation: JSON.parse(formData.validation),
        submitBehavior: {
          redirectTo: formData.submitRedirectTo || undefined,
          showSuccessMessage: formData.showSuccessMessage,
          successMessage: formData.successMessage || undefined
        }
      };

      const requestData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        cptSlug: formData.cptSlug.trim(),
        config,
        roles: formData.roles ? formData.roles.split(',').map(r => r.trim()).filter(Boolean) : undefined
      };

      if (isEdit && preset) {
        const updateData: UpdateFormPresetRequest = {
          ...requestData,
          isActive: formData.isActive
        };
        await formPresetsApi.update(preset.id, updateData);
        toast.success('Form preset updated successfully');
      } else {
        await formPresetsApi.create(requestData as CreateFormPresetRequest);
        toast.success('Form preset created successfully');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving form preset:', err);
      toast.error(err.message || 'Failed to save form preset');
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Form Preset' : 'Create Form Preset'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Information</h3>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Standard Contact Form"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Optional description of this form preset"
              />
            </div>

            {/* CPT Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPT Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.cptSlug}
                onChange={(e) => handleChange('cptSlug', e.target.value.toLowerCase())}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cptSlug ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., contact, product, event"
              />
              {errors.cptSlug && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.cptSlug}
                </p>
              )}
            </div>

            {/* Layout Columns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Layout Columns
              </label>
              <select
                value={formData.layoutColumns}
                onChange={(e) => handleChange('layoutColumns', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>1 Column</option>
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
              </select>
            </div>

            {/* Is Active */}
            {isEdit && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            )}
          </div>

          {/* Advanced Section */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Advanced Configuration
            </button>

            {showAdvanced && (
              <div className="space-y-4">
                {/* Version */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.version}
                    onChange={(e) => handleChange('version', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Roles */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Roles (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.roles}
                    onChange={(e) => handleChange('roles', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., admin, editor, author"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to allow all roles</p>
                </div>

                {/* Fields (JSON) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fields (JSON)
                  </label>
                  <textarea
                    value={formData.fields}
                    onChange={(e) => handleChange('fields', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                      errors.fields ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows={4}
                    placeholder='[]'
                  />
                  {errors.fields && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.fields}
                    </p>
                  )}
                </div>

                {/* Sections (JSON) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sections (JSON)
                  </label>
                  <textarea
                    value={formData.sections}
                    onChange={(e) => handleChange('sections', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                      errors.sections ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows={4}
                    placeholder='[]'
                  />
                  {errors.sections && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.sections}
                    </p>
                  )}
                </div>

                {/* Validation (JSON) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validation Rules (JSON)
                  </label>
                  <textarea
                    value={formData.validation}
                    onChange={(e) => handleChange('validation', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                      errors.validation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows={4}
                    placeholder='[]'
                  />
                  {errors.validation && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.validation}
                    </p>
                  )}
                </div>

                {/* Submit Behavior */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Submit Behavior</h4>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Redirect URL (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.submitRedirectTo}
                      onChange={(e) => handleChange('submitRedirectTo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="/thank-you"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showSuccessMessage"
                      checked={formData.showSuccessMessage}
                      onChange={(e) => handleChange('showSuccessMessage', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showSuccessMessage" className="text-sm text-gray-600">
                      Show success message
                    </label>
                  </div>

                  {formData.showSuccessMessage && (
                    <div>
                      <input
                        type="text"
                        value={formData.successMessage}
                        onChange={(e) => handleChange('successMessage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Success message"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormPresetModal;
