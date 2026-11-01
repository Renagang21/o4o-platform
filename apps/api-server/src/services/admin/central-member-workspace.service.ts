import type { DataSource, EntityManager } from 'typeorm';
import { centralOperationRoles } from './central-operation-access.js';
import { centralOperationMenuKeys } from './central-operation-menu-grants.js';
import { OperationError, operationReason, recordOperation } from '../operations/operation-audit.js';
import { isPhoneShapeValid, normalizePhoneDigits } from '../../common/auth/phone-shape.js';

type Db = Pick<EntityManager, 'query'>;
export type MemberTask = 'all' | 'qualifications' | 'pharmacies' | 'corrections';
const version = `to_char(u."updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US')`;
const identity = `u.id AS "userId",u.name,u.nickname,u.email,u.phone,u.status AS "accountStatus",
 u."isEmailVerified" AS "emailVerified",u."createdAt" AS "joinedAt",${version} AS version`;
const pharmacyExists = (status: string) => `EXISTS(SELECT 1 FROM neture_pharmacy_memberships n WHERE n.applicant_user_id=u.id AND n.status='${status}')`;
const privateValue = (value: unknown) => ({ toPostgres: () => value, toJSON: () => '[redacted]' });

/** Member-directory authority does not confer qualification, document, or business authority. */
export async function memberWorkspaceAccess(db: Db, actor: string, lock = false) {
  const roles = await centralOperationRoles(db, actor, lock);
  const keys = await centralOperationMenuKeys(db, actor, roles);
  if (!keys.includes('neture.members')) throw new OperationError(403, 'MEMBER_DIRECTORY_REQUIRED', '공통 회원 조회 업무 위임이 필요합니다.');
  return {
    qualifications: keys.includes('neture.qualifications'),
    pharmacies: keys.includes('neture.pharmacies'),
    applications: keys.includes('neture.applications'),
    edit: roles.some(role => ['platform:super_admin', 'neture:admin'].includes(role)),
  };
}

export class CentralMemberWorkspaceService {
  constructor(private readonly db: DataSource) {}

  async list(actor: string, task: MemberTask, page: number, search: string) {
    const permissions = await memberWorkspaceAccess(this.db, actor);
    if ((task === 'qualifications' && !permissions.qualifications) || (task === 'pharmacies' && !permissions.pharmacies) ||
        (task === 'corrections' && !permissions.qualifications && !permissions.pharmacies))
      throw new OperationError(403, 'MEMBER_TASK_NOT_DELEGATED', '해당 심사 업무 권한이 필요합니다.');
    const qualificationCorrections = permissions.qualifications ? "p.qualification_status IN ('rejected','revoked')" : 'false';
    const pharmacyCorrections = permissions.pharmacies ? pharmacyExists('rejected') : 'false';
    const conditions: Record<MemberTask, string> = {
      all: 'true', qualifications: `p.qualification_status='pending'`, pharmacies: pharmacyExists('pending'),
      corrections: `(${qualificationCorrections} OR ${pharmacyCorrections})`,
    };
    const query = search.trim().slice(0, 100);
    const match = `($1='' OR u.id::text=$1 OR strpos(lower(COALESCE(u.name,'')),lower($1))>0 OR strpos(lower(COALESCE(u.email,'')),lower($1))>0)`;
    const from = `FROM users u LEFT JOIN kpa_pharmacist_profiles p ON p.user_id=u.id WHERE ${match}`;
    const [counts] = await this.db.query(`SELECT COUNT(*)::int AS all,
      COUNT(*) FILTER(WHERE ${permissions.qualifications ? conditions.qualifications : 'false'})::int AS qualifications,
      COUNT(*) FILTER(WHERE ${permissions.pharmacies ? conditions.pharmacies : 'false'})::int AS pharmacies,
      COUNT(*) FILTER(WHERE ${conditions.corrections})::int AS corrections ${from}`, [query]);
    const items = await this.db.query(`SELECT u.id AS "userId",u.name,u.email,u.status AS "accountStatus",
      COALESCE(p.qualification_status,'unrequested') AS "qualificationStatus",
      ${permissions.pharmacies ? `(SELECT n.status FROM neture_pharmacy_memberships n WHERE n.applicant_user_id=u.id ORDER BY n.applied_at DESC,n.id LIMIT 1)` : 'NULL::text'} AS "pharmacyStatus"
      ${from} AND (${conditions[task]}) ORDER BY u."createdAt" DESC,u.id LIMIT 21 OFFSET $2`,
    [query, (page - 1) * 20]);
    return { items: items.slice(0, 20), hasNext: items.length > 20, counts, permissions };
  }

