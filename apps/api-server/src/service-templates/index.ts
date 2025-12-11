/**
 * Service Templates Module
 * Phase 7 — Service Templates & App Installer Automation
 * Phase 8 — Service Environment Initialization
 *
 * Exports all service template related functionality
 */

// Schema and Types
export * from './template-schema.js';
export * from './init-schema.js';

// Template Registry
export { ServiceTemplateRegistry, templateRegistry } from './template-registry.js';

// Init Pack Registry (Phase 8)
export { InitPackRegistry, initPackRegistry } from './init-pack-registry.js';

// Service Installer
export { ServiceInstaller, serviceInstaller, type ExtendedServiceProvisioningResult } from './service-installer.js';

// Service Initializer (Phase 8)
export { ServiceInitializer, serviceInitializer } from './service-initializer.js';
