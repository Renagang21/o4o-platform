import type { CooperationExtension } from '../core';

export const drugstoreExtension: CooperationExtension = {
  model: { key: 'drugstore', name: '드럭스토어형 약국', origin: 'https://drugstore.neture.co.kr', sessionServiceKey: 'neture', participationPath: '/my/participation', communityPath: '/community', storePath: '/store' },
  siteName: '드럭스토어형 약국',
  membershipSubject: 'pharmacy-organization',
};
