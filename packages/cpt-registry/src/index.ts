/**
 * @o4o/cpt-registry - Central CPT Schema Registry
 * Phase 5: Public API exports
 */

// Core registry
export { CPTRegistry, registry } from './registry.js';

// Schema types
export type {
  CPTSchema,
  FieldSchema,
  FieldType,
  BaseFieldSchema,
  ChoiceFieldSchema,
  RepeaterFieldSchema,
  GroupFieldSchema,
  MetaKeyRules,
  ConditionalLogic,
  ValidationResult,
  ValidationError,
} from './schema.js';

// Validators
export {
  validateCPTSchema,
  validateMetaKey,
  validateFieldValue,
} from './validators.js';
