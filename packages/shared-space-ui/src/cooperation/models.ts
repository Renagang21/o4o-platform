/** Business identity and navigation only. Membership and authorization remain server-owned. */
export interface CooperationModel {
  key: string;
  name: string;
  origin: string;
  sessionServiceKey: string;
  handoffTargetKey?: string;
  participationPath: string;
  communityPath: string;
  storePath: string;
}
export const COOPERATION_MODELS: Readonly<Record<string, CooperationModel>> = Object.freeze({
  pharmacy: { key: 'pharmacy', name: 'O4O 약국 경영지원', origin: 'https://pharmacy.neture.co.kr', sessionServiceKey: 'neture', handoffTargetKey: 'kpa-society', participationPath: '/my/participation', communityPath: '/community', storePath: '/store' },
  carepharm: { key: 'carepharm', name: '만성질환관리', origin: 'https://carepharm.neture.co.kr', sessionServiceKey: 'neture', handoffTargetKey: 'carepharm', participationPath: '/my/participation', communityPath: '/communities/business%3Acarepharm/forum', storePath: '/store/pharmacy/carepharm' },
});
export function cooperationDestination(key: string, section: 'participation' | 'community' | 'home') {
  const model = Object.prototype.hasOwnProperty.call(COOPERATION_MODELS, key) ? COOPERATION_MODELS[key] : undefined;
  if (model) return { serviceKey: model.handoffTargetKey ?? model.sessionServiceKey, origin: model.origin, returnPath: section === 'home' ? '/' : section === 'participation' ? model.participationPath : model.communityPath };
  return { serviceKey: 'kpa-society', origin: COOPERATION_MODELS.pharmacy.origin, returnPath: `/businesses/${encodeURIComponent(key)}${section === 'home' ? '' : section === 'community' ? '/forum' : '/participation'}` };
}
