/**
 * Service Template Linter
 * Phase 9 Task 4.2 — Service Template Validation Enforcement
 *
 * Validates ServiceTemplate configurations for quality and consistency:
 * - Template–InitPack matching
 * - Required core apps validation
 * - Invalid extension detection
 */

import { ServiceTemplate, GLOBAL_CORE_APPS } from '../service-templates/template-schema.js';
import { ServiceInitPack } from '../service-templates/init-schema.js';
import logger from '../utils/logger.js';

// =============================================================================
// Lint Error Types
// =============================================================================

export type TemplateLintErrorType =
  | 'TemplateMismatchError'
  | 'TemplateIncompleteError'
  | 'InvalidExtensionError'
  | 'MissingTemplateField'
  | 'InvalidFieldValue';

export type TemplateLintSeverity = 'error' | 'warning' | 'info';

export interface TemplateLintError {
  type: TemplateLintErrorType;
  severity: TemplateLintSeverity;
  field: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface TemplateLintResult {
  templateId: string;
  isValid: boolean;
  errors: TemplateLintError[];
  warnings: TemplateLintError[];
  infos: TemplateLintError[];
  score: number; // 0-100
  lintedAt: Date;
  duration: number; // ms
}

// =============================================================================
// Required Core Apps by Service Group
// =============================================================================

const REQUIRED_CORE_APPS: Record<string, string[]> = {
  cosmetics: ['cms-core', 'organization-core', 'cosmetics-core'],
  yaksa: ['cms-core', 'organization-core', 'membership-yaksa', 'forum-yaksa'],
  tourist: ['cms-core', 'organization-core'],
  default: ['cms-core', 'organization-core'],
};

// =============================================================================
// Recommended Extensions by Service Group
// =============================================================================

const RECOMMENDED_EXTENSIONS: Record<string, string[]> = {
  cosmetics: ['review-core', 'cosmetics-seller-extension'],
  yaksa: ['reporting-yaksa', 'lms-yaksa'],
  tourist: ['booking-core', 'reviews-core'],
  default: [],
};

// =============================================================================
// Invalid (Incompatible) Extensions by Service Group
// =============================================================================

const INCOMPATIBLE_EXTENSIONS: Record<string, string[]> = {
  cosmetics: ['yaksa-member', 'yaksa-extension', 'forum-yaksa', 'membership-yaksa', 'reporting-yaksa', 'lms-yaksa'],
  yaksa: ['cosmetics-core', 'cosmetics-seller', 'cosmetics-extension'],
  tourist: ['yaksa-member', 'cosmetics-core'],
  default: [],
};

// =============================================================================
// Template Linter Class
// =============================================================================

export class TemplateLinter {
  private errors: TemplateLintError[] = [];
  private warnings: TemplateLintError[] = [];
  private infos: TemplateLintError[] = [];
  private initPackRegistry: Map<string, ServiceInitPack> = new Map();

  /**
   * Set InitPack registry for matching validation
   */
  setInitPackRegistry(initPacks: ServiceInitPack[]): void {
    this.initPackRegistry.clear();
    initPacks.forEach(pack => {
      this.initPackRegistry.set(pack.id, pack);
    });
  }

  /**
   * Lint a single ServiceTemplate
   */
  lint(template: ServiceTemplate, initPacks?: ServiceInitPack[]): TemplateLintResult {
    const startTime = Date.now();
    this.errors = [];
    this.warnings = [];
    this.infos = [];

    // Update registry if initPacks provided
    if (initPacks) {
      this.setInitPackRegistry(initPacks);
    }

    // Run all validations
    this.validateRequiredFields(template);
    this.validateCoreApps(template);
    this.validateExtensions(template);
    this.validateTemplateInitPackMatch(template);

    const duration = Date.now() - startTime;
    const score = this.calculateScore();

    return {
      templateId: template.id,
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      infos: this.infos,
      score,
      lintedAt: new Date(),
      duration,
    };
  }

