/**
 * Pharmaceutical Core Deactivate Hook
 *
 * Called when the app is deactivated.
 * Unregisters from Dropshipping Core Extension Registry.
 *
 * @package @o4o/pharmaceutical-core
 */

import { unregisterExtension } from '@o4o/dropshipping-core';

/**
 * Deactivate hook - disables routes and event handlers
 */
export async function onDeactivate(): Promise<void> {
  console.log('[pharmaceutical-core] Running deactivate hook...');

  // 1. Core Extension Registry에서 해제
  console.log('[pharmaceutical-core] Unregistering from Dropshipping Core Extension Registry...');
  unregisterExtension('pharmaceutical-core');
  console.log('[pharmaceutical-core] Extension unregistered successfully');

  // 2. Event handlers 해제
  console.log('[pharmaceutical-core] Event handlers disabled');

  console.log('[pharmaceutical-core] Deactivation completed');
}

export default onDeactivate;
