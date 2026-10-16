import { NeturePharmacyError } from '../constants.js';

/** Existing capabilities only. Adding a business never adds a capability or a role. */
export const PHARMACY_SERVICE_FEATURES = [
  { key: 'tablet', label: '태블릿' },
  { key: 'multilingual-content', label: '다국어 상품 콘텐츠' },
] as const;
export type PharmacyServiceFeature = typeof PHARMACY_SERVICE_FEATURES[number]['key'];

export function validateServiceFeatures(value: unknown): PharmacyServiceFeature[] {
  if (!Array.isArray(value) || value.some(key => !PHARMACY_SERVICE_FEATURES.some(feature => feature.key === key))) {
    throw new NeturePharmacyError(400, 'INVALID_SERVICE_FEATURES', '제공 기능 목록을 다시 확인해 주세요.');
  }
  return PHARMACY_SERVICE_FEATURES.map(feature => feature.key).filter(key => value.includes(key));
}

/** Missing legacy configuration grants nothing; malformed persisted configuration is an error. */
export function readServiceFeatures(value: unknown): PharmacyServiceFeature[] {
  if (value == null) return [];
  try { return validateServiceFeatures(value); }
  catch { throw new NeturePharmacyError(503, 'FEATURE_ACCESS_UNAVAILABLE', '서비스 이용 자격을 확인하지 못했습니다. 다시 시도해 주세요.'); }
}

export interface ServiceFeatureGrant {
  type: 'semi-franchise' | 'member';
  key: string;
  name: string;
  features: PharmacyServiceFeature[];
}

/** Union of valid grants. A grant never authorizes store access or a professional action. */
export function resolveServiceFeatureGrants(grants: readonly ServiceFeatureGrant[]) {
  return PHARMACY_SERVICE_FEATURES.map(feature => ({
    ...feature,
    allowed: grants.some(grant => grant.features.includes(feature.key)),
    sources: grants.filter(grant => grant.features.includes(feature.key))
      .map(({ type, key, name }) => ({ type, key, name })),
  }));
}

type Executor = { query: (sql: string, params?: unknown[]) => Promise<unknown[]> };
/** Server adapter only; never accept paid status/features from HTTP input or a store subscription. */
export type MemberFeatureResolver = (userId: string) => Promise<ServiceFeatureGrant | null>;

export class PharmacyServiceFeatureService {
  constructor(private readonly db: Executor, private readonly memberFeatures?: MemberFeatureResolver) {}

  /** Call only AFTER the existing store workspace guard resolves the authorized organization. */
  async resolve(userId: string, organizationId: string) {
    try {
      const rows = await this.db.query(
        `SELECT sf.key, sf.name, owner.metadata->'serviceFeatures' AS features
           FROM semi_franchises sf
           JOIN organizations owner ON owner.id = sf.organization_id
           JOIN semi_franchise_memberships membership ON membership.semi_franchise_id = sf.id
           JOIN neture_pharmacy_memberships pharmacy ON pharmacy.organization_id = membership.organization_id
          WHERE membership.organization_id = $1 AND membership.status = 'active'
            AND sf.status = 'active' AND pharmacy.status = 'active'
          ORDER BY sf.key`, [organizationId],
      ) as Array<{ key: string; name: string; features: unknown }>;
      const grants: ServiceFeatureGrant[] = rows.map(row => ({
        type: 'semi-franchise', key: row.key, name: row.name, features: readServiceFeatures(row.features),
      }));
      if (this.memberFeatures) {
        const member = await this.memberFeatures(userId);
        if (member) grants.push({ ...member, type: 'member', features: readServiceFeatures(member.features) });
      }
      return {
        organizationId,
        memberEntitlement: this.memberFeatures ? 'connected' as const : 'not-connected' as const,
        features: resolveServiceFeatureGrants(grants).map(feature => ({
          ...feature,
          // A missing personal paid adapter is unknown, never a negative membership decision.
          allowed: feature.allowed ? true : this.memberFeatures ? false : null,
        })),
      };
    } catch {
      throw new NeturePharmacyError(503, 'FEATURE_ACCESS_UNAVAILABLE', '서비스 이용 자격을 확인하지 못했습니다. 다시 시도해 주세요.');
    }
  }

  /** Feature consumers retain their existing store, staff and material guards. */
  async require(userId: string, organizationId: string, feature: PharmacyServiceFeature) {
    const result = await this.resolve(userId, organizationId);
    if (!result.features.some(item => item.key === feature && item.allowed)) {
      if (result.memberEntitlement === 'not-connected') {
        throw new NeturePharmacyError(503, 'MEMBER_ENTITLEMENT_NOT_CONNECTED', '회원 이용 자격 연결을 확인해 주세요.');
      }
      throw new NeturePharmacyError(403, 'SERVICE_FEATURE_REQUIRED', '이 서비스를 이용할 수 있는 자격이 필요합니다.');
    }
    return result;
  }
}
