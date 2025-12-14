/**
 * Pharmaceutical Core Activate Hook
 *
 * Called when the app is activated.
 * Registers with Dropshipping Core Extension Registry.
 *
 * @package @o4o/pharmaceutical-core
 */

import type { DataSource } from 'typeorm';
import { registerExtension } from '@o4o/dropshipping-core';
import { pharmaceuticalExtension } from '../hooks/pharmaceutical-extension.js';

/**
 * Activate hook - enables routes and event handlers
 */
export async function onActivate(dataSource: DataSource): Promise<void> {
  console.log('[pharmaceutical-core] Running activate hook...');

  // 1. Core Extension Registry에 등록
  console.log('[pharmaceutical-core] Registering with Dropshipping Core Extension Registry...');
  registerExtension(pharmaceuticalExtension);
  console.log('[pharmaceutical-core] Extension registered successfully');

  // 2. Event handlers 등록
  console.log('[pharmaceutical-core] Event handlers enabled:');
  console.log('[pharmaceutical-core] - pharma.product.created');
  console.log('[pharmaceutical-core] - pharma.offer.created');
  console.log('[pharmaceutical-core] - pharma.order.created');
  console.log('[pharmaceutical-core] - pharma.settlement.created');

  // 3. Core v2 Hooks 활성화
  console.log('[pharmaceutical-core] Core v2 hooks enabled:');
  console.log('[pharmaceutical-core] - beforeOfferCreate: Only WHOLESALER/MANUFACTURER with license');
  console.log('[pharmaceutical-core] - beforeListingCreate: ALWAYS BLOCKED (B2C prohibited)');
  console.log('[pharmaceutical-core] - beforeOrderCreate: Only PHARMACY with license');
  console.log('[pharmaceutical-core] - beforeSettlementCreate: SUPPLIER only (no seller settlement)');
  console.log('[pharmaceutical-core] - beforeCommissionApply: Max 2% rate');

  console.log('[pharmaceutical-core] Activation completed');
}

export default onActivate;
