/**
 * Cosmetics Seller Extension Lifecycle Hooks
 *
 * Minimal lifecycle hooks that don't depend on other modules.
 * Complex initialization is deferred to the backend module.
 */

import type { DataSource } from 'typeorm';
import type { Router } from 'express';

// ==================== Context Types ====================

export interface InstallContext {
  dataSource: DataSource;
  appId: string;
}

export interface ActivateContext {
  dataSource: DataSource;
  appId: string;
  router?: Router;
}

export interface DeactivateContext {
  appId: string;
}

export interface UninstallContext {
  dataSource: DataSource;
  appId: string;
  keepData?: boolean;
}

export interface ActivateResult {
  routes?: Router;
  services?: Record<string, unknown>;
}

// ==================== Install Hook ====================

export async function install(context: InstallContext): Promise<void> {
  const { appId } = context;
  console.log(`[${appId}] cosmetics-seller-extension installed.`);
}

// ==================== Activate Hook ====================

export async function activate(context: ActivateContext): Promise<ActivateResult> {
  const { appId } = context;
  console.log(`[${appId}] cosmetics-seller-extension activated.`);

  // Routes will be registered by the backend module
  // This hook just confirms activation
  return {
    services: {},
  };
}

// ==================== Deactivate Hook ====================

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { appId } = context;
  console.log(`[${appId}] cosmetics-seller-extension deactivated.`);
}

// ==================== Uninstall Hook ====================

export async function uninstall(context: UninstallContext): Promise<void> {
  const { appId } = context;
  console.log(`[${appId}] cosmetics-seller-extension uninstalled.`);
}
