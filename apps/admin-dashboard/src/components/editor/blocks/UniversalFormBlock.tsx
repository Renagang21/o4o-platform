/**
 * Universal Form Block Component
 *
 * Unified form for creating or editing both Posts and Custom Post Types
 * Replaces PostFormBlock and CptFormBlock with a single, dynamic component
 * Uses React Hook Form + Zod for validation
 */

import React, { useMemo, useState, useEffect, createContext, useContext } from 'react';
import { useForm, FormProvider, FieldErrors, FormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z, ZodNumber } from 'zod';
import { BlockProps } from '@/blocks/registry/types';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../InnerBlocks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import { cptApi, cptPostApi } from '@/features/cpt-acf/services/cpt.api';
import { CustomPostType } from '@/features/cpt-acf/types/cpt.types';

// Universal Form Attributes
interface UniversalFormAttributes {
  postType?: string;           // 'post' or CPT slug
  formAction?: 'create' | 'edit';
  postId?: string;
  defaultStatus?: 'draft' | 'published';
  redirectUrl?: string;
  successMessage?: string;
  errorMessage?: string;
  showSuccessMessage?: boolean;
  resetOnSubmit?: boolean;
  allowedBlocks?: string[];
}

// Form Context to share form state with child blocks
interface FormContextValue {
  formState: FormState<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
}

const FormBlockContext = createContext<FormContextValue | null>(null);

export const useFormBlockContext = () => {
  const context = useContext(FormBlockContext);
  if (!context) {
    throw new Error('useFormBlockContext must be used within UniversalFormBlock');
  }
  return context;
};

/**
 * Type-safe attribute getter
 */
function getAttributes<T>(attributes: Record<string, any> | undefined): T {
  return (attributes || {}) as T;
}

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
        if (typeof min === 'number') fieldSchema = (fieldSchema as z.ZodNumber).min(min, `Must be at least ${min}`);
        if (typeof max === 'number') fieldSchema = (fieldSchema as z.ZodNumber).max(max, `Must be at most ${max}`);
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
 * UniversalFormBlock Component
 */
const UniversalFormBlock: React.FC<BlockProps> = ({
  id,
  attributes,
  setAttributes,
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
}) => {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [cptTypes, setCptTypes] = useState<CustomPostType[]>([]);
  const [loading, setLoading] = useState(true);

  const formAttributes = getAttributes<UniversalFormAttributes>(attributes);
  const postType = formAttributes.postType || 'post';

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

      // Map form data to post fields
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
          } else if (acfFieldKey && postType !== 'post') {
            // ACF fields (for CPT)
            if (!postData.acfFields) postData.acfFields = {};
            postData.acfFields[acfFieldKey] = data[name];
          } else {
            // Custom fields
            if (!postData.customFields) postData.customFields = {};
            postData.customFields[name] = data[name];
          }
        }
      });

      // Submit to appropriate API based on postType
      let response;

      if (formAttributes.formAction === 'edit' && formAttributes.postId) {
        // Update existing entry
        if (postType === 'post') {
          response = await authClient.api.put(`/posts/${formAttributes.postId}`, postData);
        } else {
          response = await cptPostApi.updatePost(postType, formAttributes.postId, postData);
        }
      } else {
        // Create new entry
        if (postType === 'post') {
          response = await authClient.api.post('/posts', postData);
        } else {
          response = await cptPostApi.createPost(postType, postData);
        }
      }

      // Handle response
      const success = postType === 'post'
        ? response.data?.success
        : response.success;

      if (success) {
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
        const errorMsg = postType === 'post'
          ? response.data?.message || 'Submission failed'
          : response.message || 'Submission failed';
        throw new Error(errorMsg);
      }
    } catch (error: unknown) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setSubmitMessage(formAttributes.errorMessage || errorMessage);
    }
  };

  // Determine border color based on post type
  const borderColor = postType === 'post' ? 'border-blue-300' : 'border-purple-300';
  const bgColor = postType === 'post' ? 'bg-blue-50' : 'bg-purple-50';
  const accentColor = postType === 'post' ? 'blue' : 'purple';

  return (
    <FormProvider {...methods}>
      <FormBlockContext.Provider value={{ formState: methods.formState, errors }}>
        <div className={`o4o-universal-form-block p-4 border-2 border-dashed ${borderColor} rounded-lg relative`}>
          {/* Editor Header */}
          {isSelected && (
            <div className={`mb-4 p-3 ${bgColor} border border-${accentColor}-200 rounded`}>
              <h3 className={`font-semibold text-${accentColor}-900 mb-2`}>Universal Form Settings</h3>
              <div className="space-y-2 text-sm">
                {/* Post Type Selection */}
                <label className="flex items-center gap-2">
                  <span className="text-gray-700 min-w-24">Post Type:</span>
                  <select
                    value={postType}
                    onChange={(e) => setAttributes?.({ postType: e.target.value })}
                    className="border rounded px-2 py-1 flex-1"
                    disabled={loading}
                  >
                    <option value="post">Post (Standard Blog Post)</option>
                    {loading ? (
                      <option disabled>Loading CPT types...</option>
                    ) : (
                      cptTypes.map(cpt => (
                        <option key={cpt.slug} value={cpt.slug}>
                          {cpt.name || cpt.label} ({cpt.slug})
                        </option>
                      ))
                    )}
                  </select>
                </label>

                {/* Action Selection */}
                <label className="flex items-center gap-2">
                  <span className="text-gray-700 min-w-24">Action:</span>
                  <select
                    value={formAttributes.formAction || 'create'}
                    onChange={(e) => setAttributes?.({ formAction: e.target.value })}
                    className="border rounded px-2 py-1"
                  >
                    <option value="create">Create New {postType === 'post' ? 'Post' : 'Entry'}</option>
                    <option value="edit">Edit Existing {postType === 'post' ? 'Post' : 'Entry'}</option>
                  </select>
                </label>

                {/* Post/Entry ID (for edit mode) */}
                {formAttributes.formAction === 'edit' && (
                  <label className="flex items-center gap-2">
                    <span className="text-gray-700 min-w-24">{postType === 'post' ? 'Post' : 'Entry'} ID:</span>
                    <input
                      type="text"
                      value={formAttributes.postId || ''}
                      onChange={(e) => setAttributes?.({ postId: e.target.value })}
                      className="border rounded px-2 py-1 flex-1"
                      placeholder={`Enter ${postType === 'post' ? 'post' : 'entry'} ID to edit`}
                    />
                  </label>
                )}

                {/* Default Status */}
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

                {/* Redirect URL */}
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
              parentBlockId={id || 'universal-form'}
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
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${accentColor}-600 mx-auto`}></div>
                <p className="mt-2 text-sm text-gray-600">Submitting...</p>
              </div>
            </div>
          )}
        </div>
      </FormBlockContext.Provider>
    </FormProvider>
  );
};

export default UniversalFormBlock;
