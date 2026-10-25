import type { CooperationModel } from './core';
import { COOPERATION_EXTENSIONS, getCooperationExtension } from './extensions';
export type { CooperationModel } from './core';

// Compatibility transport models. Direct-login business hosts do not acquire an
// unsupported handoff alias merely by registering a presentation extension.
export const COOPERATION_MODELS: Readonly<Record<string, CooperationModel>> = Object.freeze({
  pharmacy: COOPERATION_EXTENSIONS.pharmacy.model,
  carepharm: COOPERATION_EXTENSIONS.carepharm.model,
});
export interface CooperationDestination {
  serviceKey: string;
  origin: string;
  returnPath: string;
  navigation?: 'public';
  preserveForumPath?: false;
}
export function cooperationDestination(key: string, section: 'participation' | 'community' | 'home'): CooperationDestination {
  const extension = getCooperationExtension(key);
  if (extension && !extension.model.handoffTargetKey) {
    const { model } = extension;
    return {
      serviceKey: model.sessionServiceKey, origin: model.origin,
      returnPath: section === 'home' ? '/' : section === 'participation' ? model.participationPath : model.communityPath,
      navigation: 'public',
      ...(extension.membershipSubject === 'cooperative-person' ? { preserveForumPath: false as const } : {}),
    };
  }
  const model = Object.prototype.hasOwnProperty.call(COOPERATION_MODELS, key) ? COOPERATION_MODELS[key] : undefined;
  if (model) return { serviceKey: model.handoffTargetKey ?? model.sessionServiceKey, origin: model.origin, returnPath: section === 'home' ? '/' : section === 'participation' ? model.participationPath : model.communityPath };
  return { serviceKey: 'kpa-society', origin: COOPERATION_MODELS.pharmacy.origin, returnPath: `/businesses/${encodeURIComponent(key)}${section === 'home' ? '' : section === 'community' ? '/forum' : '/participation'}` };
}
