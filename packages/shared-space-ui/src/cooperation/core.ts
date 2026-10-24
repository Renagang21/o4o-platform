/** Presentation contracts only. Neither an extension nor a registry grants access. */
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

export interface CooperationMaterialGuide {
  label: string;
  title: string;
  description: string;
  memberDescription: string;
  tags: readonly string[];
  outlines: readonly Readonly<{ name: string; tag: string; html: string }>[];
}

/** Organization memberships and cooperative personal memberships use different adapters. */
export interface CooperationExtension {
  model: Readonly<CooperationModel>;
  siteName: string;
  membershipSubject: 'pharmacy-organization' | 'cooperative-person';
  materials?: Readonly<CooperationMaterialGuide>;
}

export function createCooperationRegistry(extensions: readonly CooperationExtension[]) {
  const registry: Record<string, Readonly<CooperationExtension>> = Object.create(null);
  for (const extension of extensions) {
    const { model } = extension;
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(model.key) || Object.prototype.hasOwnProperty.call(registry, model.key)) {
      throw new Error('Invalid or duplicate cooperation extension');
    }
    const origin = new URL(model.origin);
    if (origin.protocol !== 'https:' || origin.origin !== model.origin) {
      throw new Error('Cooperation origin must be an HTTPS origin');
    }
    for (const path of [model.participationPath, model.communityPath, model.storePath]) {
      const resolved = new URL(path, model.origin);
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || resolved.origin !== model.origin) {
        throw new Error('Cooperation paths must stay within their origin');
      }
    }
    const materials = extension.materials && Object.freeze({
      ...extension.materials,
      tags: Object.freeze([...extension.materials.tags]),
      outlines: Object.freeze(extension.materials.outlines.map(outline => Object.freeze({ ...outline }))),
    });
    registry[model.key] = Object.freeze({ ...extension, model: Object.freeze({ ...model }), materials });
  }
  return Object.freeze(registry);
}

export function findCooperationExtension(
  registry: Readonly<Record<string, Readonly<CooperationExtension>>>, key: string,
) {
  return Object.prototype.hasOwnProperty.call(registry, key) ? registry[key] : undefined;
}
