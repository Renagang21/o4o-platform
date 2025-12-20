/**
 * App Lifecycle Context Types
 *
 * Standardized context objects passed to app lifecycle hooks.
 * These provide necessary resources (DB, logger, config) for apps
 * to perform installation, activation, deactivation, and uninstallation tasks.
 */

import { DataSource } from 'typeorm';
import type { AppManifest } from './app-manifest.js';
import type { Logger } from 'winston';

/**
 * Base context for all lifecycle hooks
 */
export interface AppLifecycleContext {
  /** App identifier */
  appId: string;

  /** App manifest */
  manifest: AppManifest;

  /** TypeORM DataSource for database operations */
  dataSource: DataSource;

  /** Logger instance */
  logger: Logger;

  /** Installation/activation options */
  options?: Record<string, any>;
}

/**
 * Install hook context
 */
export interface InstallContext extends AppLifecycleContext {
  options?: {
    /** Adopt existing tables if found */
    adoptExistingTables?: boolean;
    /** Seed default data */
    seedDefaultData?: boolean;
    /** Auto-activate after install */
    autoActivate?: boolean;
    [key: string]: any;
  };
}

/**
 * Activate hook context
 */
export interface ActivateContext extends AppLifecycleContext {
  options?: {
    /** Skip menu registration */
    skipMenuRegistration?: boolean;
    /** Skip route registration */
    skipRouteRegistration?: boolean;
    [key: string]: any;
  };
}

/**
 * Deactivate hook context
 */
export interface DeactivateContext extends AppLifecycleContext {
  options?: {
    /** Keep caches */
    keepCaches?: boolean;
    [key: string]: any;
  };
}

/**
 * Uninstall hook context
 */
export interface UninstallContext extends AppLifecycleContext {
  options?: {
    /** Purge all data */
    purgeData?: boolean;
    /** Create backup before purge */
    createBackup?: boolean;
    [key: string]: any;
  };
}

/**
 * Lifecycle hook function signatures
 */
export type InstallHook = (context: InstallContext) => Promise<void>;
export type ActivateHook = (context: ActivateContext) => Promise<void>;
export type DeactivateHook = (context: DeactivateContext) => Promise<void>;
export type UninstallHook = (context: UninstallContext) => Promise<void>;
