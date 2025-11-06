/**
 * CPT Registry - Core Registration System
 * Phase 5: Central registry for CPT schemas with validation
 */

import { CPTSchema, ValidationResult } from './schema.js';
import { validateCPTSchema } from './validators.js';

/**
 * Central CPT Registry
 * Validates and stores CPT schemas for runtime access
 */
export class CPTRegistry {
  private schemas = new Map<string, CPTSchema>();

  /**
   * Register a new CPT schema
   * @throws {Error} if validation fails or name already exists
   */
  register(schema: CPTSchema): void {
    // Validate schema structure
    const validation = validateCPTSchema(schema);
    if (!validation.valid) {
      const errorMessages = validation.errors
        .map(err => `${err.field}: ${err.message}`)
        .join('\n');
      throw new Error(
        `CPT schema validation failed for "${schema.name}":\n${errorMessages}`
      );
    }

    // Check for duplicate registration
    if (this.schemas.has(schema.name)) {
      throw new Error(
        `CPT "${schema.name}" is already registered. Use unregister() first if you need to replace it.`
      );
    }

    // Store with registration timestamp
    const registeredSchema: CPTSchema = {
      ...schema,
      registered_at: new Date(),
    };

    this.schemas.set(schema.name, registeredSchema);
  }

  /**
   * Unregister a CPT schema (for testing or hot-reload)
   */
  unregister(name: string): boolean {
    return this.schemas.delete(name);
  }

  /**
   * Get a specific CPT schema by name
   */
  get(name: string): CPTSchema | undefined {
    return this.schemas.get(name);
  }

  /**
   * List all registered CPT schemas
   */
  list(): CPTSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * List all registered CPT names
   */
  listNames(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Check if a CPT is registered
   */
  has(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * Validate a schema without registering it
   * @throws {Error} if validation fails
   */
  validate(schema: CPTSchema): void {
    const validation = validateCPTSchema(schema);
    if (!validation.valid) {
      const errorMessages = validation.errors
        .map(err => `${err.field}: ${err.message}`)
        .join('\n');
      throw new Error(
        `CPT schema validation failed:\n${errorMessages}`
      );
    }
  }

  /**
   * Validate a schema without throwing (returns result)
   */
  validateSafe(schema: CPTSchema): ValidationResult {
    return validateCPTSchema(schema);
  }

  /**
   * Clear all registered schemas (for testing)
   */
  clear(): void {
    this.schemas.clear();
  }

  /**
   * Get total count of registered CPTs
   */
  count(): number {
    return this.schemas.size;
  }
}

/**
 * Global singleton registry instance
 * Import this in your application bootstrap
 */
export const registry = new CPTRegistry();
