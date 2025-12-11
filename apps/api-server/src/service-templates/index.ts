/**
 * Service Templates Module
 * Phase 7 — Service Templates & App Installer Automation
 *
 * Exports all service template related functionality
 */

// Schema and Types
export * from './template-schema.js';

// Template Registry
export { ServiceTemplateRegistry, templateRegistry } from './template-registry.js';

// Service Installer
export { ServiceInstaller, serviceInstaller } from './service-installer.js';