  /**
   * Lint multiple templates
   */
  lintAll(templates: ServiceTemplate[], initPacks?: ServiceInitPack[]): TemplateLintResult[] {
    if (initPacks) {
      this.setInitPackRegistry(initPacks);
    }
    return templates.map(template => this.lint(template));
  }

  // ===========================================================================
  // Validation Methods
  // ===========================================================================

  /**
   * Validate required template fields
   */
  private validateRequiredFields(template: ServiceTemplate): void {
    const requiredFields = ['id', 'label', 'description', 'serviceGroup', 'coreApps', 'autoInstall', 'version', 'isActive'];

    for (const field of requiredFields) {
      if (!(field in template) || template[field as keyof ServiceTemplate] === undefined) {
        this.addError('MissingTemplateField', 'error', field, `Required field '${field}' is missing`);
      }
    }

    // Validate serviceGroup value
    const validServiceGroups = ['cosmetics', 'yaksa', 'tourist', 'default'];
    if (template.serviceGroup && !validServiceGroups.includes(template.serviceGroup)) {
      this.addError('InvalidFieldValue', 'warning', 'serviceGroup',
        `Service group '${template.serviceGroup}' is not in the standard list: ${validServiceGroups.join(', ')}`);
    }

    // Validate version format
    if (template.version && !/^\d+\.\d+(\.\d+)?$/.test(template.version)) {
      this.addError('InvalidFieldValue', 'warning', 'version',
        `Version '${template.version}' should follow semantic versioning (e.g., 1.0.0 or 1.0)`);
    }

    // Validate coreApps is not empty
    if (!template.coreApps || template.coreApps.length === 0) {
      this.addError('TemplateIncompleteError', 'error', 'coreApps', 'Template must have at least one core app');
    }
  }

  /**
   * A) Template–InitPack Matching
   */
  private validateTemplateInitPackMatch(template: ServiceTemplate): void {
    // Expected InitPack ID patterns
    const expectedPatterns = [
      `${template.id}-init`,
      `${template.id}-initpack`,
      template.id.replace('-template', '-init'),
    ];

    // Check if matching InitPack exists
    let matchFound = false;
    let matchedInitPackId: string | null = null;

    for (const [initPackId, initPack] of this.initPackRegistry) {
      // Check direct match
      if (expectedPatterns.includes(initPackId)) {
        matchFound = true;
        matchedInitPackId = initPackId;
        break;
      }

      // Check prefix match
      const templatePrefix = template.id.split('-')[0];
      const initPackPrefix = initPackId.split('-')[0];
      if (templatePrefix === initPackPrefix && initPack.serviceGroup === template.serviceGroup) {
        matchFound = true;
        matchedInitPackId = initPackId;
        break;
      }
    }

    if (!matchFound && this.initPackRegistry.size > 0) {
      this.addError('TemplateMismatchError', 'warning', 'id',
        `No matching InitPack found for template '${template.id}'. Expected one of: ${expectedPatterns.join(', ')}`);
    } else if (matchFound) {
      this.addError('TemplateMismatchError', 'info', 'id',
        `Template '${template.id}' matched with InitPack '${matchedInitPackId}'`);

      // Verify serviceGroup matches
      const initPack = this.initPackRegistry.get(matchedInitPackId!);
      if (initPack && initPack.serviceGroup !== template.serviceGroup) {
        this.addError('TemplateMismatchError', 'error', 'serviceGroup',
          `Template serviceGroup '${template.serviceGroup}' does not match InitPack serviceGroup '${initPack.serviceGroup}'`);
      }
    }
  }

