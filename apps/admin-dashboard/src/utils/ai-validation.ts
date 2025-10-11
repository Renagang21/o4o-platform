/**
 * AI Output Validation Utility
 * Sprint 2 - P2: Frontend JSON Schema validation with Ajv
 *
 * Features:
 * - Fetch schema from server SSOT
 * - Validate AI-generated content before save/publish
 * - Schema version tracking with ETag caching
 * - Field-level error reporting
 * - Limited validation mode for missing/expired schemas
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import axios from 'axios';

interface AIOutputSchema {
  schema: any;
  metadata: {
    schemaVersion: string;
    lastUpdated: string;
    description: string;
  };
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  validationMode: 'full' | 'limited';
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

class AIValidationService {
  private static instance: AIValidationService;
  private ajv: Ajv;
  private validator: ValidateFunction | null = null;
  private schemaVersion: string | null = null;
  private lastFetched: Date | null = null;
  private etag: string | null = null;
  private validationMode: 'full' | 'limited' = 'limited';

  private readonly SCHEMA_ENDPOINT = '/api/ai/schema';
  private readonly CACHE_DURATION_MS = 3600000; // 1 hour

  private constructor() {
    this.ajv = new Ajv({
      allErrors: true, // Collect all errors, not just first
      strict: false, // Allow additional properties
      validateFormats: true,
    });
  }

  static getInstance(): AIValidationService {
    if (!AIValidationService.instance) {
      AIValidationService.instance = new AIValidationService();
    }
    return AIValidationService.instance;
  }

  /**
   * Initialize validator by fetching schema from server
   * Call this on app initialization
   */
  async initialize(): Promise<boolean> {
    try {
      await this.fetchSchema();
      return true;
    } catch (error) {
      console.warn('Failed to initialize AI validation, running in limited mode:', error);
      this.validationMode = 'limited';
      return false;
    }
  }

  /**
   * Fetch schema from server with ETag caching
   */
  private async fetchSchema(force: boolean = false): Promise<void> {
    try {
      // Check cache freshness
      if (!force && this.lastFetched) {
        const cacheAge = Date.now() - this.lastFetched.getTime();
        if (cacheAge < this.CACHE_DURATION_MS) {
          // Using cached schema
          return;
        }
      }

      const headers: Record<string, string> = {};
      if (this.etag) {
        headers['If-None-Match'] = this.etag;
      }

      const response = await axios.get<{ success: boolean; data: AIOutputSchema }>(
        this.SCHEMA_ENDPOINT,
        { headers }
      );

      // 304 Not Modified - schema unchanged
      if (response.status === 304) {
        this.lastFetched = new Date();
        return;
      }

      const { schema, metadata } = response.data.data;

      // Check for version change
      const previousVersion = this.schemaVersion;
      this.schemaVersion = metadata.schemaVersion;

      if (previousVersion && previousVersion !== this.schemaVersion) {
        console.warn('Schema version changed:', previousVersion, '->', this.schemaVersion);
        // Emit event for version mismatch warning banner
        this.emitVersionChangeEvent(previousVersion, this.schemaVersion);
      }

      // Compile schema
      this.validator = this.ajv.compile(schema);
      this.lastFetched = new Date();
      this.validationMode = 'full';

      // Store ETag for caching
      this.etag = response.headers['etag'] || null;

    } catch (error: any) {
      console.error('Failed to fetch schema:', error);

      // If we already have a validator, keep using it (degraded mode)
      if (this.validator) {
        console.warn('Using stale schema, network error');
        return;
      }

      // Otherwise switch to limited validation mode
      this.validationMode = 'limited';
      throw error;
    }
  }

  /**
   * Validate AI output
   * @param output - AI-generated content (must have { blocks: [] } structure)
   */
  validate(output: any): ValidationResult {
    // Limited validation mode (schema not available)
    if (this.validationMode === 'limited' || !this.validator) {
      return this.performLimitedValidation(output);
    }

    // Full validation mode (with JSON Schema)
    const valid = this.validator(output);

    if (valid) {
      return {
        valid: true,
        errors: [],
        validationMode: 'full'
      };
    }

    // Parse Ajv errors into user-friendly format
    const errors = this.parseAjvErrors(this.validator.errors || []);

    return {
      valid: false,
      errors,
      validationMode: 'full'
    };
  }

  /**
   * Limited validation mode (basic structure checks)
   * Used when schema is unavailable
   */
  private performLimitedValidation(output: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if output is an object
    if (typeof output !== 'object' || output === null) {
      errors.push({
        field: 'root',
        message: 'Output must be an object'
      });
      return { valid: false, errors, validationMode: 'limited' };
    }

    // Check if blocks array exists
    if (!Array.isArray(output.blocks)) {
      errors.push({
        field: 'blocks',
        message: 'Output must contain a "blocks" array'
      });
      return { valid: false, errors, validationMode: 'limited' };
    }

    // Basic block structure validation
    output.blocks.forEach((block: any, index: number) => {
      if (typeof block !== 'object' || block === null) {
        errors.push({
          field: `blocks[${index}]`,
          message: 'Block must be an object'
        });
        return;
      }

      if (typeof block.type !== 'string' || !block.type) {
        errors.push({
          field: `blocks[${index}].type`,
          message: 'Block must have a "type" string'
        });
      }

      if (typeof block.attributes !== 'object' || block.attributes === null) {
        errors.push({
          field: `blocks[${index}].attributes`,
          message: 'Block must have an "attributes" object'
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      validationMode: 'limited'
    };
  }

  /**
   * Parse Ajv errors into user-friendly format
   */
  private parseAjvErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map((error) => {
      const field = error.instancePath || 'root';
      let message = error.message || 'Validation failed';

      // Add context for better error messages
      switch (error.keyword) {
        case 'required':
          message = `Missing required field: ${error.params.missingProperty}`;
          break;
        case 'type':
          message = `Expected ${error.params.type}, got ${typeof error.data}`;
          break;
        case 'enum':
          message = `Value must be one of: ${error.params.allowedValues.join(', ')}`;
          break;
        case 'minLength':
          message = `Minimum length is ${error.params.limit}`;
          break;
        case 'maxLength':
          message = `Maximum length is ${error.params.limit}`;
          break;
        case 'minimum':
          message = `Minimum value is ${error.params.limit}`;
          break;
        case 'maximum':
          message = `Maximum value is ${error.params.limit}`;
          break;
        case 'pattern':
          message = `Value does not match required pattern`;
          break;
        case 'format':
          message = `Invalid format (expected ${error.params.format})`;
          break;
      }

      return {
        field,
        message,
        value: error.data
      };
    });
  }

  /**
   * Emit schema version change event
   * Frontend can listen to this to show warning banner
   */
  private emitVersionChangeEvent(oldVersion: string, newVersion: string): void {
    const event = new CustomEvent('ai-schema-version-changed', {
      detail: { oldVersion, newVersion }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get current schema version
   */
  getSchemaVersion(): string | null {
    return this.schemaVersion;
  }

  /**
   * Get current validation mode
   */
  getValidationMode(): 'full' | 'limited' {
    return this.validationMode;
  }

  /**
   * Force schema refresh
   */
  async refreshSchema(): Promise<void> {
    await this.fetchSchema(true);
  }

  /**
   * Check if validator is ready
   */
  isReady(): boolean {
    return this.validator !== null;
  }
}

// Export singleton instance
export const aiValidation = AIValidationService.getInstance();

// Export types
export type { ValidationResult, ValidationError };
