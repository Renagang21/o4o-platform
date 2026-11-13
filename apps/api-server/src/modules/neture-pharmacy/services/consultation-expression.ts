import type { DataSource } from 'typeorm';
import { resolveStoreAccessLevel } from '../../../services/store/store-membership.service.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
import { NeturePharmacyError } from '../constants.js';

import { consultationExpressionSchema } from './consultation-expression.contracts.js';
export const consultationExpressionUpdateSql = `UPDATE organizations o SET metadata=jsonb_set(COALESCE(o.metadata,'{}'::jsonb),'{consultationExpression}',$3::jsonb)
      WHERE o.id=$1 AND EXISTS(SELECT 1 FROM organization_members om JOIN users u ON u.id=om.user_id
        WHERE om.organization_id=o.id AND om.user_id=$2 AND om.role='owner' AND om.left_at IS NULL
        AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved'))
      AND EXISTS(SELECT 1 FROM neture_pharmacy_memberships m WHERE m.organization_id=o.id AND m.status='active') RETURNING o.id`;
export class ConsultationExpressionService {
  constructor(private readonly db: DataSource) {}
  async values(org: string) {
    const [row] = await this.db.query(`SELECT o.metadata->'consultationExpression' AS expression
      FROM organizations o WHERE o.id=$1 AND EXISTS(SELECT 1 FROM neture_pharmacy_memberships m WHERE m.organization_id=o.id AND m.status='active')`, [org]);
    if (!row) throw new NeturePharmacyError(404,'PHARMACY_NOT_FOUND','현재 약국을 확인해 주세요.');
    const value = consultationExpressionSchema.safeParse(row.expression ?? {});
    if (!value.success) throw new NeturePharmacyError(503,'CONSULTATION_EXPRESSION_UNAVAILABLE','매장 표현 설정을 다시 확인해 주세요.');
    return value.data;
  }
  async read(actor: string, org: string) {
    const access = await resolveStoreAccessLevel(this.db,actor,'kpa',org);
    if (access.level==='none' || access.organizationId!==org) throw new NeturePharmacyError(403,'STORE_ACCESS_REQUIRED','현재 매장 권한을 확인해 주세요.');
    return { organizationId: org, expression: await this.values(org), canEdit: access.level==='owner' && access.memberRole==='owner' && await getNetureMainMembershipStatus(this.db,actor)==='active' };
  }
  async save(actor: string, org: string, raw: unknown) {
    const parsed = consultationExpressionSchema.safeParse(raw);
    if (!parsed.success) throw new NeturePharmacyError(400,'INVALID_CONSULTATION_EXPRESSION','말투·경어·길이를 선택해 주세요.');
    const access = await resolveStoreAccessLevel(this.db,actor,'kpa',org);
    if (access.level!=='owner' || access.memberRole!=='owner' || access.organizationId!==org || await getNetureMainMembershipStatus(this.db,actor)!=='active')
      throw new NeturePharmacyError(403,'STORE_OWNER_REQUIRED','매장 경영자가 표현 설정을 변경할 수 있습니다.');
    // Recheck the current owner/account and store approval inside the write itself.
    const rows = await this.db.query(consultationExpressionUpdateSql,[org,actor,JSON.stringify(parsed.data)]);
    if (!rows.length) throw new NeturePharmacyError(403,'STORE_OWNER_REQUIRED','현재 매장 경영자 권한을 다시 확인해 주세요.');
    return this.read(actor,org);
  }
}
