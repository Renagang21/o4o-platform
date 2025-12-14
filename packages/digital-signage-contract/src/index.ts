/**
 * Digital Signage Extension Contract
 *
 * This package provides types and a client for Extensions
 * to interact with Digital Signage Core.
 *
 * Contract Version: v1.0
 *
 * @example
 * ```typescript
 * import {
 *   SignageContractClient,
 *   ExecuteActionRequest,
 *   ActionStatus,
 * } from '@o4o/digital-signage-contract';
 *
 * const client = new SignageContractClient({
 *   baseUrl: process.env.SIGNAGE_API_URL,
 *   appId: 'my-extension',
 * });
 *
 * const result = await client.executeAction({
 *   mediaListId: 'uuid',
 *   displaySlotId: 'uuid',
 *   duration: 60,
 *   executeMode: 'replace',
 * });
 * ```
 */

// Export all types
export * from './types';

// Export client
export { SignageContractClient } from './client';
