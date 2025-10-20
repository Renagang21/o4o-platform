/**
 * Form Block Type Definitions
 * Type-safe attribute interfaces for form blocks
 */

/**
 * Post Form Block Attributes
 */
export interface PostFormAttributes {
  formAction?: 'create' | 'edit';
  postId?: string;
  successMessage?: string;
  errorMessage?: string;
  redirectUrl?: string;
  showSuccessMessage?: boolean;
  resetOnSubmit?: boolean;
  defaultStatus?: 'draft' | 'published';
  allowedBlocks?: string[];
}

/**
 * CPT Form Block Attributes
 */
export interface CptFormAttributes {
  cptSlug?: string;
  formAction?: 'create' | 'edit';
  postId?: string;
  successMessage?: string;
  errorMessage?: string;
  redirectUrl?: string;
  showSuccessMessage?: boolean;
  resetOnSubmit?: boolean;
  defaultStatus?: 'draft' | 'published';
  allowedBlocks?: string[];
}

/**
 * Form Field Block Attributes
 */
export interface FormFieldAttributes {
  name?: string;
  label?: string;
  fieldType?: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  helpText?: string;
  rows?: number;
  options?: Array<string | { label: string; value: string }>;
  acfFieldKey?: string;
  mapToField?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

/**
 * Form Submit Block Attributes
 */
export interface FormSubmitAttributes {
  buttonText?: string;
  loadingText?: string;
  align?: 'left' | 'center' | 'right';
  fullWidth?: boolean;
  buttonStyle?: 'primary' | 'secondary' | 'outline';
}

/**
 * Utility function to safely cast block attributes
 */
export function getAttributes<T>(attributes: Record<string, unknown> | undefined): T {
  return (attributes || {}) as T;
}
