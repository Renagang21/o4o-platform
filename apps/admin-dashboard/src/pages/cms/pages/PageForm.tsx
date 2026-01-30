/**
 * CMS V2 - Page Create/Edit Form
 *
 * Form for creating and editing Pages with Publishing Workflow
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Eye, Calendar } from 'lucide-react';
import cmsAPI, { Page, PageStatus, View, PageSEO } from '@/lib/cms';
import { useToast } from '@/contexts/ToastContext';
import FormSection from '@/components/cms/forms/FormSection';
import FormRow from '@/components/cms/forms/FormRow';
import InputText from '@/components/cms/forms/InputText';
import InputSlug from '@/components/cms/forms/InputSlug';
import Textarea from '@/components/cms/forms/Textarea';
import Dropdown from '@/components/cms/forms/Dropdown';
import DateTimePicker from '@/components/cms/forms/DateTimePicker';
import JSONEditor from '@/components/cms/forms/JSONEditor';
import PreviewFrame from '@/components/cms/PreviewFrame';

interface FormData {
  title: string;
  slug: string;
  viewId: string;
  content: Record<string, any>;
  seo: PageSEO;
  status: PageStatus;
  scheduledAt: string;
  tags: string[];
  metadata: Record<string, any>;
}

const initialFormData: FormData = {
  title: '',
  slug: '',
  viewId: '',
  content: {},
  seo: {
    title: '',
    description: '',
    keywords: [],
    noIndex: false,
  },
  status: PageStatus.DRAFT,
  scheduledAt: '',
  tags: [],
  metadata: {},
};

export default function PageForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [views, setViews] = useState<View[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const isEditMode = !!id;

  useEffect(() => {
    loadViews();
    if (isEditMode) {
      loadPage();
    }
  }, [id]);

  const loadViews = async () => {
    try {
      const response = await cmsAPI.listViews({ status: 'active' as any });
      setViews(response.data);
    } catch (error) {
      console.error('Failed to load views:', error);
    }
  };

  const loadPage = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const page = await cmsAPI.getPage(id);
      setFormData({
        title: page.title,
        slug: page.slug,
        viewId: page.viewId || '',
        content: page.content || {},
        seo: page.seo || initialFormData.seo,
        status: page.status,
        scheduledAt: page.scheduledAt || '',
        tags: page.tags || [],
        metadata: page.metadata || {},
      });
    } catch (error) {
      console.error('Failed to load page:', error);
      toast.error('Failed to load page');
      navigate('/admin/cms/pages');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }

    if (formData.status === PageStatus.SCHEDULED && !formData.scheduledAt) {
      newErrors.scheduledAt = 'Schedule date is required for scheduled pages';
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
        await cmsAPI.updatePage(id, formData);
        toast.success('Page updated successfully', 2000);
        // Navigate after toast is visible - force refresh by using push navigation
        setTimeout(() => navigate('/admin/cms/pages', { replace: false }), 2000);
      } else {
        await cmsAPI.createPage(formData);
        toast.success('Page created successfully', 2000);
        // Navigate after toast is visible - force refresh by using push navigation
        setTimeout(() => navigate('/admin/cms/pages', { replace: false }), 2000);
      }
    } catch (error: any) {
      console.error('Failed to save page:', error);

      // Extract error message from API response
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save page';

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

  const handlePublish = async () => {
    if (!isEditMode || !id) {
      toast.error('Please save the page first');
      return;
    }

    try {
      setPublishing(true);
      await cmsAPI.publishPage(id);
      toast.success('Page published successfully');
      navigate('/admin/cms/pages');
    } catch (error: any) {
      console.error('Failed to publish page:', error);
      toast.error(error.response?.data?.message || 'Failed to publish page');
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!isEditMode || !id) {
      toast.error('Please save the page first');
      return;
    }

    if (!formData.scheduledAt) {
      toast.error('Please set a schedule date');
      return;
    }

    try {
      setPublishing(true);
      await cmsAPI.schedulePage(id, formData.scheduledAt);
      toast.success('Page scheduled successfully');
      navigate('/admin/cms/pages');
    } catch (error: any) {
      console.error('Failed to schedule page:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule page');
    } finally {
      setPublishing(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const updateSEOField = <K extends keyof PageSEO>(field: K, value: PageSEO[K]) => {
    setFormData(prev => ({
      ...prev,
      seo: { ...prev.seo, [field]: value },
    }));
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
          onClick={() => navigate('/admin/cms/pages')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pages
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Page' : 'Create Page'}
          </h1>
          {formData.slug && (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <FormSection title="Basic Information" description="Page details and content">
          <FormRow label="Title" required error={errors.title}>
            <InputText
              value={formData.title}
              onChange={(value) => updateField('title', value)}
              placeholder="e.g., About Us"
            />
          </FormRow>

          <FormRow label="Slug" required error={errors.slug} helpText="URL path for this page">
            <InputSlug
              value={formData.slug}
              onChange={(value) => updateField('slug', value)}
              placeholder="e.g., about-us"
              autoGenerate={!isEditMode}
              sourceValue={formData.title}
            />
          </FormRow>

          <FormRow label="View Template" helpText="Choose a view template to render this page">
            <Dropdown
              value={formData.viewId}
              onChange={(value) => updateField('viewId', value)}
              options={views.map(view => ({ value: view.id, label: view.name }))}
              placeholder="Select a view template"
            />
          </FormRow>

          <FormRow label="Status" required>
            <Dropdown
              value={formData.status}
              onChange={(value) => updateField('status', value as PageStatus)}
              options={[
                { value: PageStatus.DRAFT, label: 'Draft' },
                { value: PageStatus.PUBLISHED, label: 'Published' },
                { value: PageStatus.SCHEDULED, label: 'Scheduled' },
                { value: PageStatus.ARCHIVED, label: 'Archived' },
              ]}
            />
          </FormRow>

          {formData.status === PageStatus.SCHEDULED && (
            <FormRow label="Schedule Date" required error={errors.scheduledAt}>
              <DateTimePicker
                value={formData.scheduledAt}
                onChange={(value) => updateField('scheduledAt', value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </FormRow>
          )}
        </FormSection>

        {/* SEO */}
        <FormSection title="SEO Settings" description="Search engine optimization">
          <FormRow label="SEO Title" helpText="Page title for search engines (defaults to page title)">
            <InputText
              value={formData.seo.title || ''}
              onChange={(value) => updateSEOField('title', value)}
              placeholder={formData.title || 'SEO Title'}
            />
          </FormRow>

          <FormRow label="SEO Description" helpText="Meta description for search results">
            <Textarea
              value={formData.seo.description || ''}
              onChange={(value) => updateSEOField('description', value)}
              placeholder="Brief description for search engines"
              rows={3}
              maxLength={160}
            />
          </FormRow>
        </FormSection>

        {/* Page Content */}
        <FormSection
          title="Page Content (JSON)"
          description="Custom data for this page (accessible in view template)"
        >
          <JSONEditor
            value={formData.content}
            onChange={(value) => updateField('content', value)}
            minHeight="300px"
          />
        </FormSection>

        {/* Metadata */}
        <FormSection
          title="Metadata (Optional)"
          description="Additional metadata for custom features"
        >
          <JSONEditor
            value={formData.metadata}
            onChange={(value) => updateField('metadata', value)}
            minHeight="200px"
          />
        </FormSection>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/admin/cms/pages')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={saving || publishing}
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {/* Save as Draft */}
            <button
              type="submit"
              disabled={saving || publishing}
              className="inline-flex items-center px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </>
              )}
            </button>

            {/* Publish Now */}
            {isEditMode && formData.status === PageStatus.DRAFT && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving || publishing}
                className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish Now
                  </>
                )}
              </button>
            )}

            {/* Schedule */}
            {isEditMode && formData.status === PageStatus.SCHEDULED && (
              <button
                type="button"
                onClick={handleSchedule}
                disabled={saving || publishing || !formData.scheduledAt}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Page
                  </>
                )}
              </button>
            )}
          </div>
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
