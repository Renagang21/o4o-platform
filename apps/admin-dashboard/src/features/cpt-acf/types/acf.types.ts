/**
 * ACF (Advanced Custom Fields) Type Definitions
 * Frontend types for ACF management
 */

export interface FieldGroup {
  id: string;
  name: string;
  key: string;
  title: string;
  description?: string;
  location: FieldLocation[];
  fields: CustomField[];
  menuOrder: number;
  position: 'normal' | 'side' | 'acf_after_title';
  style: 'default' | 'seamless';
  labelPlacement: 'top' | 'left';
  instructionPlacement: 'label' | 'field';
  hideOnScreen?: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomField {
  id: string;
  name: string;
  key: string;
  label: string;
  type: FieldType;
  instructions?: string;
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  choices?: FieldChoice[];
  allowNull?: boolean;
  multiple?: boolean;
  returnFormat?: string;
  conditional?: FieldConditional; // Legacy single condition
  conditionalLogic?: ConditionalLogic; // New multi-condition logic
  wrapper?: {
    width?: string;
    class?: string;
    id?: string;
  };
  subFields?: CustomField[]; // For repeater/flexible content
  layouts?: FieldLayout[]; // For flexible content
  buttonLabel?: string; // For repeater
  minRows?: number; // For repeater
  maxRows?: number; // For repeater
  collapsed?: string; // For repeater
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'url'
  | 'link'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'true_false'
  | 'date_picker'
  | 'time_picker'
  | 'datetime_picker'
  | 'color_picker'
  | 'image'
  | 'file'
  | 'gallery'
  | 'wysiwyg'
  | 'oembed'
  | 'relationship'
  | 'post_object'
  | 'page_link'
  | 'user'
  | 'taxonomy'
  | 'repeater'
  | 'flexible_content'
  | 'group'
  | 'clone';

export interface FieldChoice {
  value: string;
  label: string;
}

// Location parameter types
export type LocationParam =
  | 'post_type'
  | 'user_role'
  | 'post_taxonomy'
  | 'post_category'
  | 'page_template'
  | 'post_template'
  | 'post_status'
  | 'post_format'
  | 'page_type'
  | 'page_parent'
  | 'page_template'
  | 'current_user'
  | 'current_user_role'
  | 'user_form';

export interface FieldLocation {
  param: LocationParam | string; // Allow custom params
  operator: '==' | '!=' | 'contains' | 'not_contains';
  value: string;
}

// Legacy single condition (for backward compatibility)
export interface FieldConditional {
  field: string;
  operator: '==' | '!=' | 'empty' | '!empty' | '>' | '<';
  value: any;
}

// Conditional Logic Operator Types
export type ConditionalOperator =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'contains'
  | 'not_contains'
  | 'empty'
  | '!empty'
  | 'pattern' // regex pattern match
  | '!pattern';

// Single conditional rule
export interface ConditionalRule {
  field: string; // field name/key to check
  operator: ConditionalOperator;
  value: any;
}

// Multi-condition logic with AND/OR support
export interface ConditionalLogic {
  enabled: boolean;
  logic: 'and' | 'or'; // how to combine rules
  rules: ConditionalRule[];
}

export interface FieldLayout {
  key: string;
  name: string;
  label: string;
  display: 'table' | 'block' | 'row';
  subFields: CustomField[];
}

export interface LinkValue {
  url: string;
  title?: string;
  target?: '_blank' | '_self';
}

export interface FieldValue {
  id: string;
  fieldId: string;
  fieldName: string;
  entityType: string;
  entityId: string;
  value: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ACFApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

export interface CreateFieldGroupDto {
  name: string;
  key: string;
  title: string;
  description?: string;
  location: FieldLocation[];
  fields: Omit<CustomField, 'id'>[];
  menuOrder?: number;
  position?: FieldGroup['position'];
  style?: FieldGroup['style'];
  active?: boolean;
}

export interface UpdateFieldGroupDto extends Partial<CreateFieldGroupDto> {
  id?: string;
}

export interface SaveFieldValuesDto {
  [fieldName: string]: any;
}

export interface ExportFieldGroupsDto {
  groupIds?: string[];
}

export interface ImportFieldGroupsDto {
  groups: FieldGroup[];
  version?: string;
}