/**
 * ACF Types - Re-export from SSOT
 * This file is kept for backward compatibility but now uses @o4o/types/cpt
 */

// Re-export all ACF types from the centralized types package
export type {
  ACFFieldGroup as FieldGroup,
  ACFFieldDefinition as CustomField,
  ACFFieldType as FieldType,
  ACFLocation as FieldLocation,
  ACFLocationParam as LocationParam,
  ACFFieldConditional as FieldConditional,
  ACFConditionalLogic as ConditionalLogic,
  ACFConditionalRule as ConditionalRule,
  ACFConditionalOperator as ConditionalOperator,
  ACFFlexibleLayout as FieldLayout,
  ACFLinkValue as LinkValue,
  ACFRepeaterRow as RepeaterRow,
  ACFRepeaterValue as RepeaterValue,
  ACFRepeaterConfig as RepeaterConfig,
  ACFFieldValue as FieldValue,
  ACFApiResponse,
  CreateACFFieldGroupDto as CreateFieldGroupDto,
  UpdateACFFieldGroupDto as UpdateFieldGroupDto,
  SaveACFFieldValuesDto as SaveFieldValuesDto,
  ExportACFFieldGroupsDto as ExportFieldGroupsDto,
  ImportACFFieldGroupsDto as ImportFieldGroupsDto,
  ACFRepeaterField,
  ACFFlexibleContentField,
  ACFGroupField,
  ACFCloneField,
  ACFGalleryField,
  ACFRelationshipField,
  ACFPostObjectField,
  ACFTaxonomyField,
  ACFUserField,
  ACFGoogleMapField,
  ACFDatePickerField,
  ACFColorPickerField,
  ACFField,
  ACFLocationGroup,
  ACFValidation
} from '@o4o/types/cpt';

// Type alias for FieldChoice
export interface FieldChoice {
  value: string;
  label: string;
}

// Repeater layout type alias
export type RepeaterLayout = 'table' | 'block' | 'row';