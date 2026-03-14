/**
 * @o4o/capabilities — Store Capability Registry
 * WO-O4O-CAPABILITY-REGISTRY-V1
 */

export type { CapabilityCategory, CapabilityMeta, CapabilitySource, ServiceKey } from './types.js';

export {
  StoreCapability,
  type StoreCapabilityKey,
  CAPABILITY_REGISTRY,
  CAPABILITY_MAP,
  DEFAULT_CAPABILITIES,
  CAPABILITY_CHANNEL_MAP,
  CAPABILITY_LABELS,
  getCapabilityMeta,
  getCapabilityLabel,
} from './registry.js';

export { SERVICE_CAPABILITIES, isCapabilityAvailable } from './service-policy.js';
