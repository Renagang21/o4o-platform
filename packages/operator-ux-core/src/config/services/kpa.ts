import type { ServiceConfig } from '../serviceConfig.js';

export const kpaConfig: ServiceConfig = {
  key: 'kpa-society',

  terminology: {
    storeLabel: '약국',
    myStoreLabel: '내 약국',
    storeHubLabel: '약국 운영 허브',
  },

  uiText: {
    homePrimaryCTA: '내 약국 운영하기',
    storeHubFlow: '약국 운영 허브 → 내 약국 순서로 작업합니다',
    storeHomeTitle: '내 약국 홈',
    storeHomeSubtitle: '약국 운영 현황을 한눈에 파악합니다',
    appEntry: {
      storeHubTitle: '약국 운영 허브',
    },
  },
};
