export const SERVICE_KEYS = {
  KPA: 'kpa',
  KPA_GROUPBUY: 'kpa-groupbuy',
  COSMETICS: 'cosmetics',
  GLYCOPHARM: 'glycopharm',
} as const;

export type ServiceKey = typeof SERVICE_KEYS[keyof typeof SERVICE_KEYS];
