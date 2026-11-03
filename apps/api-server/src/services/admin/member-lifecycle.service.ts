import { StoreOwnerTerminationService } from '../store-owner-termination.service.js';
import { createHash, randomUUID } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { memberWorkspaceAccess } from './central-member-workspace.service.js';
import { MembershipApprovalService } from '../approval/MembershipApprovalService.js';
import { OperationError, operationReason, recordOperation } from '../operations/operation-audit.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { invalidateRoles } from '../../modules/auth/utils/role-cache.js';
import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';

const key = (value: string) => createHash('sha256').update(value).digest('hex');
async function lockMembers(m: EntityManager, ids: string[]) {
  await m.query("SELECT pg_advisory_xact_lock_shared(hashtextextended('o4o-account-erasure-writes',0))");
  for (const id of [...new Set(ids)].sort()) {
    await m.query("SELECT pg_advisory_xact_lock(hashtextextended('store-member:' || $1,0))", [id]);
  }
}
async function protectAccount(m: EntityManager, target: string) {
  const protectedRows = await m.query(`SELECT 1 FROM demo_accounts WHERE user_id=$1 AND is_active=true
    UNION ALL SELECT 1 FROM role_assignments WHERE user_id=$1 AND is_active=true
      AND (role='platform:super_admin' OR role ~ '(^|:|_)(admin|operator)$') LIMIT 1`, [target]);
  if (protectedRows.length) throw new OperationError(409, 'PRIVILEGED_ACCOUNT', '운영 권한이 있거나 보호된 계정은 회원 이용 해지로 변경할 수 없습니다.');
}

/** Personal account, employee access and pharmacy ownership are separate operations. */
export class MemberLifecycleService {
  constructor(private readonly db: DataSource) {}

  async stopAccess(actor: string, target: string, input: { reason: string; version: string }) {
    const reason = operationReason(input.reason);
    try {
      return await this.db.transaction(async m => {
        await lockMembers(m, [actor, target]);
        await memberWorkspaceAccess(m, actor, true);
        if (actor === target) throw new OperationError(409, 'SELF_STOP_FORBIDDEN', '본인 이용은 이 화면에서 정지할 수 없습니다.');
        await protectAccount(m, target);
        const [user] = await m.query(`SELECT id,to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US') AS version FROM users WHERE id=$1 FOR UPDATE`, [target]);
        if (!user) throw new OperationError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.');
        if (user.version !== input.version) throw new OperationError(409, 'MEMBER_CHANGED', '회원 정보가 변경되었습니다. 다시 조회해 주세요.');
        // Scoped main suspension also covers verified-email users without an explicit membership row.
        await new MembershipApprovalService().suspendMembership({ userId: target, suspendedBy: actor,
          isPlatformAdmin: false, serviceKeys: ['neture'], manager: m });
        await m.query(`UPDATE organization_members SET left_at=COALESCE(left_at,now()),updated_at=now()
          WHERE user_id=$1 AND left_at IS NULL AND role IN ('staff','accepted','invited')`, [target]);
        // A single employer means these employment roles no longer grant any business access.
        for (const role of ['kpa:store_member','cafe24-b2b:store_member']) await roleAssignmentService.removeRole(target, role, m);
        await m.query('UPDATE users SET "refreshTokenFamily"=$2,"updatedAt"=clock_timestamp() WHERE id=$1', [target, randomUUID()]);
        await recordOperation(m, 'neture', actor, 'member.access_stopped', { subjectKey: key(target), reasonKey: key(reason) });
        return { saved: true, accessStopped: true, businessDataDeleted: false };
      });
    } finally { invalidateRoles(target); }
  }

