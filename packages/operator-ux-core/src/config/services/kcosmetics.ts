import type { ServiceConfig } from '../serviceConfig.js';

export const kcosmeticsConfig: ServiceConfig = {
  key: 'k-cosmetics',
  // WO-O4O-REFERENCE-DESIGN-IMPORT-V1: referenceA preset 실험 적용
  // 원래 값: 'kcosmetics'
  template: 'referenceA',

  terminology: {
    storeLabel: '매장',
    myStoreLabel: '내 매장',
    storeHubLabel: '매장 운영 허브',
  },

  uiText: {
    homePrimaryCTA: '내 매장 운영하기',
    storeHubFlow: '매장 운영 허브 → 내 매장 순서로 작업합니다',
    storeHomeTitle: '내 매장 홈',
    storeHomeSubtitle: '매장 운영 현황을 한눈에 파악합니다',
    appEntry: {
      storeHubTitle: '매장 HUB',
    },
  },
};
