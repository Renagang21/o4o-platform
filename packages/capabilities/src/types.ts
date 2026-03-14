/**
 * Capability Registry Types
 * WO-O4O-CAPABILITY-REGISTRY-V1
 */

export type CapabilityCategory = 'commerce' | 'device' | 'marketing' | 'content';

export type CapabilitySource = 'system' | 'admin' | 'plan';

export interface CapabilityMeta {
  key: string;
  label: string;
  category: CapabilityCategory;
  channelType: string | null;
  defaultEnabled: boolean;
  sortOrder: number;
}

export type ServiceKey = 'kpa' | 'cosmetics' | 'glycopharm';
