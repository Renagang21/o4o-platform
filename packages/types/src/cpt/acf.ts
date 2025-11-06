/**
 * Advanced Custom Fields (ACF) Type Definitions - Single Source of Truth (SSOT)
 * Consolidated from all apps to ensure consistency
 */

// Import base types from custom-post-type (but don't re-export to avoid conflicts)
import type { CustomField as BaseCustomField, CustomFieldGroup as BaseCustomFieldGroup } from '../custom-post-type.js';

// Field Types
export type ACFFieldType =
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
  | 'button_group'
  | 'date_picker'
  | 'date_time_picker'
  | 'time_picker'
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
  | 'clone'
  | 'google_map';

// Base Field Definition
export interface ACFFieldDefinition {
  id: string;
  name: string;
  key: string;
  label: string;
  type: ACFFieldType;
  instructions?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;

  // Validation
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;

  // Options for select/radio/checkbox
  options?: Array<{ label: string; value: string }>;
  choices?: Array<{ label: string; value: string }>;

  // Layout and display
  wrapper?: {
    width?: string;
    class?: string;
    id?: string;
  };
  rows?: number; // For textarea/wysiwyg

  // Advanced options
  allowNull?: boolean;
  multiple?: boolean;
  returnFormat?: string;

  // Conditional logic
  conditional?: ACFFieldConditional;
  conditionalLogic?: ACFConditionalLogic;

  // For complex field types
  subFields?: ACFFieldDefinition[]; // For repeater/group
  repeaterFields?: ACFFieldDefinition[]; // Legacy alias
  layouts?: ACFFlexibleLayout[]; // For flexible content
  layout?: 'table' | 'block' | 'row'; // For repeater
  buttonLabel?: string;
  minRows?: number;
  maxRows?: number;
  collapsed?: string; // Field key to show when collapsed

  // Relationship options
  relationshipType?: string;
  postTypes?: string[];
  taxonomies?: string[];
  filters?: string[];
  minPosts?: number;
  maxPosts?: number;

  // Image/File options
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  mimeTypes?: string[];
  library?: 'all' | 'uploadedTo';
  preview?: 'thumbnail' | 'medium' | 'large' | 'full';

  // Google Map options
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  height?: number;

  // Date options
  displayFormat?: string;
  firstDay?: number;

  // Color picker options
  defaultColor?: string;
  enableOpacity?: boolean;
}

// Location Rules
export type ACFLocationParam =
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
  | 'current_user'
  | 'current_user_role'
  | 'user_form'
  | 'taxonomy';

export interface ACFLocation {
  param: ACFLocationParam | string;
  operator: '==' | '!=' | 'contains' | '!contains' | 'not_contains';
  value: string;
}

export interface ACFLocationGroup {
  rules: ACFLocation[];
  operator?: 'AND' | 'OR';
}

// Conditional Logic
export type ACFConditionalOperator =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'contains'
  | 'not_contains'
  | '!contains'
  | 'empty'
  | '!empty'
  | 'pattern'
  | '!pattern';

export interface ACFFieldConditional {
  field: string;
  operator: ACFConditionalOperator;
  value: any;
}

export interface ACFConditionalRule {
  field: string;
  operator: ACFConditionalOperator;
  value: any;
}

export interface ACFConditionalLogic {
  enabled: boolean;
  logic: 'and' | 'or';
  rules: ACFConditionalRule[];
}

// Field Group
export interface ACFFieldGroup {
  id: string;
  name: string;
  key: string;
  title: string;
  description?: string;
  location: ACFLocationGroup[];
  fields: ACFFieldDefinition[];
  menuOrder?: number;
  position?: 'normal' | 'side' | 'advanced' | 'acf_after_title';
  style?: 'default' | 'seamless';
  labelPlacement?: 'top' | 'left';
  instructionPlacement?: 'label' | 'field';
  hideOnScreen?: string[];
  active?: boolean;
  showInRest?: boolean;
  layout?: ACFFieldLayout;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  order?: number;
  rules?: {
    postType?: string[];
    template?: string[];
    category?: string[];
  };
}

// Field Layout
export interface ACFFieldLayout {
  type?: 'row' | 'block' | 'table';
  columns?: number;
  labelPlacement?: 'top' | 'left';
  instructionPlacement?: 'label' | 'field';
}

// Flexible Content Layout
export interface ACFFlexibleLayout {
  key: string;
  name: string;
  label: string;
  display: 'block' | 'table' | 'row';
  subFields: ACFFieldDefinition[];
  min?: number;
  max?: number;
}

// Repeater Types
export interface ACFRepeaterRow {
  _id: string; // Unique ID for React keys
  [fieldName: string]: any;
}

export type ACFRepeaterValue = ACFRepeaterRow[];

export interface ACFRepeaterConfig {
  layout?: 'table' | 'block' | 'row';
  buttonLabel?: string;
  minRows?: number;
  maxRows?: number;
  collapsed?: string;
  subFields: ACFFieldDefinition[];
}

