/**
 * Runtime Validation for CPT Input Data
 * Phase 6: Validate incoming request payloads against registered schemas
 */

import type { CPTSchema, FieldSchema, ValidationResult, ValidationError } from '../schema.js';
import { validateMetaKey as validateMetaKeyPattern } from '../validators.js';

/**
 * Validate CPT input payload against schema
 * Used by API endpoints to validate POST/PUT request bodies
 */
export function validateCPTInput(
  schema: CPTSchema,
  payload: any
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push({
      field: 'payload',
      message: 'Payload must be an object',
      code: 'INVALID_FIELD',
    });
    return { valid: false, errors };
  }

  // Validate required fields
  for (const field of schema.fields) {
    if (field.required) {
      const value = payload[field.name];
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: field.name,
          message: `Required field "${field.name}" is missing or empty`,
          code: 'MISSING_REQUIRED',
        });
      }
    }

    // Type-specific validation for provided fields
    if (field.name in payload) {
      const value = payload[field.name];
      const fieldErrors = validateFieldValue(field, value);
      errors.push(...fieldErrors);
    }
  }

  // Check for unknown fields (optional: warn only)
  const knownFields = new Set(schema.fields.map(f => f.name));
  const standardFields = new Set(['id', 'title', 'slug', 'content', 'excerpt', 'status',
    'author', 'authorId', 'categories', 'categoryIds', 'tags', 'tagIds',
    'featuredImage', 'featuredImageId', 'meta', 'publishedAt', 'createdAt', 'updatedAt']);

  for (const key of Object.keys(payload)) {
    if (!knownFields.has(key) && !standardFields.has(key)) {
      // Warn only, don't fail
      console.warn(`[CPT Validation] Unknown field "${key}" for CPT "${schema.name}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single field value against its schema
 */
function validateFieldValue(field: FieldSchema, value: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Null/undefined check for non-required fields
  if (value === null || value === undefined) {
    return errors; // OK for non-required fields
  }

  // Type-specific validation
  switch (field.type) {
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a valid number`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a valid email address`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    case 'url':
      if (typeof value !== 'string' || !isValidUrl(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a valid URL`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    case 'repeater':
      if (!Array.isArray(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be an array`,
          code: 'INVALID_FIELD',
        });
      } else if ('sub_fields' in field && field.sub_fields) {
        // Validate each array item against sub_fields
        value.forEach((item, index) => {
          if (typeof item !== 'object') {
            errors.push({
              field: `${field.name}[${index}]`,
              message: `Repeater item must be an object`,
              code: 'INVALID_FIELD',
            });
          } else {
            for (const subField of field.sub_fields) {
              if (subField.required && !(subField.name in item)) {
                errors.push({
                  field: `${field.name}[${index}].${subField.name}`,
                  message: `Required sub-field "${subField.name}" is missing`,
                  code: 'MISSING_REQUIRED',
                });
              }
            }
          }
        });
      }
      break;

    case 'group':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be an object`,
          code: 'INVALID_FIELD',
        });
      } else if ('sub_fields' in field && field.sub_fields) {
        // Validate group sub_fields
        for (const subField of field.sub_fields) {
          if (subField.required && !(subField.name in value)) {
            errors.push({
              field: `${field.name}.${subField.name}`,
              message: `Required sub-field "${subField.name}" is missing`,
              code: 'MISSING_REQUIRED',
            });
          }
        }
      }
      break;

    case 'select':
    case 'radio':
      if ('choices' in field && field.choices) {
        const validChoices = Object.keys(field.choices);
        if (!validChoices.includes(String(value))) {
          errors.push({
            field: field.name,
            message: `Field "${field.name}" must be one of: ${validChoices.join(', ')}`,
            code: 'INVALID_FIELD',
          });
        }
      }
      break;

    case 'checkbox':
      if ('choices' in field && field.choices) {
        const validChoices = Object.keys(field.choices);
        if (Array.isArray(value)) {
          for (const item of value) {
            if (!validChoices.includes(String(item))) {
              errors.push({
                field: field.name,
                message: `Checkbox value "${item}" is not valid. Must be one of: ${validChoices.join(', ')}`,
                code: 'INVALID_FIELD',
              });
            }
          }
        } else if (!validChoices.includes(String(value))) {
          errors.push({
            field: field.name,
            message: `Field "${field.name}" must be one of: ${validChoices.join(', ')}`,
            code: 'INVALID_FIELD',
          });
        }
      }
      break;

    case 'true_false':
      if (typeof value !== 'boolean') {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a boolean`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    // Text fields - just check they're strings
    case 'text':
    case 'textarea':
    case 'wysiwyg':
    case 'password':
      if (typeof value !== 'string') {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a string`,
          code: 'INVALID_FIELD',
        });
      }
      break;

    // Other types - no runtime validation yet
    default:
      // Skip validation for now
      break;
  }

  return errors;
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

/**
 * Validate meta key against CPT schema rules
 * Re-exported from validators.js for convenience
 */
export { validateMetaKeyPattern as validateMetaKeyAgainstSchema };
