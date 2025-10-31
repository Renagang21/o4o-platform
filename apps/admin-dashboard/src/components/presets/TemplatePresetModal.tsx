import React, { useState } from 'react';
import { X, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { templatePresetsApi } from '@/api/presets';
import type { TemplatePreset, CreateTemplatePresetRequest, UpdateTemplatePresetRequest, TemplateLayoutType } from '@o4o/types';
import toast from 'react-hot-toast';

interface TemplatePresetModalProps {
  preset?: TemplatePreset | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TemplatePresetModal: React.FC<TemplatePresetModalProps> = ({ preset, onClose, onSuccess }) => {
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
    layoutType: preset?.config.layout.type || '1-column' as TemplateLayoutType,
    headerBlocks: JSON.stringify(preset?.config.layout.header?.blocks || [], null, 2),
    mainBlocks: JSON.stringify(preset?.config.layout.main?.blocks || [], null, 2),
    sidebarBlocks: JSON.stringify(preset?.config.layout.sidebar?.blocks || [], null, 2),
    footerBlocks: JSON.stringify(preset?.config.layout.footer?.blocks || [], null, 2),
    // SEO
    seoTitleTemplate: preset?.config.seoMeta.titleTemplate || '{title} | My Site',
    seoDescriptionField: preset?.config.seoMeta.descriptionField || '',
    seoOgImageField: preset?.config.seoMeta.ogImageField || '',
    seoKeywords: preset?.config.seoMeta.keywords?.join(', ') || '',
    seoKeywordsField: preset?.config.seoMeta.keywordsField || ''
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

    if (!formData.seoTitleTemplate.trim()) {
      newErrors.seoTitleTemplate = 'SEO Title Template is required';
    }

    // Validate JSON fields
    try {
      JSON.parse(formData.headerBlocks);
    } catch (e) {
      newErrors.headerBlocks = 'Invalid JSON format for header blocks';
    }

    try {
      JSON.parse(formData.mainBlocks);
    } catch (e) {
      newErrors.mainBlocks = 'Invalid JSON format for main blocks';
    }

    try {
      JSON.parse(formData.sidebarBlocks);
    } catch (e) {
      newErrors.sidebarBlocks = 'Invalid JSON format for sidebar blocks';
    }

    try {
      JSON.parse(formData.footerBlocks);
    } catch (e) {
      newErrors.footerBlocks = 'Invalid JSON format for footer blocks';
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
      const headerBlocks = JSON.parse(formData.headerBlocks);
      const mainBlocks = JSON.parse(formData.mainBlocks);
      const sidebarBlocks = JSON.parse(formData.sidebarBlocks);
      const footerBlocks = JSON.parse(formData.footerBlocks);

      const config = {
        layout: {
          type: formData.layoutType,
          ...(headerBlocks.length > 0 && { header: { blocks: headerBlocks } }),
          main: { blocks: mainBlocks },
          ...(sidebarBlocks.length > 0 && { sidebar: { blocks: sidebarBlocks } }),
          ...(footerBlocks.length > 0 && { footer: { blocks: footerBlocks } })
        },
        seoMeta: {
          titleTemplate: formData.seoTitleTemplate.trim(),
          descriptionField: formData.seoDescriptionField.trim() || undefined,
          ogImageField: formData.seoOgImageField.trim() || undefined,
          keywords: formData.seoKeywords ? formData.seoKeywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
          keywordsField: formData.seoKeywordsField.trim() || undefined
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
        const updateData: UpdateTemplatePresetRequest = {
          ...requestData,
          isActive: formData.isActive
        };
        await templatePresetsApi.update(preset.id, updateData);
        toast.success('Template preset updated successfully');
      } else {
        await templatePresetsApi.create(requestData as CreateTemplatePresetRequest);
        toast.success('Template preset created successfully');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving template preset:', err);
      toast.error(err.message || 'Failed to save template preset');
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
            {isEdit ? 'Edit Template Preset' : 'Create Template Preset'}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Standard Single Page"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
                placeholder="Optional description of this template preset"
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.cptSlug ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., page, post, product"
              />
              {errors.cptSlug && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.cptSlug}
                </p>
              )}
            </div>

            {/* Layout Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Layout Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.layoutType}
                onChange={(e) => handleChange('layoutType', e.target.value as TemplateLayoutType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="1-column">1 Column</option>
                <option value="2-column-left">2 Column (Sidebar Left)</option>
                <option value="2-column-right">2 Column (Sidebar Right)</option>
                <option value="3-column">3 Column</option>
              </select>
            </div>

            {/* SEO Title Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SEO Title Template <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.seoTitleTemplate}
                onChange={(e) => handleChange('seoTitleTemplate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.seoTitleTemplate ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="{title} | My Site"
              />
              {errors.seoTitleTemplate && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.seoTitleTemplate}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Use {'{title}'} as placeholder for the post/page title
              </p>
            </div>

            {/* Is Active */}
            {isEdit && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., admin, editor, author"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to allow all roles</p>
                </div>

                {/* SEO Meta Fields */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">SEO Meta Configuration</h4>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Description Field (ACF Key)
                    </label>
                    <input
                      type="text"
                      value={formData.seoDescriptionField}
                      onChange={(e) => handleChange('seoDescriptionField', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., meta_description, excerpt"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      OG Image Field (ACF Key)
                    </label>
                    <input
                      type="text"
                      value={formData.seoOgImageField}
                      onChange={(e) => handleChange('seoOgImageField', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., featured_image, og_image"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Static Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.seoKeywords}
                      onChange={(e) => handleChange('seoKeywords', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., keyword1, keyword2, keyword3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Keywords Field (ACF Key)
                    </label>
                    <input
                      type="text"
                      value={formData.seoKeywordsField}
                      onChange={(e) => handleChange('seoKeywordsField', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., seo_keywords, tags"
                    />
                  </div>
                </div>

                {/* Block Configuration */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Block Configuration (JSON)</h4>

                  {/* Main Blocks */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Main Blocks <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.mainBlocks}
                      onChange={(e) => handleChange('mainBlocks', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm ${
                        errors.mainBlocks ? 'border-red-500' : 'border-gray-300'
                      }`}
                      rows={4}
                      placeholder='[]'
                    />
                    {errors.mainBlocks && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.mainBlocks}
                      </p>
                    )}
                  </div>

                  {/* Header Blocks */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Header Blocks
                    </label>
                    <textarea
                      value={formData.headerBlocks}
                      onChange={(e) => handleChange('headerBlocks', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm ${
                        errors.headerBlocks ? 'border-red-500' : 'border-gray-300'
                      }`}
                      rows={3}
                      placeholder='[]'
                    />
                    {errors.headerBlocks && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.headerBlocks}
                      </p>
                    )}
                  </div>

                  {/* Sidebar Blocks */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Sidebar Blocks
                    </label>
                    <textarea
                      value={formData.sidebarBlocks}
                      onChange={(e) => handleChange('sidebarBlocks', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm ${
                        errors.sidebarBlocks ? 'border-red-500' : 'border-gray-300'
                      }`}
                      rows={3}
                      placeholder='[]'
                    />
                    {errors.sidebarBlocks && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.sidebarBlocks}
                      </p>
                    )}
                  </div>

                  {/* Footer Blocks */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Footer Blocks
                    </label>
                    <textarea
                      value={formData.footerBlocks}
                      onChange={(e) => handleChange('footerBlocks', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm ${
                        errors.footerBlocks ? 'border-red-500' : 'border-gray-300'
                      }`}
                      rows={3}
                      placeholder='[]'
                    />
                    {errors.footerBlocks && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.footerBlocks}
                      </p>
                    )}
                  </div>
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
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePresetModal;