  /** Full closure reuses the existing Store inventory and conditional media deletion.
   * A sale never enters this path. Failed file deletion keeps the existing retry manifest.
   */
  async closePharmacy(actor: string, target: string, organizationId: string,
    input: { reason: string; closureConfirmed: true }) {
    const reason = operationReason(input.reason);
    if (input.closureConfirmed !== true) throw new OperationError(400,'CLOSURE_CONFIRMATION_REQUIRED','완전폐업 확인이 필요합니다.');
    const affected: string[] = [];
    try {
      const caseId = await this.db.transaction(async m => {
        await lockMembers(m,[actor,target]);
        const access = await memberWorkspaceAccess(m,actor,true);
        if (!access.manageAccount) throw new OperationError(403,'ACCOUNT_ADMIN_REQUIRED','폐업 자료 삭제는 전체 관리자만 처리할 수 있습니다.');
        await protectAccount(m,target);
        const [pharmacy] = await m.query(`SELECT id,status FROM neture_pharmacy_memberships WHERE organization_id=$1 AND applicant_user_id=$2 FOR UPDATE`,[organizationId,target]);
        if (!pharmacy) throw new OperationError(409,'PHARMACY_OWNER_CHANGED','현재 약국 경영자를 다시 확인해 주세요.');
        const [organization] = await m.query('SELECT id,"isActive" FROM organizations WHERE id=$1 FOR UPDATE',[organizationId]);
        const [existing] = await m.query(`SELECT id,status FROM store_owner_termination_cases WHERE organization_id=$1 AND user_id=$2 AND status<>'cancelled' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,[organizationId,target]);
        if (existing?.status==='purge_completed') {
          if (pharmacy.status!=='terminated' || organization?.isActive!==false) throw new OperationError(409,'PHARMACY_REOPENED','다시 운영 중인 약국은 이전 폐업 건으로 삭제할 수 없습니다.');
          return existing.id as string;
        }
        const service = new StoreOwnerTerminationService(m as unknown as DataSource);
        const lifecycle = existing ?? await service.createCase({serviceKey:'kpa-society',organizationId,userId:target,requestedBy:actor,returnRequested:false});
        if (!['terminated','failed'].includes(lifecycle.status)) await service.terminateCase(lifecycle.id);
        const members: Array<{user_id:string;role:string}> = await m.query(`SELECT user_id,role FROM organization_members WHERE organization_id=$1 AND left_at IS NULL FOR UPDATE`,[organizationId]);
        for (const member of members) {
          await protectAccount(m,member.user_id);
          affected.push(member.user_id);
          if (member.role==='staff') await roleAssignmentService.removeRole(member.user_id,'kpa:store_member',m);
          if (member.role==='owner') await roleAssignmentService.removeRole(member.user_id,'kpa:store_owner',m);
        }
        await m.query(`UPDATE organization_members SET left_at=COALESCE(left_at,now()),updated_at=now() WHERE organization_id=$1`,[organizationId]);
        await m.query(`UPDATE organization_service_enrollments SET status='inactive',updated_at=now() WHERE organization_id=$1 AND status='active'`,[organizationId]);
        await m.query(`UPDATE neture_pharmacy_memberships SET status='terminated',decided_by=$2,decided_at=now(),reason=NULL,updated_at=now() WHERE organization_id=$1`,[organizationId,actor]);
        await m.query('UPDATE organizations SET "isActive"=false,"updatedAt"=now() WHERE id=$1',[organizationId]);
        if (affected.length) await m.query('UPDATE users SET "refreshTokenFamily"=gen_random_uuid()::text,"updatedAt"=clock_timestamp() WHERE id=ANY($1::uuid[])',[affected]);
        await recordOperation(m,'neture',actor,'pharmacy.closed',{organizationId,subjectKey:key(target),reasonKey:key(reason)});
        return lifecycle.id as string;
      });
      const service = new StoreOwnerTerminationService(this.db);
      const lifecycle = await service.getCase(caseId);
      if (lifecycle.status!=='purge_completed') await service.purgeCase(caseId,{dryRun:false,closureConfirmed:true});
      return { saved:true, caseId, storeInventoryPurged:true, accountDeleted:false };
    } finally { for (const id of affected) invalidateRoles(id); }
  }

  /** Sale keeps the same organization and all its business records. No data copy. */
  async transferPharmacy(actor: string, target: string, organizationId: string,
    input: { nextOwnerEmail: string; reason: string; transferConfirmed: true }) {
    const reason = operationReason(input.reason);
    if (input.transferConfirmed !== true) throw new OperationError(400, 'TRANSFER_CONFIRMATION_REQUIRED', '매도와 자료 이전에 대한 양측 확인이 필요합니다.');
    let nextId: string | undefined;
    try {
      return await this.db.transaction(async m => {
        const [next] = await m.query('SELECT id FROM users WHERE lower(email)=lower($1)', [input.nextOwnerEmail.trim()]);
        if (!next || next.id === target) throw new OperationError(409, 'NEXT_OWNER_REQUIRED', '가입된 새 경영자의 이메일을 확인해 주세요.');
        nextId = next.id;
        await lockMembers(m, [actor, target, next.id]);
        const access = await memberWorkspaceAccess(m, actor, true);
        if (!access.manageAccount) throw new OperationError(403, 'ACCOUNT_ADMIN_REQUIRED', '약국 경영자 이전은 전체 관리자만 처리할 수 있습니다.');
        await protectAccount(m, target);
        await protectAccount(m, next.id);
        await m.query('SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [[target, next.id]]);
        if (await getNetureMainMembershipStatus(m, next.id) !== 'active') throw new OperationError(409, 'NEXT_OWNER_INACTIVE', '새 경영자의 가입과 이메일 확인이 필요합니다.');
        const [org] = await m.query('SELECT id FROM organizations WHERE id=$1 AND "isActive"=true FOR UPDATE', [organizationId]);
        const [pharmacy] = await m.query(`SELECT id,status FROM neture_pharmacy_memberships WHERE organization_id=$1 AND applicant_user_id=$2 FOR UPDATE`, [organizationId, target]);
        const [owner] = await m.query(`SELECT 1 FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND role='owner' AND left_at IS NULL FOR UPDATE`, [organizationId, target]);
        if (!org || !pharmacy || !owner || pharmacy.status !== 'active') throw new OperationError(409, 'PHARMACY_OWNER_CHANGED', '현재 승인된 약국과 경영자 소속을 다시 확인해 주세요.');
        const pending = await m.query(`SELECT 1 FROM store_owner_termination_cases WHERE organization_id=$1 AND status<>'cancelled' LIMIT 1`, [organizationId]);
        if (pending.length) throw new OperationError(409, 'PHARMACY_CLOSURE_EXISTS', '종료·삭제 절차가 있는 약국은 매도 이전으로 변경할 수 없습니다.');
        const other = await m.query(`SELECT 1 FROM organization_members WHERE user_id=$1 AND organization_id<>$2 AND left_at IS NULL AND role IN ('staff','accepted') LIMIT 1`, [next.id, organizationId]);
        if (other.length) throw new OperationError(409, 'OTHER_EMPLOYER_EXISTS', '새 경영자의 기존 사업체 소속을 먼저 정리해 주세요.');
        const [qualification] = await m.query(`SELECT license_number FROM kpa_pharmacist_profiles WHERE user_id=$1 AND qualification_status='approved' AND NULLIF(BTRIM(license_number),'') IS NOT NULL FOR SHARE`, [next.id]);
        if (!qualification) throw new OperationError(409, 'NEXT_OWNER_QUALIFICATION_REQUIRED', '새 경영자의 약사 자격 승인이 필요합니다.');
        await m.query(`UPDATE organization_members SET left_at=now(),updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND left_at IS NULL`, [organizationId, target]);
        await m.query(`INSERT INTO organization_members(organization_id,user_id,role,is_primary) VALUES($1,$2,'owner',true)
          ON CONFLICT(organization_id,user_id) DO UPDATE SET role='owner',left_at=NULL,is_primary=true,metadata=NULL,updated_at=now()`, [organizationId, next.id]);
        await m.query(`UPDATE neture_pharmacy_memberships SET applicant_user_id=$2,pharmacist_license_number=$3,
          reason=NULL,decided_by=$4,decided_at=now(),updated_at=now() WHERE organization_id=$1`,
        [organizationId, next.id, qualification.license_number, actor]);
        await m.query(`UPDATE organizations SET metadata=jsonb_set(
          COALESCE(metadata,'{}'::jsonb)-ARRAY['contactName','managerPhone','contactEmail','taxInvoiceEmail'],
          '{businessProfile}',COALESCE(metadata->'businessProfile','{}'::jsonb)-'representativeName'),"updatedAt"=now() WHERE id=$1`,[organizationId]);
        // Registration files stay in their own lifecycle; never erase their manifest here.
        await roleAssignmentService.assignRole({ userId: next.id, role: 'kpa:store_owner', assignedBy: actor }, m);
        const remaining = await m.query(`SELECT 1 FROM organization_members WHERE user_id=$1 AND role='owner' AND left_at IS NULL LIMIT 1`, [target]);
        if (!remaining.length) await roleAssignmentService.removeRole(target, 'kpa:store_owner', m);
        await m.query('UPDATE users SET "refreshTokenFamily"=gen_random_uuid()::text,"updatedAt"=clock_timestamp() WHERE id=ANY($1::uuid[])', [[target, next.id]]);
        await recordOperation(m, 'neture', actor, 'pharmacy.owner_transferred', { organizationId, previousOwnerKey: key(target), nextOwnerKey: key(next.id), reasonKey: key(reason) });
        return { saved: true, organizationId, businessDataDeleted: false };
      });
    } finally { invalidateRoles(target); if (nextId) invalidateRoles(nextId); }
  }
}
