/**
 * Signage App - Lifecycle Hooks
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
  console.log('[@o4o-apps/signage] Installing...');
  console.log('[@o4o-apps/signage] Installation complete');
}

export async function activate(context: LifecycleContext): Promise<void> {
  console.log('[@o4o-apps/signage] Activating...');
  console.log('[@o4o-apps/signage] Activation complete');
}

export async function deactivate(context: LifecycleContext): Promise<void> {
  console.log('[@o4o-apps/signage] Deactivating...');
  console.log('[@o4o-apps/signage] Deactivation complete');
}

export async function uninstall(context: LifecycleContext): Promise<void> {
  console.log('[@o4o-apps/signage] Uninstalling...');
  console.log('[@o4o-apps/signage] Uninstallation complete');
}

export const lifecycle = { install, activate, deactivate, uninstall };
export default lifecycle;
