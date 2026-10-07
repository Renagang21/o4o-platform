// WO-O4O-SERVICE-CONFIG-INTRODUCTION-V1
export type { ServiceKey, ServiceConfig, ServiceTemplateKey } from './serviceConfig.js';
export { kpaConfig } from './services/kpa.js';

import { kpaConfig } from './services/kpa.js';

// K-Cosmetics(kcosmeticsConfig)는 서비스 종료로 제거 — WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1
export const serviceConfigMap = {
  'kpa-society': kpaConfig,
} as const;
