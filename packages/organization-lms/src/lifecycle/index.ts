/**
 * Organization-LMS Extension - Lifecycle Hooks
 *
 * AppStore 표준 준수를 위한 Lifecycle 구현
 */

import { DataSource } from 'typeorm';

export interface LifecycleContext {
  dataSource: DataSource;
  options?: {
    preserveData?: boolean;
  };
}

export async function install(context: LifecycleContext): Promise<void> {
  console.log('[organization-lms] Installing...');
  console.log('[organization-lms] Installation complete');
}

export async function activate(context: LifecycleContext): Promise<void> {
  console.log('[organization-lms] Activating...');
  console.log('[organization-lms] Activation complete');
}

export async function deactivate(context: LifecycleContext): Promise<void> {
  console.log('[organization-lms] Deactivating...');
  console.log('[organization-lms] Deactivation complete');
}

export async function uninstall(context: LifecycleContext): Promise<void> {
  console.log('[organization-lms] Uninstalling...');
  if (!context.options?.preserveData) {
    console.log('[organization-lms] Cleanup complete');
  }
  console.log('[organization-lms] Uninstallation complete');
}

export const lifecycle = { install, activate, deactivate, uninstall };
export default lifecycle;
