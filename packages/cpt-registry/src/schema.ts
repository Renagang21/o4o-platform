/**
 * CPT Registry Schema Definitions
 * Phase 5: Central schema types for CPT registration
 */

/**
 * Field types supported by ACF-style fields
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'url'
  | 'password'
  | 'wysiwyg'
  | 'image'
  | 'file'
  | 'gallery'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'true_false'
  | 'date_picker'
  | 'date_time_picker'
  | 'time_picker'
  | 'color_picker'
  | 'link'
  | 'post_object'
  | 'page_link'
  | 'relationship'
  | 'taxonomy'
  | 'user'
  | 'google_map'
  | 'repeater'
  | 'group'
  | 'clone';

/**
 * Base field configuration
 */
export interface BaseFieldSchema {
  name: string;
  label?: string;
  type: FieldType;
  required?: boolean;
  default_value?: unknown;
  instructions?: string;
  conditional_logic?: ConditionalLogic;
}

/**
 * Conditional logic for field display
 */
export interface ConditionalLogic {
  rules: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'pattern_match' | 'greater_than' | 'less_than';
    value: unknown;
  }>;
  relation?: 'AND' | 'OR';
}

/**
 * Select/Radio/Checkbox options
 */
export interface ChoiceFieldSchema extends BaseFieldSchema {
  type: 'select' | 'radio' | 'checkbox';
  choices: Record<string, string>; // value => label
  multiple?: boolean;
  allow_custom?: boolean;
}

/**
 * Repeater field (nested array)
 */
export interface RepeaterFieldSchema extends BaseFieldSchema {
  type: 'repeater';
  sub_fields: FieldSchema[];
  min?: number;
  max?: number;
  layout?: 'table' | 'block' | 'row';
  button_label?: string;
}

/**
 * Group field (nested object)
 */
export interface GroupFieldSchema extends BaseFieldSchema {
  type: 'group';
  sub_fields: FieldSchema[];
  layout?: 'block' | 'table' | 'row';
}

/**
 * Union type for all field schemas
 */
export type FieldSchema =
  | BaseFieldSchema
  | ChoiceFieldSchema
  | RepeaterFieldSchema
  | GroupFieldSchema;

/**
 * Meta key rules for post_meta table
 */
export interface MetaKeyRules {
  /**
   * Allowed meta keys (whitelist)
   * If empty array, no restrictions
   */
  allowed?: string[];

  /**
   * Forbidden meta keys (blacklist)
   */
  forbidden?: string[];

  /**
   * Pattern validation for meta keys
   * @default /^[a-zA-Z0-9_:-]{1,255}$/
   */
  pattern?: RegExp;

  /**
   * Whether to allow dynamic meta keys not in the schema
   * @default false
   */
  allow_dynamic?: boolean;
}

/**
 * CPT Schema Definition
 */
export interface CPTSchema {
  /**
   * Unique CPT identifier (e.g., 'ds_product', 'event')
   * Must match pattern: /^[a-z_][a-z0-9_]*$/
   */
  name: string;

  /**
   * Human-readable label
   */
  label?: string;

  /**
   * Plural form of label
   */
  label_plural?: string;

  /**
   * Description of this CPT
   */
  description?: string;

  /**
   * ACF-style field groups
   */
  fields: FieldSchema[];

  /**
   * Meta key rules for post_meta validation
   */
  meta?: MetaKeyRules;

  /**
   * Supported taxonomies (categories, tags, custom)
   */
  taxonomies?: string[];

  /**
   * Whether this CPT supports featured images
   */
  supports_featured_image?: boolean;

  /**
   * Whether this CPT has archive page
   */
  has_archive?: boolean;

  /**
   * Icon for admin UI (Material Icons, Heroicons, or custom)
   */
  icon?: string;

  /**
   * Custom capabilities for RBAC
   */
  capabilities?: {
    create?: string;
    read?: string;
    update?: string;
    delete?: string;
  };

  /**
   * Whether this CPT is public (accessible via API)
   */
  public?: boolean;

  /**
   * Registration timestamp
   */
  registered_at?: Date;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error detail
 */
export interface ValidationError {
  field: string;
  message: string;
  code: 'INVALID_NAME' | 'INVALID_FIELD' | 'DUPLICATE_FIELD' | 'INVALID_META_KEY' | 'MISSING_REQUIRED';
}
