/**
 * CMS V2 - CPT Create/Edit Form
 *
 * Form for creating and editing Custom Post Types
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import cmsAPI, { CPT, CPTStatus } from '@/lib/cms';
import toast from 'react-hot-toast';
import FormSection from '@/components/cms/forms/FormSection';
import FormRow from '@/components/cms/forms/FormRow';
import InputText from '@/components/cms/forms/InputText';
import InputSlug from '@/components/cms/forms/InputSlug';
import Textarea from '@/components/cms/forms/Textarea';
import Dropdown from '@/components/cms/forms/Dropdown';
import Switch from '@/components/cms/forms/Switch';
import JSONEditor from '@/components/cms/forms/JSONEditor';

interface FormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  status: CPTStatus;
  isPublic: boolean;
  isHierarchical: boolean;
  supportedFeatures: string[];
  schema: any;
}

const initialFormData: FormData = {
  name: '',
  slug: '',
  description: '',
  icon: 'FileText',
  status: CPTStatus.DRAFT,
  isPublic: true,
  isHierarchical: false,
  supportedFeatures: ['title', 'editor', 'thumbnail'],
  schema: {},
};

export default function CPTForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!id;

  useEffect(() => {
    if (isEditMode) {
      loadCPT();
    }
  }, [id]);

  const loadCPT = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const cpt = await cmsAPI.getCPT(id);
      setFormData({
        name: cpt.name,
        slug: cpt.slug,
        description: cpt.description || '',
        icon: cpt.icon,
        status: cpt.status,
        isPublic: cpt.isPublic,
        isHierarchical: cpt.isHierarchical,
        supportedFeatures: cpt.supportedFeatures || [],
        schema: cpt.schema || {},
      });
    } catch (error) {
      console.error('Failed to load CPT:', error);
      toast.error('Failed to load CPT');
      navigate('/admin/cms/cpts');
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

    if (!formData.icon.trim()) {
      newErrors.icon = 'Icon is required';
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
        await cmsAPI.updateCPT(id, formData);
        toast.success('CPT updated successfully');
      } else {
        await cmsAPI.createCPT(formData);
        toast.success('CPT created successfully');
      }

      navigate('/admin/cms/cpts');
    } catch (error: any) {
      console.error('Failed to save CPT:', error);
      toast.error(error.response?.data?.message || 'Failed to save CPT');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/cms/cpts')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to CPTs
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Custom Post Type' : 'Create Custom Post Type'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <FormSection title="Basic Information" description="Core details about this post type">
          <FormRow label="Name" required error={errors.name}>
            <InputText
              value={formData.name}
              onChange={(value) => updateField('name', value)}
              placeholder="e.g., Product"
            />
          </FormRow>

          <FormRow label="Slug" required error={errors.slug} helpText="URL-friendly identifier">
            <InputSlug
              value={formData.slug}
              onChange={(value) => updateField('slug', value)}
              placeholder="e.g., product"
              autoGenerate={!isEditMode}
              sourceValue={formData.name}
            />
          </FormRow>

          <FormRow label="Description" error={errors.description}>
            <Textarea
              value={formData.description}
              onChange={(value) => updateField('description', value)}
              placeholder="Brief description of this post type"
              rows={3}
            />
          </FormRow>

          <FormRow label="Icon" required error={errors.icon} helpText="Lucide icon name">
            <InputText
              value={formData.icon}
              onChange={(value) => updateField('icon', value)}
              placeholder="e.g., FileText, Package, ShoppingCart"
            />
          </FormRow>

          <FormRow label="Status" required>
            <Dropdown
              value={formData.status}
              onChange={(value) => updateField('status', value as CPTStatus)}
              options={[
                { value: CPTStatus.ACTIVE, label: 'Active' },
                { value: CPTStatus.DRAFT, label: 'Draft' },
                { value: CPTStatus.ARCHIVED, label: 'Archived' },
              ]}
            />
          </FormRow>
        </FormSection>

        {/* Options */}
        <FormSection title="Options" description="Configure post type behavior">
          <FormRow label="Public" helpText="Is this post type visible to the public?">
            <Switch
              value={formData.isPublic}
              onChange={(value) => updateField('isPublic', value)}
              label="Publicly accessible"
            />
          </FormRow>

          <FormRow label="Hierarchical" helpText="Enable parent-child relationships (like pages)">
            <Switch
              value={formData.isHierarchical}
              onChange={(value) => updateField('isHierarchical', value)}
              label="Hierarchical structure"
            />
          </FormRow>
        </FormSection>

        {/* Advanced Schema */}
        <FormSection
          title="Advanced Schema (Optional)"
          description="Custom JSON schema for additional configuration"
        >
          <JSONEditor
            value={formData.schema}
            onChange={(value) => updateField('schema', value)}
            minHeight="300px"
          />
        </FormSection>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/admin/cms/cpts')}
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
                {isEditMode ? 'Update CPT' : 'Create CPT'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