  /**
   * B) Required Core Apps Validation
   */
  private validateCoreApps(template: ServiceTemplate): void {
    const serviceGroup = template.serviceGroup;
    const requiredApps = REQUIRED_CORE_APPS[serviceGroup] || REQUIRED_CORE_APPS.default;
    const allTemplateApps = [
      ...(template.globalCoreApps || GLOBAL_CORE_APPS),
      ...template.coreApps,
    ];

    // Check for missing required apps
    const missingApps: string[] = [];
    for (const requiredApp of requiredApps) {
      if (!allTemplateApps.includes(requiredApp)) {
        missingApps.push(requiredApp);
      }
    }

    if (missingApps.length > 0) {
      this.addError('TemplateIncompleteError', 'error', 'coreApps',
        `Template is missing required core apps for ${serviceGroup}: ${missingApps.join(', ')}`);
    }

    // Check for recommended extensions
    const recommendedExtensions = RECOMMENDED_EXTENSIONS[serviceGroup] || [];
    const allApps = [...allTemplateApps, ...(template.extensionApps || [])];

    const missingRecommended: string[] = [];
    for (const recommended of recommendedExtensions) {
      if (!allApps.includes(recommended)) {
        missingRecommended.push(recommended);
      }
    }

    if (missingRecommended.length > 0) {
      this.addError('TemplateIncompleteError', 'info', 'extensionApps',
        `Consider adding recommended extensions for ${serviceGroup}: ${missingRecommended.join(', ')}`);
    }
  }

  /**
   * C) Invalid Extension Detection
   */
  private validateExtensions(template: ServiceTemplate): void {
    const serviceGroup = template.serviceGroup;
    const incompatible = INCOMPATIBLE_EXTENSIONS[serviceGroup] || [];

    const allApps = [
      ...(template.globalCoreApps || []),
      ...template.coreApps,
      ...(template.extensionApps || []),
    ];

    // Check for incompatible extensions
    for (const app of allApps) {
      if (incompatible.includes(app)) {
        this.addError('InvalidExtensionError', 'error', 'extensionApps',
          `Template includes incompatible app '${app}' for ${serviceGroup} service`);
      }

      // Additional check: app name contains other service keywords
      const otherServiceKeywords: Record<string, string[]> = {
        cosmetics: ['yaksa', 'pharmacy'],
        yaksa: ['cosmetics', 'beauty', 'skincare'],
        tourist: ['yaksa', 'cosmetics'],
      };

      const keywords = otherServiceKeywords[serviceGroup] || [];
      for (const keyword of keywords) {
        if (app.toLowerCase().includes(keyword)) {
          this.addError('InvalidExtensionError', 'warning', 'extensionApps',
            `App '${app}' appears to be for a different service (contains '${keyword}' in ${serviceGroup} template)`);
        }
      }
    }

    // Check for duplicate apps
    const seenApps = new Set<string>();
    for (const app of allApps) {
      if (seenApps.has(app)) {
        this.addError('InvalidExtensionError', 'warning', 'coreApps',
          `Duplicate app '${app}' found in template`);
      }
      seenApps.add(app);
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Add an error to the appropriate list
   */
  private addError(
    type: TemplateLintErrorType,
    severity: TemplateLintSeverity,
    field: string,
    message: string,
    details?: Record<string, unknown>
  ): void {
    const error: TemplateLintError = { type, severity, field, message, details };

    switch (severity) {
      case 'error':
        this.errors.push(error);
        break;
      case 'warning':
        this.warnings.push(error);
        break;
      case 'info':
        this.infos.push(error);
        break;
    }
  }

  /**
   * Calculate quality score
   * 100 - (errors * 20) - (warnings * 5)
   */
  private calculateScore(): number {
    const penalty = (this.errors.length * 20) + (this.warnings.length * 5);
    return Math.max(0, 100 - penalty);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const templateLinter = new TemplateLinter();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick lint function
 */
export function lintTemplate(template: ServiceTemplate, initPacks?: ServiceInitPack[]): TemplateLintResult {
  return templateLinter.lint(template, initPacks);
}

/**
 * Lint all templates
 */
export function lintAllTemplates(templates: ServiceTemplate[], initPacks?: ServiceInitPack[]): TemplateLintResult[] {
  return templateLinter.lintAll(templates, initPacks);
}

// =============================================================================
// Exports
// =============================================================================

export {
  REQUIRED_CORE_APPS,
  RECOMMENDED_EXTENSIONS,
  INCOMPATIBLE_EXTENSIONS,
};
