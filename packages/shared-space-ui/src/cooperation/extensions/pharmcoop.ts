import type { CooperationExtension } from '../core';

export const pharmcoopExtension: CooperationExtension = {
  model: { key: 'pharmcoop', name: '약국·약사 협동조합', origin: 'https://pharmcoop.neture.co.kr', sessionServiceKey: 'neture', participationPath: '/cooperatives/mine', communityPath: '/cooperatives', storePath: '/store' },
  siteName: '약국·약사 협동조합',
  membershipSubject: 'cooperative-person',
};
