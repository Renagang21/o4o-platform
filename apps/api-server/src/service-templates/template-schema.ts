/**
 * Service Template Schema
 * Phase 7 — Service Templates & App Installer Automation
 *
 * Defines the structure for service templates that automate
 * app installation and provisioning for different service types.
 */

import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

/**
 * Service Template Interface
 *
 * Defines a complete service configuration including required apps,
 * optional extensions, and installation behavior.
 */
export interface ServiceTemplate {
  /** Unique template identifier */
  id: string;

  /** Display name for the template */
  label: string;

  /** Description of what this service template provides */
  description: string;

  /** Service group this template belongs to */
  serviceGroup: ServiceGroup;

  /** Core apps that must be installed (Feature Core) */
  coreApps: string[];

  /** Optional extension apps (can be selected during setup) */
  extensionApps?: string[];

  /** Global core apps always included (typically cms-core, org-core) */
  globalCoreApps?: string[];

  /** Whether to auto-install all coreApps when service is created */
  autoInstall: boolean;

  /** Default settings for the service */
  defaultSettings?: Record<string, unknown>;

  /** Icon for UI display */
  icon?: string;

  /** Category for grouping templates */
  category?: 'commerce' | 'organization' | 'community' | 'education' | 'health' | 'retail';

  /** Template version */
  version: string;

  /** Author or maintainer */
  author?: string;

  /** Whether this template is active and available */
  isActive: boolean;
}

/**
 * Service Template Registry Entry
 */
export interface ServiceTemplateRegistryEntry {
  template: ServiceTemplate;
  loadedAt: Date;
}

/**
 * Service Provisioning Request
 */
export interface ServiceProvisioningRequest {
  /** Organization ID to create service under */
  organizationId: string;

  /** Tenant ID for the new service */
  tenantId: string;

  /** Template to use for provisioning */
  serviceTemplateId: string;

  /** Optional: Override template settings */
  settingsOverride?: Record<string, unknown>;

  /** Optional: Additional extension apps to install */
  additionalExtensions?: string[];

  /** Optional: Skip certain apps from template */
  skipApps?: string[];
}

/**
 * Service Provisioning Result
 */
export interface ServiceProvisioningResult {
  /** Whether provisioning succeeded */
  success: boolean;

  /** Organization ID */
  organizationId: string;

  /** Tenant ID */
  tenantId: string;

  /** Service group assigned */
  serviceGroup: ServiceGroup;

  /** Apps that were installed */
  installedApps: string[];

  /** Apps that were skipped (already installed or in skipApps) */
  skippedApps: string[];

  /** Apps that failed to install */
  failedApps: Array<{ appId: string; error: string }>;

  /** Total installation time in milliseconds */
  installationTimeMs: number;

  /** Error message if success is false */
  error?: string;
}

/**
 * App Installation Order Entry
 */
export interface AppInstallationOrder {
  /** App ID */
  appId: string;

  /** Installation priority (lower = install first) */
  priority: number;

  /** Dependencies that must be installed before this app */
  dependencies: string[];

  /** Whether this is a core app (required) or extension (optional) */
  isCore: boolean;
}

/**
 * Dependency Resolution Result
 */
export interface DependencyResolutionResult {
  /** Ordered list of apps to install */
  installOrder: string[];

  /** Apps that have circular dependencies (cannot be resolved) */
  circularDependencies: string[];

  /** Missing dependencies that are not in the catalog */
  missingDependencies: string[];

  /** Whether resolution was successful */
  success: boolean;
}

/**
 * Global Core Apps
 * These are always installed regardless of template
 */
export const GLOBAL_CORE_APPS = [
  'cms-core',
  'organization-core',
];

/**
 * Default service template categories
 */
export const TEMPLATE_CATEGORIES = [
  'commerce',
  'organization',
  'community',
  'education',
  'health',
  'retail',
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];
