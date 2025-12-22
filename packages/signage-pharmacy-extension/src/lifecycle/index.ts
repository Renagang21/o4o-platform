/**
 * Signage Pharmacy Extension Lifecycle Hooks
 *
 * Minimal lifecycle hooks for pharmacy signage extension.
 * This extension uses digital-signage-contract to interact with Core.
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
  console.log(`[${appId}] signage-pharmacy-extension installed.`);
  // No tables to create - uses Core tables via Contract
}

// ==================== Activate Hook ====================

export async function activate(context: ActivateContext): Promise<ActivateResult> {
  const { appId } = context;
  console.log(`[${appId}] signage-pharmacy-extension activated.`);

  return {
    services: {},
  };
}

// ==================== Deactivate Hook ====================

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { appId } = context;
  console.log(`[${appId}] signage-pharmacy-extension deactivated.`);
}

// ==================== Uninstall Hook ====================

export async function uninstall(context: UninstallContext): Promise<void> {
  const { appId } = context;
  console.log(`[${appId}] signage-pharmacy-extension uninstalled.`);
  // No tables to drop - uses Core tables
}
