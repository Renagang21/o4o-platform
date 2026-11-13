import { z } from 'zod';
import type { DataSource } from 'typeorm';
import { resolveStoreAccessLevel } from '../../../services/store/store-membership.service.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
import { NeturePharmacyError } from '../constants.js';

/**
 * 매장 상담 태블릿 목록. 한 태블릿 = 한 화면에서 문의와 답변을 끝낸다(2대 연결 없음).
 * 역할은 화면 종류(약사용 · 근무자용 · 소비자용 키오스크)만 정하며 로그인 사용자의 권한 · 약사 자격을 바꾸지 않는다.
 * 저장 위치는 기존 organizations.metadata(consultationExpression 과 같은 방식) — schema 변경 없음.
 */
export const CONSULTATION_TABLET_ROLES = ['pharmacist', 'staff', 'consumer'] as const;
export const MAX_CONSULTATION_TABLETS = 30;
export const consultationTabletSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  role: z.enum(CONSULTATION_TABLET_ROLES),
  name: z.string().trim().min(1).max(40).refine(value => !/[<>]/.test(value)),
}).strict();
export const consultationTabletsSchema = z.array(consultationTabletSchema).max(MAX_CONSULTATION_TABLETS)
  .refine(items => new Set(items.map(item => item.id)).size === items.length);
export type ConsultationTablet = z.infer<typeof consultationTabletSchema>;

export const consultationTabletsUpdateSql = `UPDATE organizations o SET metadata=jsonb_set(COALESCE(o.metadata,'{}'::jsonb),'{consultationTablets}',$3::jsonb)
      WHERE o.id=$1 AND EXISTS(SELECT 1 FROM organization_members om JOIN users u ON u.id=om.user_id
        WHERE om.organization_id=o.id AND om.user_id=$2 AND om.role='owner' AND om.left_at IS NULL
        AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved'))
      AND EXISTS(SELECT 1 FROM neture_pharmacy_memberships m WHERE m.organization_id=o.id AND m.status='active') RETURNING o.id`;

export class ConsultationTabletService {
  constructor(private readonly db: DataSource) {}
  private async values(org: string) {
    const [row] = await this.db.query(`SELECT o.metadata->'consultationTablets' AS tablets
      FROM organizations o WHERE o.id=$1 AND EXISTS(SELECT 1 FROM neture_pharmacy_memberships m WHERE m.organization_id=o.id AND m.status='active')`, [org]);
    if (!row) throw new NeturePharmacyError(404, 'PHARMACY_NOT_FOUND', '현재 약국을 확인해 주세요.');
    const value = consultationTabletsSchema.safeParse(row.tablets ?? []);
    if (!value.success) throw new NeturePharmacyError(503, 'CONSULTATION_TABLETS_UNAVAILABLE', '상담 태블릿 목록을 다시 확인해 주세요.');
    return value.data;
  }
  async read(actor: string, org: string) {
    const access = await resolveStoreAccessLevel(this.db, actor, 'kpa', org);
    if (access.level === 'none' || access.organizationId !== org)
      throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '현재 매장 권한을 확인해 주세요.');
    return {
      organizationId: org,
      tablets: await this.values(org),
      canEdit: access.level === 'owner' && access.memberRole === 'owner' && await getNetureMainMembershipStatus(this.db, actor) === 'active',
    };
  }
  async save(actor: string, org: string, raw: unknown) {
    const parsed = consultationTabletsSchema.safeParse((raw as { tablets?: unknown } | null)?.tablets);
    if (!parsed.success)
      throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_TABLETS', `태블릿 이름(40자 이내)과 종류를 확인해 주세요. 최대 ${MAX_CONSULTATION_TABLETS}대까지 등록할 수 있습니다.`);
    const access = await resolveStoreAccessLevel(this.db, actor, 'kpa', org);
    if (access.level !== 'owner' || access.memberRole !== 'owner' || access.organizationId !== org || await getNetureMainMembershipStatus(this.db, actor) !== 'active')
      throw new NeturePharmacyError(403, 'STORE_OWNER_REQUIRED', '매장 경영자가 상담 태블릿을 관리할 수 있습니다.');
    // Recheck the current owner/account and store approval inside the write itself.
    const rows = await this.db.query(consultationTabletsUpdateSql, [org, actor, JSON.stringify(parsed.data)]);
    if (!rows.length) throw new NeturePharmacyError(403, 'STORE_OWNER_REQUIRED', '현재 매장 경영자 권한을 다시 확인해 주세요.');
    return this.read(actor, org);
  }
}