  async detail(actor: string, target: string) {
    const permissions = await memberWorkspaceAccess(this.db, actor);
    const [member] = await this.db.query(`SELECT ${identity} FROM users u WHERE u.id=$1`, [target]);
    if (!member) throw new OperationError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.');
    let qualification = null;
    let legacyLicense = null;
    let legacyBusiness = null;
    if (permissions.qualifications) {
      [qualification] = await this.db.query(`SELECT license_number AS "licenseNumber",qualification_status AS status,
        qualification_reason AS reason,verified_at AS "approvedAt",verified_by AS "reviewedBy",
        to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') AS version FROM kpa_pharmacist_profiles WHERE user_id=$1`, [target]);
      const [legacy] = await this.db.query(`SELECT NULLIF(BTRIM("businessInfo"->>'licenseNumber'),'') AS license FROM users WHERE id=$1`, [target]);
      legacyLicense = legacy?.license ?? null;
    }
    if (permissions.applications) {
      const [legacy] = await this.db.query(`SELECT jsonb_strip_nulls(jsonb_build_object(
        'name',"businessInfo"->>'businessName','businessNumber',"businessInfo"->>'businessNumber',
        'representativeName',COALESCE("businessInfo"->>'representativeName',"businessInfo"->>'ceoName'),
        'businessType',"businessInfo"->>'businessType','businessCategory',"businessInfo"->>'businessItem',
        'businessEntityType',"businessInfo"->>'businessEntityType','businessStartDate',"businessInfo"->>'businessStartDate',
        'address',"businessInfo"->>'address','addressDetail',"businessInfo"->>'address2',
        'contactName',"businessInfo"->>'contactName','managerPhone',"businessInfo"->>'managerPhone',
        'taxInvoiceEmail',"businessInfo"->>'taxInvoiceEmail')) AS business FROM users WHERE id=$1
        AND EXISTS(SELECT 1 FROM service_memberships WHERE user_id=$1 AND service_key='neture')`, [target]);
      legacyBusiness = legacy?.business && Object.keys(legacy.business).length ? legacy.business : null;
    }
    const pharmacies = permissions.pharmacies ? await this.db.query(`SELECT n.id,n.organization_id AS "organizationId",n.pharmacy_name AS name,
      n.business_number AS "businessNumber",n.pharmacist_license_number AS "licenseNumber",n.status,n.reason,
      n.applied_at AS "appliedAt",n.decided_at AS "decidedAt",n.decided_by AS "decidedBy",o.address,o.phone,
      o.metadata->'businessProfile'->>'representativeName' AS "representativeName",
      o.metadata->'businessProfile'->>'businessType' AS "businessType",o.metadata->'businessProfile'->>'businessCategory' AS "businessCategory",
      o.metadata->'businessProfile'->>'businessRegistrationDocumentId' AS "documentId",
      o.metadata->>'contactName' AS "contactName",o.metadata->>'managerPhone' AS "managerPhone",
      o.metadata->>'contactEmail' AS "contactEmail",o.metadata->>'taxInvoiceEmail' AS "taxInvoiceEmail"
      FROM neture_pharmacy_memberships n JOIN organizations o ON o.id=n.organization_id
      WHERE n.applicant_user_id=$1 ORDER BY n.applied_at DESC,n.id`, [target]) : [];
    const actions = ['member.profile_corrected', ...(permissions.qualifications ? ['qualification.pharmacist_requested', 'qualification.pharmacist_approved', 'qualification.pharmacist_rejected', 'qualification.pharmacist_revoked'] : [])];
    const history = await this.db.query(`SELECT action_key AS action,created_at AS "createdAt",user_id AS "actorId",meta->>'reason' AS reason
      FROM action_logs WHERE service_key='neture' AND meta->>'targetUserId'=$1 AND action_key=ANY($2::text[])
      ORDER BY created_at DESC,id DESC LIMIT 30`, [target, actions]);
    return { member, qualification: qualification ?? null, legacyLicense, legacyBusiness, pharmacies, history, permissions };
  }

  async correct(actor: string, target: string, input: { name: string; nickname: string; phone: string; reason: string; version: string }) {
    const reason = operationReason(input.reason);
    const phone = normalizePhoneDigits(input.phone);
    if (input.phone.trim() && !isPhoneShapeValid(input.phone)) throw new OperationError(400, 'INVALID_PHONE', '올바른 국내 휴대전화 번호를 입력해 주세요.');
    return await this.db.transaction(async manager => {
      if (!(await memberWorkspaceAccess(manager, actor, true)).edit) throw new OperationError(403, 'MEMBER_ADMIN_REQUIRED', '회원 정보 정정은 중앙 Admin 업무입니다.');
      const [before] = await manager.query(`SELECT ${identity} FROM users u WHERE u.id=$1 FOR UPDATE`, [target]);
      if (!before) throw new OperationError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.');
      if (before.version !== input.version) throw new OperationError(409, 'MEMBER_CHANGED', '회원 정보가 변경되었습니다. 다시 조회한 뒤 정정해 주세요.');
      await manager.query(`UPDATE users SET name=$2,nickname=$3,phone=$4,"updatedAt"=now() WHERE id=$1`,
        [target, privateValue(input.name), privateValue(input.nickname || null), privateValue(phone || null)]);
      await recordOperation(manager, 'neture', actor, 'member.profile_corrected', { targetUserId: target, reason,
        previous: { name: before.name, nickname: before.nickname, phone: before.phone }, next: { name: input.name, nickname: input.nickname, phone } });
      return { saved: true };
    });
  }
}
