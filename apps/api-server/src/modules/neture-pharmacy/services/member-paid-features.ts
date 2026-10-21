import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import { PharmacyServiceFeatureService, type ServiceFeatureGrant } from './service-features.js';
import { PharmacyServicePolicyService } from './service-feature-policy.js';
import { resolveStaffFeatures } from './staff-feature-permissions.js';

type Executor = Pick<DataSource, 'query'>;
export class MemberPaidFeatureService {
  constructor(private readonly db: Executor) {}

  async resolve(ownerUserId: string): Promise<ServiceFeatureGrant | null> {
    const rows = await this.db.query(`SELECT p.user_id FROM member_paid_service_entitlements p
      JOIN users u ON u.id=p.user_id
      WHERE p.user_id=$1 AND p.active=true AND (p.ends_at IS NULL OR p.ends_at>NOW())
        AND u.status='active' AND u."isActive"=true`, [ownerUserId]);
    return rows.length ? { type: 'member', key: 'paid-member', name: '경영자 유료회원',
      features: await new PharmacyServicePolicyService(this.db).read('paid') } : null;
  }

  async find(email: unknown) {
    if (typeof email !== 'string' || email.length > 255 || !email.includes('@')) {
      throw new NeturePharmacyError(400, 'INVALID_EMAIL', '회원 이메일을 확인해 주세요.');
    }
    const rows = await this.db.query(`SELECT u.id, u.email, u.name, u.status,
      COALESCE(p.active,false) AS active, p.ends_at AS "endsAt", p.updated_at AS "updatedAt"
      FROM users u LEFT JOIN member_paid_service_entitlements p ON p.user_id=u.id
      WHERE lower(u.email)=lower($1)`, [email.trim()]);
    if (rows.length !== 1) throw new NeturePharmacyError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.');
    return rows[0];
  }

  /** Administrator read projection. Store eligibility reuses the runtime feature resolver. */
  async describe(userId: string) {
    try {
      const [user] = await this.db.query(`SELECT id, status, "isActive" FROM users WHERE id=$1`, [userId]);
      if (!user) throw new NeturePharmacyError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.');
      const paid = await this.resolve(userId);
      const stores = await this.db.query(`SELECT o.id, o.name, p.status AS "pharmacyStatus"
        FROM organization_members om JOIN organizations o ON o.id=om.organization_id
        LEFT JOIN neture_pharmacy_memberships p ON p.organization_id=o.id
        WHERE om.user_id=$1 AND om.role='owner' AND om.left_at IS NULL ORDER BY o.id`, [userId]);
      const memberships = stores.length ? await this.db.query(`SELECT membership.organization_id AS "organizationId",
          sf.key, sf.name, sf.status AS "businessStatus", membership.status
        FROM semi_franchise_memberships membership JOIN semi_franchises sf ON sf.id=membership.semi_franchise_id
        WHERE membership.organization_id=ANY($1::uuid[]) ORDER BY sf.name, sf.key`, [stores.map((store: { id: string }) => store.id)]) : [];
      const resolver = createPharmacyFeatureService(this.db);
      const pharmacies = [];
      for (const store of stores) {
        const provision = store.pharmacyStatus === 'active' ? await resolver.resolve(userId, store.id) : null;
        pharmacies.push({ ...store,
          memberships: memberships.filter((item: { organizationId: string }) => item.organizationId === store.id),
          features: provision?.features ?? null,
        });
      }
      return { paidEligible: paid !== null, accountStatus: user.status, accountActive: user.isActive, pharmacies };
    } catch (error) {
      if (error instanceof NeturePharmacyError) throw error;
      throw new NeturePharmacyError(503, 'FEATURE_ACCESS_UNAVAILABLE', '회원 이용 자격을 확인하지 못했습니다. 다시 시도해 주세요.');
    }
  }

  async set(userId: string, actorId: string, input: { active?: unknown; endsAt?: unknown }) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || typeof input.active !== 'boolean' ||
      (input.endsAt != null && (typeof input.endsAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(input.endsAt) || !Number.isFinite(Date.parse(input.endsAt))))) {
      throw new NeturePharmacyError(400, 'INVALID_MEMBER_ENTITLEMENT', '회원 유료 자격과 만료일을 확인해 주세요.');
    }
    const rows = await this.db.query(`INSERT INTO member_paid_service_entitlements (user_id,active,ends_at,updated_by)
      SELECT id,$2,$3,$4 FROM users WHERE id=$1
      ON CONFLICT (user_id) DO UPDATE SET active=EXCLUDED.active,ends_at=EXCLUDED.ends_at,
        updated_by=EXCLUDED.updated_by,updated_at=NOW()
      RETURNING user_id AS "userId",active,ends_at AS "endsAt"`, [userId, input.active, input.endsAt ?? null, actorId]);
    if (!rows.length) throw new NeturePharmacyError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.');
    return rows[0];
  }
}

export function createPharmacyFeatureService(db: Executor) {
  const members = new MemberPaidFeatureService(db);
  const policy = new PharmacyServicePolicyService(db);
  return new PharmacyServiceFeatureService(db, id => members.resolve(id), {
    defaultFeatures: () => policy.read('default'), staffFeatures: (userId, organizationId) => resolveStaffFeatures(db, userId, organizationId),
  });
}
