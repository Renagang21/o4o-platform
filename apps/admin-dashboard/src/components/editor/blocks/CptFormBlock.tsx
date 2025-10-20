/**
 * CPT Form Block Component
 *
 * Form for creating or editing Custom Post Type entries
 * Uses React Hook Form + Zod for validation
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BlockProps } from '@/blocks/registry/types';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../InnerBlocks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cptApi, cptPostApi } from '@/features/cpt-acf/services/cpt.api';
import { CustomPostType } from '@/features/cpt-acf/types/cpt.types';
import { CptFormAttributes, getAttributes } from '@/blocks/definitions/form-types';

/**
 * Generate Zod schema from form field blocks
 */
function generateZodSchemaFromFields(innerBlocks: Block[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  const formFields = innerBlocks.filter(block => block.type === 'o4o/form-field');

  formFields.forEach(field => {
    const { name, fieldType, required, minLength, maxLength, pattern, min, max } = field.attributes || {};

    if (!name || typeof name !== 'string') return;

    let fieldSchema: z.ZodTypeAny;

    switch (fieldType) {
      case 'email':
        fieldSchema = z.string().email('Invalid email address');
        break;
      case 'number':
        fieldSchema = z.coerce.number();
        if (min) fieldSchema = fieldSchema.min(min, `Must be at least ${min}`);
        if (max) fieldSchema = fieldSchema.max(max, `Must be at most ${max}`);
        break;
      case 'textarea':
      case 'text':
      default:
        fieldSchema = z.string();
        break;
    }

    // Apply string validations
    if (typeof fieldSchema === 'object' && fieldSchema._def?.typeName === 'ZodString') {
      if (minLength) {
        fieldSchema = fieldSchema.min(minLength, `Minimum ${minLength} characters required`);
      }
      if (maxLength) {
        fieldSchema = fieldSchema.max(maxLength, `Maximum ${maxLength} characters allowed`);
      }
      if (pattern) {
        fieldSchema = fieldSchema.regex(new RegExp(pattern), 'Invalid format');
      }
    }

    // Make optional if not required
    if (!required) {
      fieldSchema = fieldSchema.optional();
    }

    schemaFields[name] = fieldSchema;
  });

  return z.object(schemaFields);
}

/**
 * CptFormBlock Component
 */
const CptFormBlock: React.FC<BlockProps> = ({
  id,
  attributes,
  setAttributes,
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
}) => {
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = React.useState<string>('');
  const [cptTypes, setCptTypes] = useState<CustomPostType[]>([]);
  const [loading, setLoading] = useState(true);

  const formAttributes = getAttributes<CptFormAttributes>(attributes);

  // Load CPT types
  useEffect(() => {
    const loadCptTypes = async () => {
      try {
        const response = await cptApi.getAllTypes(true); // Get active CPT types
        if (response.success && response.data) {
          setCptTypes(response.data);
        }
      } catch (error) {
        console.error('Failed to load CPT types:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCptTypes();
  }, []);

  // Generate Zod schema from innerBlocks
  const zodSchema = useMemo(() => {
    return generateZodSchemaFromFields(innerBlocks as Block[]);
  }, [innerBlocks]);

  // Setup React Hook Form
  const methods = useForm<Record<string, unknown>>({
    resolver: zodResolver(zodSchema),
    defaultValues: {},
  });

  const { handleSubmit, formState: { errors, isSubmitting } } = methods;

  /**
   * Handle form submission
   */
  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      setSubmitStatus('idle');
      setSubmitMessage('');

      const cptSlug = formAttributes.cptSlug || 'ds_product';

      // Map form data to CPT post fields
      const formFields = (innerBlocks as Block[]).filter(b => b.type === 'o4o/form-field');

      const postData: Record<string, unknown> = {
        status: formAttributes.defaultStatus || 'draft',
      };

      // Map fields to post structure
      formFields.forEach(field => {
        const { name, mapToField, acfFieldKey } = field.attributes || {};
        if (name && typeof name === 'string' && data[name] !== undefined) {
          const fieldMapping = (mapToField as string) || name;

          // Direct post fields
          if (['title', 'content', 'excerpt', 'slug'].includes(fieldMapping)) {
            postData[fieldMapping] = data[name];
          } else if (fieldMapping.startsWith('meta.')) {
            // Meta fields
            const metaKey = fieldMapping.replace('meta.', '');
            if (!postData.meta) postData.meta = {};
            postData.meta[metaKey] = data[name];
          } else if (acfFieldKey) {
            // ACF fields
            if (!postData.acfFields) postData.acfFields = {};
            postData.acfFields[acfFieldKey] = data[name];
          } else {
            // Custom fields
            if (!postData.customFields) postData.customFields = {};
            postData.customFields[name] = data[name];
          }
        }
      });

      // Submit to CPT API
      let response;
      if (formAttributes.formAction === 'edit' && formAttributes.postId) {
        // Update existing CPT entry
        response = await cptPostApi.updatePost(cptSlug, formAttributes.postId, postData);
      } else {
        // Create new CPT entry
        response = await cptPostApi.createPost(cptSlug, postData);
      }

      if (response.success) {
        setSubmitStatus('success');
        setSubmitMessage(formAttributes.successMessage || 'Entry submitted successfully!');

        // Reset form if configured
        if (formAttributes.resetOnSubmit) {
          methods.reset();
        }

        // Redirect if configured
        if (formAttributes.redirectUrl) {
          setTimeout(() => {
            window.location.href = formAttributes.redirectUrl;
          }, 1500);
        }
      } else {
        throw new Error(response.message || 'Submission failed');
      }
    } catch (error: unknown) {
      console.error('Form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setSubmitStatus('error');
      setSubmitMessage(formAttributes.errorMessage || errorMessage);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="o4o-cpt-form-block p-4 border-2 border-dashed border-purple-300 rounded-lg relative">
        {/* Editor Header */}
        {isSelected && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
            <h3 className="font-semibold text-purple-900 mb-2">CPT Form Settings</h3>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-gray-700 min-w-24">CPT Type:</span>
                <select
                  value={formAttributes.cptSlug || 'ds_product'}
                  onChange={(e) => setAttributes?.({ cptSlug: e.target.value })}
                  className="border rounded px-2 py-1 flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <option>Loading...</option>
                  ) : (
                    <>
                      {cptTypes.map(cpt => (
                        <option key={cpt.slug} value={cpt.slug}>
                          {cpt.name || cpt.label} ({cpt.slug})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-gray-700 min-w-24">Action:</span>
                <select
                  value={formAttributes.formAction || 'create'}
                  onChange={(e) => setAttributes?.({ formAction: e.target.value })}
                  className="border rounded px-2 py-1"
                >
                  <option value="create">Create New Entry</option>
                  <option value="edit">Edit Existing Entry</option>
                </select>
              </label>

              {formAttributes.formAction === 'edit' && (
                <label className="flex items-center gap-2">
                  <span className="text-gray-700 min-w-24">Entry ID:</span>
                  <input
                    type="text"
                    value={formAttributes.postId || ''}
                    onChange={(e) => setAttributes?.({ postId: e.target.value })}
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="Enter entry ID to edit"
                  />
                </label>
              )}

              <label className="flex items-center gap-2">
                <span className="text-gray-700 min-w-24">Default Status:</span>
                <select
                  value={formAttributes.defaultStatus || 'draft'}
                  onChange={(e) => setAttributes?.({ defaultStatus: e.target.value })}
                  className="border rounded px-2 py-1"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-gray-700 min-w-24">Redirect URL:</span>
                <input
                  type="text"
                  value={formAttributes.redirectUrl || ''}
                  onChange={(e) => setAttributes?.({ redirectUrl: e.target.value })}
                  className="border rounded px-2 py-1 flex-1"
                  placeholder="/thank-you"
                />
              </label>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Render Inner Blocks (form fields) */}
          <InnerBlocks
            parentBlockId={id || 'cpt-form'}
            blocks={innerBlocks as Block[]}
            onBlocksChange={(blocks) => onInnerBlocksChange?.(blocks)}
            allowedBlocks={formAttributes.allowedBlocks || ['o4o/form-field', 'o4o/form-submit']}
            renderAppender={isSelected}
            placeholder="Add form fields..."
          />
        </form>

        {/* Success/Error Messages */}
        {submitStatus === 'success' && formAttributes.showSuccessMessage && (
          <Alert className="mt-4 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{submitMessage}</AlertDescription>
          </Alert>
        )}

        {submitStatus === 'error' && (
          <Alert className="mt-4 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{submitMessage}</AlertDescription>
          </Alert>
        )}

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Submitting...</p>
            </div>
          </div>
        )}
      </div>
    </FormProvider>
  );
};

export default CptFormBlock;
