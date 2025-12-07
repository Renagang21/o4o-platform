/**
 * CMS V2 - View Create/Edit Form
 *
 * Form for creating and editing View Templates with JSON Editor
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Palette } from 'lucide-react';
import cmsAPI, { View, ViewStatus, ViewSchema } from '@/lib/cms';
import { useToast } from '@/contexts/ToastContext';
import FormSection from '@/components/cms/forms/FormSection';
import FormRow from '@/components/cms/forms/FormRow';
import InputText from '@/components/cms/forms/InputText';
import InputSlug from '@/components/cms/forms/InputSlug';
import Textarea from '@/components/cms/forms/Textarea';
import Dropdown from '@/components/cms/forms/Dropdown';
import JSONEditor from '@/components/cms/forms/JSONEditor';
import PreviewFrame from '@/components/cms/PreviewFrame';

interface FormData {
  name: string;
  slug: string;
  description: string;
  type: string;
  status: ViewStatus;
  schema: ViewSchema;
  postTypeSlug: string;
  tags: string[];
}

const defaultSchema: ViewSchema = {
  version: '2.0',
  type: 'standard',
  components: [
    {
      id: 'hero',
      type: 'Hero',
      props: {
        title: 'Welcome',
        subtitle: 'This is a new view',
      },
    },
  ],
  bindings: [],
  styles: {},
};

const initialFormData: FormData = {
  name: '',
  slug: '',
  description: '',
  type: 'standard',
  status: ViewStatus.DRAFT,
  schema: defaultSchema,
  postTypeSlug: '',
  tags: [],
};

export default function ViewForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const isEditMode = !!id;

  useEffect(() => {
    if (isEditMode) {
      loadView();
    }
  }, [id]);

  const loadView = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const view = await cmsAPI.getView(id);
      setFormData({
        name: view.name,
        slug: view.slug,
        description: view.description || '',
        type: view.type,
        status: view.status,
        schema: view.schema,
        postTypeSlug: view.postTypeSlug || '',
        tags: view.tags || [],
      });
    } catch (error) {
      console.error('Failed to load view:', error);
      toast.error('Failed to load view');
      navigate('/admin/cms/views');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }

    if (!formData.schema || !formData.schema.components) {
      newErrors.schema = 'Schema must have components array';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }

    try {
      setSaving(true);

      if (isEditMode && id) {
        await cmsAPI.updateView(id, formData);
        toast.success('View updated successfully', 2000);
        // Navigate after toast is visible - force refresh by using push navigation
        setTimeout(() => navigate('/admin/cms/views', { replace: false }), 2000);
      } else {
        await cmsAPI.createView(formData);
        toast.success('View created successfully', 2000);
        // Navigate after toast is visible - force refresh by using push navigation
        setTimeout(() => navigate('/admin/cms/views', { replace: false }), 2000);
      }
    } catch (error: any) {
      console.error('Failed to save view:', error);

      // Extract error message from API response
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save view';

      // Handle specific error cases
      if (error.response?.status === 409) {
        // Duplicate slug error
        toast.error(`Slug already exists. Please use a different slug.`);
        setErrors({ slug: 'This slug is already in use' });
      } else if (error.response?.status === 400) {
        // Validation error
        toast.error(errorMessage);
      } else {
        // Other errors
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePreview = () => {
    if (!formData.slug) {
      toast.error('Please enter a slug first');
      return;
    }
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/cms/views')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Views
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit View Template (JSON Mode)' : 'Create View Template'}
          </h1>
          <div className="flex items-center gap-2">
            {isEditMode && id && (
              <button
                type="button"
                onClick={() => navigate(`/admin/cms/views/${id}/designer`)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Palette className="w-4 h-4 mr-2" />
                Visual Designer
              </button>
            )}
            {formData.slug && (
              <button
                type="button"
                onClick={handlePreview}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <FormSection title="Basic Information" description="View template details">
          <FormRow label="Name" required error={errors.name}>
            <InputText
              value={formData.name}
              onChange={(value) => updateField('name', value)}
              placeholder="e.g., Product Detail View"
            />
          </FormRow>

          <FormRow label="Slug" required error={errors.slug} helpText="URL-friendly identifier">
            <InputSlug
              value={formData.slug}
              onChange={(value) => updateField('slug', value)}
              placeholder="e.g., product-detail"
              autoGenerate={!isEditMode}
              sourceValue={formData.name}
            />
          </FormRow>

          <FormRow label="Description">
            <Textarea
              value={formData.description}
              onChange={(value) => updateField('description', value)}
              placeholder="Brief description of this view template"
              rows={3}
            />
          </FormRow>

          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Type">
              <Dropdown
                value={formData.type}
                onChange={(value) => updateField('type', value)}
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'landing', label: 'Landing Page' },
                  { value: 'detail', label: 'Detail Page' },
                  { value: 'list', label: 'List Page' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </FormRow>

            <FormRow label="Status">
              <Dropdown
                value={formData.status}
                onChange={(value) => updateField('status', value as ViewStatus)}
                options={[
                  { value: ViewStatus.ACTIVE, label: 'Active' },
                  { value: ViewStatus.DRAFT, label: 'Draft' },
                  { value: ViewStatus.ARCHIVED, label: 'Archived' },
                ]}
              />
            </FormRow>
          </div>

          <FormRow label="Post Type Slug (Optional)" helpText="Associate this view with a specific CPT">
            <InputText
              value={formData.postTypeSlug}
              onChange={(value) => updateField('postTypeSlug', value)}
              placeholder="e.g., product"
            />
          </FormRow>
        </FormSection>

        {/* View Schema Editor */}
        <FormSection
          title="View Schema (JSON)"
          description="Define the components, layout, and bindings for this view"
        >
          {errors.schema && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.schema}</p>
            </div>
          )}
          <JSONEditor
            value={formData.schema}
            onChange={(value) => updateField('schema', value)}
            minHeight="500px"
          />
          <div className="mt-2 text-xs text-gray-500">
            <p>Schema must include:</p>
            <ul className="list-disc list-inside ml-2 mt-1">
              <li><code className="bg-gray-100 px-1 rounded">version</code>: Schema version (e.g., "2.0")</li>
              <li><code className="bg-gray-100 px-1 rounded">type</code>: View type</li>
              <li><code className="bg-gray-100 px-1 rounded">components</code>: Array of UI components</li>
            </ul>
          </div>
        </FormSection>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/admin/cms/views')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Update View' : 'Create View'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {showPreview && formData.slug && (
        <PreviewFrame
          slug={formData.slug}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
