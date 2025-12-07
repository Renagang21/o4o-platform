/**
 * Module Loader Type Definitions
 * Phase 5 — AppStore + Module Loader
 */

import { Router } from 'express';

/**
 * App Module Interface
 *
 * Represents a loadable app with backend functionality
 */
export interface AppModule {
  /** Unique app identifier (e.g., 'cosmetics-core', 'forum-yaksa') */
  id: string;

  /** Optional namespace for grouping (e.g., 'cosmetics', 'forum') */
  namespace?: string;

  /** Display name */
  name: string;

  /** Semantic version */
  version: string;

  /** App type */
  type: 'core' | 'extension' | 'standalone';

  /** Dependencies (array of app IDs that must be loaded first) */
  dependsOn?: string[];

  /** Backend exports (routes, services, entities, middleware) */
  backend?: {
    /** Express router factory (optionally accepts DataSource) */
    routes?: (dataSource?: any) => Router;

    /** Service exports (injectable services) */
    services?: Record<string, any>;

    /** TypeORM entities */
    entities?: any[];

    /** Express middleware */
    middleware?: any[];
  };

  /** Lifecycle hooks */
  lifecycle?: {
    /** Called when app is first installed */
    install?: () => Promise<void>;

    /** Called when app is activated */
    activate?: () => Promise<void>;

    /** Called when app is deactivated */
    deactivate?: () => Promise<void>;

    /** Called when app is uninstalled */
    uninstall?: () => Promise<void>;
  };

  /** Absolute path to package directory */
  packagePath?: string;

  /** Whether the module is currently active */
  isActive?: boolean;
}

/**
 * Module Loader Configuration
 */
export interface ModuleLoaderConfig {
  /** Absolute path to monorepo root */
  workspaceRoot: string;

  /** Path to packages directory (relative to workspace root) */
  packagesDir: string;

  /** Auto-activate modules after loading */
  autoActivate: boolean;

  /** Glob patterns for finding manifest files */
  scanPatterns: string[];
}

/**
 * Module Registry Entry
 */
export interface ModuleRegistryEntry {
  /** The loaded module */
  module: AppModule;

  /** Current status */
  status: 'loaded' | 'active' | 'inactive' | 'error';

  /** Error message if status is 'error' */
  error?: string;

  /** Timestamp when module was loaded */
  loadedAt: Date;

  /** Timestamp when module was last activated */
  activatedAt?: Date;
}

/**
 * Module Registry (Map of module ID to registry entry)
 */
export type ModuleRegistry = Map<string, ModuleRegistryEntry>;
