/**
 * CMS V2 - Custom Field Create/Edit Form
 *
 * Form for creating and editing Custom Fields (ACF)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import cmsAPI, { CustomField, FieldType, CPT } from '@/lib/cms';
import toast from 'react-hot-toast';
import FormSection from '@/components/cms/forms/FormSection';
import FormRow from '@/components/cms/forms/FormRow';
import InputText from '@/components/cms/forms/InputText';
import Textarea from '@/components/cms/forms/Textarea';
import Dropdown from '@/components/cms/forms/Dropdown';
import Switch from '@/components/cms/forms/Switch';
import JSONEditor from '@/components/cms/forms/JSONEditor';

interface FormData {
  postTypeId: string;
  name: string;
  label: string;
  type: FieldType;
  groupName: string;
  order: number;
  required: boolean;
  config: Record<string, any>;
  conditionalLogic: any[];
}

const initialFormData: FormData = {
  postTypeId: '',
  name: '',
  label: '',
  type: FieldType.TEXT,
  groupName: '',
  order: 0,
  required: false,
  config: {},
  conditionalLogic: [],
};

export default function FieldForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [cpts, setCPTs] = useState<CPT[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!id;

  useEffect(() => {
    loadCPTs();
    if (isEditMode) {
      loadField();
    } else {
      // Pre-fill postTypeId from query params
      const postTypeId = searchParams.get('postTypeId');
      if (postTypeId) {
        setFormData(prev => ({ ...prev, postTypeId }));
      }
    }
  }, [id]);

  const loadCPTs = async () => {
    try {
      const response = await cmsAPI.listCPTs();
      setCPTs(response.data);
    } catch (error) {
      console.error('Failed to load CPTs:', error);
    }
  };

  const loadField = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const field = await cmsAPI.getField(id);
      setFormData({
        postTypeId: field.postTypeId,
        name: field.name,
        label: field.label,
        type: field.type,
        groupName: field.groupName || '',
        order: field.order,
        required: field.required,
        config: field.config || {},
        conditionalLogic: field.conditionalLogic || [],
      });
    } catch (error) {
      console.error('Failed to load field:', error);
      toast.error('Failed to load field');
      navigate('/admin/cms/fields');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.postTypeId) {
      newErrors.postTypeId = 'Post Type is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Label is required';
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
        await cmsAPI.updateField(id, formData);
        toast.success('Field updated successfully');
      } else {
        await cmsAPI.createField(formData);
        toast.success('Field created successfully');
      }

      navigate('/admin/cms/fields');
    } catch (error: any) {
      console.error('Failed to save field:', error);
      toast.error(error.response?.data?.message || 'Failed to save field');
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
          onClick={() => navigate('/admin/cms/fields')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Fields
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Custom Field' : 'Create Custom Field'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <FormSection title="Basic Information" description="Core field configuration">
          <FormRow label="Post Type" required error={errors.postTypeId}>
            <Dropdown
              value={formData.postTypeId}
              onChange={(value) => updateField('postTypeId', value)}
              options={cpts.map(cpt => ({ value: cpt.id, label: cpt.name }))}
              placeholder="Select a post type"
              disabled={isEditMode}
            />
          </FormRow>

          <FormRow label="Field Name" required error={errors.name} helpText="Internal field name (snake_case)">
            <InputText
              value={formData.name}
              onChange={(value) => updateField('name', value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              placeholder="e.g., product_price"
            />
          </FormRow>

          <FormRow label="Label" required error={errors.label} helpText="Display label for admins">
            <InputText
              value={formData.label}
              onChange={(value) => updateField('label', value)}
              placeholder="e.g., Product Price"
            />
          </FormRow>

          <FormRow label="Field Type" required>
            <Dropdown
              value={formData.type}
              onChange={(value) => updateField('type', value as FieldType)}
              options={[
                { value: FieldType.TEXT, label: 'Text' },
                { value: FieldType.TEXTAREA, label: 'Textarea' },
                { value: FieldType.RICHTEXT, label: 'Rich Text' },
                { value: FieldType.NUMBER, label: 'Number' },
                { value: FieldType.EMAIL, label: 'Email' },
                { value: FieldType.URL, label: 'URL' },
                { value: FieldType.DATE, label: 'Date' },
                { value: FieldType.DATETIME, label: 'Date Time' },
                { value: FieldType.BOOLEAN, label: 'Boolean' },
                { value: FieldType.SELECT, label: 'Select' },
                { value: FieldType.CHECKBOX, label: 'Checkbox' },
                { value: FieldType.IMAGE, label: 'Image' },
                { value: FieldType.FILE, label: 'File' },
                { value: FieldType.REPEATER, label: 'Repeater' },
                { value: FieldType.GROUP, label: 'Group' },
              ]}
            />
          </FormRow>
        </FormSection>

        {/* Organization */}
        <FormSection title="Organization" description="Field grouping and ordering">
          <FormRow label="Group Name" helpText="Optional group to organize related fields">
            <InputText
              value={formData.groupName}
              onChange={(value) => updateField('groupName', value)}
              placeholder="e.g., Product Details"
            />
          </FormRow>

          <FormRow label="Order" helpText="Display order (lower numbers appear first)">
            <InputText
              type="number"
              value={formData.order.toString()}
              onChange={(value) => updateField('order', parseInt(value) || 0)}
              placeholder="0"
            />
          </FormRow>
        </FormSection>

        {/* Validation */}
        <FormSection title="Validation" description="Field requirements">
          <FormRow label="Required Field">
            <Switch
              value={formData.required}
              onChange={(value) => updateField('required', value)}
              label="This field is required"
            />
          </FormRow>
        </FormSection>

        {/* Advanced Configuration */}
        <FormSection
          title="Advanced Configuration"
          description="Field-specific settings (placeholder, default value, choices, etc.)"
        >
          <JSONEditor
            value={formData.config}
            onChange={(value) => updateField('config', value)}
            minHeight="200px"
          />
        </FormSection>

        {/* Conditional Logic */}
        <FormSection
          title="Conditional Logic (Optional)"
          description="Show/hide this field based on other field values"
        >
          <JSONEditor
            value={formData.conditionalLogic}
            onChange={(value) => updateField('conditionalLogic', value)}
            minHeight="150px"
          />
        </FormSection>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/admin/cms/fields')}
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
                {isEditMode ? 'Update Field' : 'Create Field'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
