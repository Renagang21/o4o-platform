/**
 * Service-level Capability Policy
 * WO-O4O-CAPABILITY-REGISTRY-V1
 *
 * 서비스별 사용 가능한 Capability 목록.
 * 현재는 3개 서비스 모두 전체 10개 허용 (향후 제한 가능).
 */

import type { ServiceKey } from './types.js';
import { StoreCapability, type StoreCapabilityKey } from './registry.js';

const ALL_CAPABILITIES = Object.values(StoreCapability) as readonly StoreCapabilityKey[];

export const SERVICE_CAPABILITIES: Record<ServiceKey, readonly StoreCapabilityKey[]> = {
  kpa: ALL_CAPABILITIES,
  cosmetics: ALL_CAPABILITIES,
  glycopharm: ALL_CAPABILITIES,
};

export function isCapabilityAvailable(serviceKey: ServiceKey, capKey: string): boolean {
  return (SERVICE_CAPABILITIES[serviceKey] as readonly string[]).includes(capKey);
}
