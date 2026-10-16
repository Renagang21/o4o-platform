import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import { PHARMACY_SERVICE_FEATURES, PharmacyServiceFeatureService, type ServiceFeatureGrant } from './service-features.js';

type Executor = Pick<DataSource, 'query'>;
export class MemberPaidFeatureService {
  constructor(private readonly db: Executor) {}

  async resolve(ownerUserId: string): Promise<ServiceFeatureGrant | null> {
    const rows = await this.db.query(`SELECT p.user_id FROM member_paid_service_entitlements p
      JOIN users u ON u.id=p.user_id
      WHERE p.user_id=$1 AND p.active=true AND (p.ends_at IS NULL OR p.ends_at>NOW())
        AND u.status='active' AND u."isActive"=true`, [ownerUserId]);
    return rows.length ? { type: 'member', key: 'paid-member', name: '경영자 유료회원',
      features: PHARMACY_SERVICE_FEATURES.filter(f => f.key === 'tablet' || f.key === 'multilingual-content').map(f => f.key) } : null;
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
  return new PharmacyServiceFeatureService(db, id => members.resolve(id));
}
