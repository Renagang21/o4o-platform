// WO-O4O-SERVICE-CONFIG-INTRODUCTION-V1
export type { ServiceKey, ServiceConfig, ServiceTemplateKey } from './serviceConfig.js';
export { kpaConfig } from './services/kpa.js';
export { glycopharmConfig } from './services/glycopharm.js';
export { kcosmeticsConfig } from './services/kcosmetics.js';

import { kpaConfig } from './services/kpa.js';
import { glycopharmConfig } from './services/glycopharm.js';
import { kcosmeticsConfig } from './services/kcosmetics.js';

export const serviceConfigMap = {
  'kpa-society': kpaConfig,
  glycopharm: glycopharmConfig,
  'k-cosmetics': kcosmeticsConfig,
} as const;
