import type { CooperationExtension } from '../core';

export const pharmacyExtension: CooperationExtension = {
  model: { key: 'pharmacy', name: 'O4O 약국 경영지원', origin: 'https://pharmacy.neture.co.kr', sessionServiceKey: 'neture', handoffTargetKey: 'kpa-society', participationPath: '/my/participation', communityPath: '/community', storePath: '/store' },
  siteName: 'O4O 약국',
  membershipSubject: 'pharmacy-organization',
};