// Field Value Storage
export interface ACFFieldValue {
  id: string;
  fieldId: string;
  fieldName: string;
  entityType: string;
  entityId: string;
  value: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Link Value (for link field type)
export interface ACFLinkValue {
  url: string;
  title?: string;
  target?: '_blank' | '_self';
}

// API Response Types
export interface ACFApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

// DTOs
export interface CreateACFFieldGroupDto {
  name: string;
  key: string;
  title: string;
  description?: string;
  location: ACFLocation[] | ACFLocationGroup[];
  fields: Omit<ACFFieldDefinition, 'id'>[];
  menuOrder?: number;
  position?: ACFFieldGroup['position'];
  style?: ACFFieldGroup['style'];
  active?: boolean;
}

export interface UpdateACFFieldGroupDto extends Partial<CreateACFFieldGroupDto> {
  id?: string;
}

export interface SaveACFFieldValuesDto {
  [fieldName: string]: any;
}

export interface ExportACFFieldGroupsDto {
  groupIds?: string[];
}

export interface ImportACFFieldGroupsDto {
  groups: ACFFieldGroup[];
  version?: string;
}

// Validation
export interface ACFValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customFunction?: string;
  errorMessage?: string;
}

// Type aliases for backward compatibility
export type FieldGroup = ACFFieldGroup;
export type CustomField = ACFFieldDefinition;
export type FieldType = ACFFieldType;
export type FieldLocation = ACFLocation;
export type FieldConditional = ACFFieldConditional;
export type ConditionalLogic = ACFConditionalLogic;
export type ConditionalRule = ACFConditionalRule;
export type ConditionalOperator = ACFConditionalOperator;
export type FieldLayout = ACFFlexibleLayout;
export type FieldChoice = { value: string; label: string };
export type RepeaterRow = ACFRepeaterRow;
export type RepeaterValue = ACFRepeaterValue;
export type RepeaterConfig = ACFRepeaterConfig;
export type RepeaterLayout = 'table' | 'block' | 'row';
export type FieldValue = ACFFieldValue;
export type LinkValue = ACFLinkValue;

// Specific field type interfaces (extending base)
export interface ACFRepeaterField extends ACFFieldDefinition {
  type: 'repeater';
  subFields: ACFFieldDefinition[];
  minRows?: number;
  maxRows?: number;
  layout?: 'table' | 'block' | 'row';
  buttonLabel?: string;
  collapsed?: string;
}

export interface ACFFlexibleContentField extends ACFFieldDefinition {
  type: 'flexible_content';
  layouts: ACFFlexibleLayout[];
  minLayouts?: number;
  maxLayouts?: number;
  buttonLabel?: string;
}

export interface ACFGroupField extends ACFFieldDefinition {
  type: 'group';
  subFields: ACFFieldDefinition[];
  layout?: 'block' | 'table' | 'row';
}

export interface ACFCloneField extends ACFFieldDefinition {
  type: 'clone';
  cloneFields: string[];
  displayType: 'seamless' | 'group';
  layout?: 'block' | 'table' | 'row';
  prefixLabel?: boolean;
  prefixName?: boolean;
}

export interface ACFGalleryField extends ACFFieldDefinition {
  type: 'gallery';
  minImages?: number;
  maxImages?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  mimeTypes?: string[];
  library?: 'all' | 'uploadedTo';
  preview?: 'thumbnail' | 'medium' | 'large' | 'full';
}

export interface ACFRelationshipField extends ACFFieldDefinition {
  type: 'relationship';
  postTypes?: string[];
  taxonomies?: string[];
  filters?: ('search' | 'post_type' | 'taxonomy')[];
  minPosts?: number;
  maxPosts?: number;
  returnFormat?: 'object' | 'id';
}

export interface ACFPostObjectField extends ACFFieldDefinition {
  type: 'post_object';
  postTypes?: string[];
  taxonomies?: string[];
  allowNull?: boolean;
  multiple?: boolean;
  returnFormat?: 'object' | 'id';
  ui?: boolean;
}

export interface ACFTaxonomyField extends ACFFieldDefinition {
  type: 'taxonomy';
  taxonomy: string;
  fieldType?: 'checkbox' | 'multi_select' | 'radio' | 'select';
  allowNull?: boolean;
  addTerm?: boolean;
  saveTerms?: boolean;
  loadTerms?: boolean;
  returnFormat?: 'object' | 'id';
}

export interface ACFUserField extends ACFFieldDefinition {
  type: 'user';
  roles?: string[];
  allowNull?: boolean;
  multiple?: boolean;
  returnFormat?: 'object' | 'id' | 'array';
}

export interface ACFGoogleMapField extends ACFFieldDefinition {
  type: 'google_map';
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  height?: number;
}

export interface ACFDatePickerField extends ACFFieldDefinition {
  type: 'date_picker';
  displayFormat?: string;
  returnFormat?: string;
  firstDay?: number;
}

export interface ACFColorPickerField extends ACFFieldDefinition {
  type: 'color_picker';
  defaultColor?: string;
  enableOpacity?: boolean;
  returnFormat?: 'string' | 'array';
}

// Union type of all specific field types
export type ACFField =
  | ACFFieldDefinition
  | ACFRepeaterField
  | ACFFlexibleContentField
  | ACFGroupField
  | ACFCloneField
  | ACFGalleryField
  | ACFRelationshipField
  | ACFPostObjectField
  | ACFTaxonomyField
  | ACFUserField
  | ACFGoogleMapField
  | ACFDatePickerField
  | ACFColorPickerField;
