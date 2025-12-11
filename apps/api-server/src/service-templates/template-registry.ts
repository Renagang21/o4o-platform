/**
 * Service Template Registry
 * Phase 7 — Service Templates & App Installer Automation
 *
 * Central registry for loading and managing service templates.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import type {
  ServiceTemplate,
  ServiceTemplateRegistryEntry,
  TemplateCategory,
} from './template-schema.js';
import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service Template Registry
 *
 * Manages loading and retrieval of service templates
 */
export class ServiceTemplateRegistry {
  private templates = new Map<string, ServiceTemplateRegistryEntry>();
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(__dirname, 'templates');
  }

  /**
   * Load all templates from the templates directory
   */
  async loadAll(): Promise<void> {
    if (!existsSync(this.templatesDir)) {
      logger.warn(`[TemplateRegistry] Templates directory not found: ${this.templatesDir}`);
      return;
    }

    const files = readdirSync(this.templatesDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(this.templatesDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const template: ServiceTemplate = JSON.parse(content);

        if (this.validateTemplate(template)) {
          this.templates.set(template.id, {
            template,
            loadedAt: new Date(),
          });
          logger.info(`[TemplateRegistry] Loaded template: ${template.id}`);
        } else {
          logger.warn(`[TemplateRegistry] Invalid template in ${file}`);
        }
      } catch (error) {
        logger.error(`[TemplateRegistry] Failed to load ${file}:`, error);
      }
    }

    logger.info(`[TemplateRegistry] Loaded ${this.templates.size} templates`);
  }

  /**
   * Validate a service template
   */
  private validateTemplate(template: ServiceTemplate): boolean {
    if (!template.id || typeof template.id !== 'string') return false;
    if (!template.label || typeof template.label !== 'string') return false;
    if (!template.serviceGroup) return false;
    if (!Array.isArray(template.coreApps)) return false;
    if (typeof template.autoInstall !== 'boolean') return false;
    return true;
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): ServiceTemplate | undefined {
    return this.templates.get(id)?.template;
  }

  /**
   * Get all templates
   */
  getAllTemplates(): ServiceTemplate[] {
    return Array.from(this.templates.values()).map(e => e.template);
  }

  /**
   * Get active templates only
   */
  getActiveTemplates(): ServiceTemplate[] {
    return this.getAllTemplates().filter(t => t.isActive);
  }

  /**
   * Get templates by service group
   */
  getTemplatesByServiceGroup(serviceGroup: ServiceGroup): ServiceTemplate[] {
    return this.getAllTemplates().filter(t => t.serviceGroup === serviceGroup);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory): ServiceTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Check if template exists
   */
  hasTemplate(id: string): boolean {
    return this.templates.has(id);
  }

  /**
   * Get all required apps for a template (including global core)
   */
  getRequiredApps(templateId: string): string[] {
    const template = this.getTemplate(templateId);
    if (!template) return [];

    const apps = new Set<string>();

    // Add global core apps
    if (template.globalCoreApps) {
      template.globalCoreApps.forEach(app => apps.add(app));
    }

    // Add template core apps
    template.coreApps.forEach(app => apps.add(app));

    return Array.from(apps);
  }

  /**
   * Get all apps for a template (core + extensions)
   */
  getAllApps(templateId: string): { coreApps: string[]; extensionApps: string[] } {
    const template = this.getTemplate(templateId);
    if (!template) return { coreApps: [], extensionApps: [] };

    const coreApps = new Set<string>();

    // Add global core apps
    if (template.globalCoreApps) {
      template.globalCoreApps.forEach(app => coreApps.add(app));
    }

    // Add template core apps
    template.coreApps.forEach(app => coreApps.add(app));

    return {
      coreApps: Array.from(coreApps),
      extensionApps: template.extensionApps || [],
    };
  }

  /**
   * Register a template programmatically
   */
  registerTemplate(template: ServiceTemplate): boolean {
    if (!this.validateTemplate(template)) {
      logger.warn(`[TemplateRegistry] Invalid template: ${template.id}`);
      return false;
    }

    this.templates.set(template.id, {
      template,
      loadedAt: new Date(),
    });

    logger.info(`[TemplateRegistry] Registered template: ${template.id}`);
    return true;
  }

  /**
   * Unregister a template
   */
  unregisterTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      logger.info(`[TemplateRegistry] Unregistered template: ${id}`);
    }
    return deleted;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    active: number;
    byServiceGroup: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const templates = this.getAllTemplates();
    const byServiceGroup: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const template of templates) {
      byServiceGroup[template.serviceGroup] = (byServiceGroup[template.serviceGroup] || 0) + 1;
      if (template.category) {
        byCategory[template.category] = (byCategory[template.category] || 0) + 1;
      }
    }

    return {
      total: templates.length,
      active: this.getActiveTemplates().length,
      byServiceGroup,
      byCategory,
    };
  }

  /**
   * Clear all templates (for testing)
   */
  clear(): void {
    this.templates.clear();
    logger.info('[TemplateRegistry] Cleared all templates');
  }
}

/**
 * Singleton instance
 */
export const templateRegistry = new ServiceTemplateRegistry();

export default templateRegistry;
