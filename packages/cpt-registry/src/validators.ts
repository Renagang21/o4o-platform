/**
 * CPT Schema Validators
 * Phase 5: Validation logic for CPT schemas
 */

import {
  CPTSchema,
  FieldSchema,
  ValidationResult,
  ValidationError,
} from './schema.js';

/**
 * CPT name pattern: lowercase letters, numbers, underscores
 * Must start with letter or underscore
 */
const CPT_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/;

/**
 * Meta key pattern (from Phase 4-1)
 */
const META_KEY_PATTERN = /^[a-zA-Z0-9_:-]{1,255}$/;

/**
 * Field name pattern: lowercase letters, numbers, underscores
 */
const FIELD_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/;

/**
 * Validate CPT schema
 */
export function validateCPTSchema(schema: CPTSchema): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate name
  if (!schema.name) {
    errors.push({
      field: 'name',
      message: 'CPT name is required',
      code: 'MISSING_REQUIRED',
    });
  } else if (!CPT_NAME_PATTERN.test(schema.name)) {
    errors.push({
      field: 'name',
      message: `CPT name "${schema.name}" must match pattern: /^[a-z_][a-z0-9_]*$/`,
      code: 'INVALID_NAME',
    });
  }

  // Validate fields
  if (schema.fields && schema.fields.length > 0) {
    const fieldNames = new Set<string>();

    for (const field of schema.fields) {
      // Check field name
      if (!field.name) {
        errors.push({
          field: `fields`,
          message: 'Field name is required',
          code: 'MISSING_REQUIRED',
        });
        continue;
      }

      // Check field name pattern
      if (!FIELD_NAME_PATTERN.test(field.name)) {
        errors.push({
          field: `fields.${field.name}`,
          message: `Field name "${field.name}" must match pattern: /^[a-z_][a-z0-9_]*$/`,
          code: 'INVALID_FIELD',
        });
      }

      // Check for duplicate field names
      if (fieldNames.has(field.name)) {
        errors.push({
          field: `fields.${field.name}`,
          message: `Duplicate field name: "${field.name}"`,
          code: 'DUPLICATE_FIELD',
        });
      }
      fieldNames.add(field.name);

      // Recursively validate sub_fields for repeater/group
      if ('sub_fields' in field && field.sub_fields) {
        const subValidation = validateFields(field.sub_fields, `fields.${field.name}.sub_fields`);
        errors.push(...subValidation);
      }
    }
  }

  // Validate meta keys
  if (schema.meta?.allowed) {
    for (const key of schema.meta.allowed) {
      if (!META_KEY_PATTERN.test(key)) {
        errors.push({
          field: `meta.allowed`,
          message: `Invalid meta key "${key}". Must match pattern: ${META_KEY_PATTERN}`,
          code: 'INVALID_META_KEY',
        });
      }
    }
  }

  if (schema.meta?.forbidden) {
    for (const key of schema.meta.forbidden) {
      if (!META_KEY_PATTERN.test(key)) {
        errors.push({
          field: `meta.forbidden`,
          message: `Invalid meta key "${key}". Must match pattern: ${META_KEY_PATTERN}`,
          code: 'INVALID_META_KEY',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate array of fields (helper for recursive validation)
 */
function validateFields(fields: FieldSchema[], pathPrefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const fieldNames = new Set<string>();

  for (const field of fields) {
    if (!field.name) {
      errors.push({
        field: pathPrefix,
        message: 'Field name is required',
        code: 'MISSING_REQUIRED',
      });
      continue;
    }

    if (!FIELD_NAME_PATTERN.test(field.name)) {
      errors.push({
        field: `${pathPrefix}.${field.name}`,
        message: `Field name "${field.name}" must match pattern: /^[a-z_][a-z0-9_]*$/`,
        code: 'INVALID_FIELD',
      });
    }

    if (fieldNames.has(field.name)) {
      errors.push({
        field: `${pathPrefix}.${field.name}`,
        message: `Duplicate field name: "${field.name}"`,
        code: 'DUPLICATE_FIELD',
      });
    }
    fieldNames.add(field.name);

    // Recursively validate sub_fields
    if ('sub_fields' in field && field.sub_fields) {
      const subErrors = validateFields(
        field.sub_fields,
        `${pathPrefix}.${field.name}.sub_fields`
      );
      errors.push(...subErrors);
    }
  }

  return errors;
}

/**
 * Validate meta key against schema rules
 */
export function validateMetaKey(
  cptSchema: CPTSchema,
  metaKey: string
): boolean {
  // Check basic pattern
  if (!META_KEY_PATTERN.test(metaKey)) {
    return false;
  }

  if (!cptSchema.meta) {
    // No meta rules = allow all valid keys
    return true;
  }

  // Check forbidden list
  if (cptSchema.meta.forbidden && cptSchema.meta.forbidden.includes(metaKey)) {
    return false;
  }

  // Check allowed list
  if (cptSchema.meta.allowed && cptSchema.meta.allowed.length > 0) {
    // Whitelist mode: only allowed keys
    return cptSchema.meta.allowed.includes(metaKey);
  }

  // Check allow_dynamic
  if (cptSchema.meta.allow_dynamic === false) {
    // Dynamic keys not allowed, must be in allowed list
    return cptSchema.meta.allowed ? cptSchema.meta.allowed.includes(metaKey) : false;
  }

  // Default: allow
  return true;
}

/**
 * Validate field value against field schema
 */
export function validateFieldValue(
  field: FieldSchema,
  value: unknown
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check required
  if (field.required && (value === null || value === undefined || value === '')) {
    errors.push({
      field: field.name,
      message: `Field "${field.name}" is required`,
      code: 'MISSING_REQUIRED',
    });
    return { valid: false, errors };
  }

  // Type-specific validation
  switch (field.type) {
    case 'number':
      if (value !== null && value !== undefined && typeof value !== 'number') {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a number`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    case 'email':
      if (value && typeof value === 'string' && !isValidEmail(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a valid email`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    case 'url':
      if (value && typeof value === 'string' && !isValidUrl(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a valid URL`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    case 'repeater':
      if (value && !Array.isArray(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be an array`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    case 'group':
      if (value && typeof value !== 'object') {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be an object`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    // Add more type-specific validation as needed
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Email validation helper
 */
function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * URL validation helper
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
