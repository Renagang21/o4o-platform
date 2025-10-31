import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { viewPresetsApi } from '@/api/presets';
import type { ViewPreset, CreateViewPresetRequest, UpdateViewPresetRequest, ViewRenderMode } from '@o4o/types';
import toast from 'react-hot-toast';

interface ViewPresetModalProps {
  preset?: ViewPreset | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ViewPresetModal: React.FC<ViewPresetModalProps> = ({ preset, onClose, onSuccess }) => {
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
    renderMode: preset?.config.renderMode || 'list' as ViewRenderMode,
    fields: JSON.stringify(preset?.config.fields || [], null, 2),
    sortField: preset?.config.defaultSort?.field || 'createdAt',
    sortOrder: preset?.config.defaultSort?.order || 'DESC',
    pageSize: preset?.config.pagination?.pageSize || 10,
    showPagination: preset?.config.pagination?.showPagination ?? true,
    showPageSizeSelector: preset?.config.pagination?.showPageSizeSelector ?? false,
    pageSizeOptions: preset?.config.pagination?.pageSizeOptions?.join(', ') || '10, 20, 50, 100',
    filters: JSON.stringify(preset?.config.filters || [], null, 2),
    searchEnabled: preset?.config.search?.enabled ?? false,
    searchFields: preset?.config.search?.fields?.join(', ') || '',
    searchPlaceholder: preset?.config.search?.placeholder || 'Search...'
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

    if (formData.pageSize < 1) {
      newErrors.pageSize = 'Page size must be a positive integer';
    }

    // Validate JSON fields
    try {
      JSON.parse(formData.fields);
    } catch (e) {
      newErrors.fields = 'Invalid JSON format for fields';
    }

    try {
      JSON.parse(formData.filters);
    } catch (e) {
      newErrors.filters = 'Invalid JSON format for filters';
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
        renderMode: formData.renderMode,
        fields: JSON.parse(formData.fields),
        defaultSort: {
          field: formData.sortField,
          order: formData.sortOrder as 'ASC' | 'DESC'
        },
        pagination: {
          pageSize: formData.pageSize,
          showPagination: formData.showPagination,
          showPageSizeSelector: formData.showPageSizeSelector,
          pageSizeOptions: formData.pageSizeOptions.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
        },
        filters: JSON.parse(formData.filters),
        search: formData.searchEnabled ? {
          enabled: true,
          fields: formData.searchFields.split(',').map(s => s.trim()).filter(Boolean),
          placeholder: formData.searchPlaceholder
        } : undefined
      };

      const requestData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        cptSlug: formData.cptSlug.trim(),
        config,
        roles: formData.roles ? formData.roles.split(',').map(r => r.trim()).filter(Boolean) : undefined
      };

      if (isEdit && preset) {
        const updateData: UpdateViewPresetRequest = {
          ...requestData,
          isActive: formData.isActive
        };
        await viewPresetsApi.update(preset.id, updateData);
        toast.success('View preset updated successfully');
      } else {
        await viewPresetsApi.create(requestData as CreateViewPresetRequest);
        toast.success('View preset created successfully');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving view preset:', err);
      toast.error(err.message || 'Failed to save view preset');
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
            {isEdit ? 'Edit View Preset' : 'Create View Preset'}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Latest 10 Posts List"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={2}
                placeholder="Optional description of this view preset"
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.cptSlug ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., post, product, event"
              />
              {errors.cptSlug && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.cptSlug}
                </p>
              )}
            </div>

            {/* Render Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Render Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.renderMode}
                onChange={(e) => handleChange('renderMode', e.target.value as ViewRenderMode)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="list">List</option>
                <option value="grid">Grid</option>
                <option value="card">Card</option>
                <option value="table">Table</option>
              </select>
            </div>

            {/* Default Sort */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Field
                </label>
                <input
                  type="text"
                  value={formData.sortField}
                  onChange={(e) => handleChange('sortField', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., createdAt, title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <select
                  value={formData.sortOrder}
                  onChange={(e) => handleChange('sortOrder', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="ASC">Ascending</option>
                  <option value="DESC">Descending</option>
                </select>
              </div>
            </div>

            {/* Pagination */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Pagination</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Page Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.pageSize}
                    onChange={(e) => handleChange('pageSize', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.pageSize ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.pageSize && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.pageSize}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showPagination"
                      checked={formData.showPagination}
                      onChange={(e) => handleChange('showPagination', e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="showPagination" className="text-sm text-gray-600">
                      Show pagination
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showPageSizeSelector"
                      checked={formData.showPageSizeSelector}
                      onChange={(e) => handleChange('showPageSizeSelector', e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="showPageSizeSelector" className="text-sm text-gray-600">
                      Show page size selector
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Is Active */}
            {isEdit && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., admin, editor, author"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to allow all roles</p>
                </div>

                {/* Page Size Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Size Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.pageSizeOptions}
                    onChange={(e) => handleChange('pageSizeOptions', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 10, 20, 50, 100"
                  />
                </div>

                {/* Fields (JSON) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fields (JSON)
                  </label>
                  <textarea
                    value={formData.fields}
                    onChange={(e) => handleChange('fields', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm ${
                      errors.fields ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows={6}
                    placeholder='[]'
                  />
                  {errors.fields && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.fields}
                    </p>
                  )}
                </div>

                {/* Filters (JSON) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filters (JSON)
                  </label>
                  <textarea
                    value={formData.filters}
                    onChange={(e) => handleChange('filters', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm ${
                      errors.filters ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows={4}
                    placeholder='[]'
                  />
                  {errors.filters && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.filters}
                    </p>
                  )}
                </div>

                {/* Search Configuration */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="searchEnabled"
                      checked={formData.searchEnabled}
                      onChange={(e) => handleChange('searchEnabled', e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="searchEnabled" className="text-sm font-medium text-gray-700">
                      Enable Search
                    </label>
                  </div>

                  {formData.searchEnabled && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Search Fields (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={formData.searchFields}
                          onChange={(e) => handleChange('searchFields', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="e.g., title, content, author"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Search Placeholder
                        </label>
                        <input
                          type="text"
                          value={formData.searchPlaceholder}
                          onChange={(e) => handleChange('searchPlaceholder', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Search..."
                        />
                      </div>
                    </>
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPresetModal;
