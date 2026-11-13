import { assertOperatorMemberTarget, protectedMemberSql } from '../operations/protected-member-target.js';
import {correctIdentity,type MemberCorrection} from './member-profile-corrections.js';
import {correctRegistration,readRegistrationView,MEMBER_REGISTRATION_LEGACY_ACCESS_SQL,MEMBER_REGISTRATION_TYPE_SQL,MEMBER_REGISTRATION_STATE_SQL,MEMBER_LOGIN_METHODS_SQL} from './member-registration-data.js';
import { buildBusinessInfoUpdateStatement } from '../../utils/business-info-write.js';
import type { DataSource, EntityManager } from 'typeorm';
import { centralOperationRoles } from './central-operation-access.js';
import { centralOperationMenuKeys } from './central-operation-menu-grants.js';
import { OperationError, operationReason, recordOperation } from '../operations/operation-audit.js';
import { isPhoneShapeValid, normalizePhoneDigits } from '../../common/auth/phone-shape.js';
import { resolveNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';
import { isRetiredRoleValue } from '../../middleware/retired-service.middleware.js';

type Db = Pick<EntityManager, 'query'>;
export type MemberTask = 'all' | 'pending' | 'inactive' | 'qualifications' | 'pharmacies' | 'corrections';
const version = `to_char(u."updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US')`;
/** 끝나지 않은 계정 삭제(검토 필요 · 재시도 필요 · 진행 중). 삭제 요청이 계정을 먼저 멈추므로 목록에 「해지」가 아니라 이 상태를 보인다(2026-11-10).
 *  삭제 전 검토에서 멈추면 error_code 는 비고 원인은 review_codes 에만 있다 — 화면이 원인을 보이도록 첫 검토 코드를 대신 쓴다(2026-11-13). */
const ERASURE_SQL = `(SELECT o.state FROM account_erasure_operations o WHERE o.subject_id=u.id AND o.state<>'completed') AS "erasureState",
 (SELECT COALESCE(o.error_code,o.review_codes->>0) FROM account_erasure_operations o WHERE o.subject_id=u.id AND o.state<>'completed') AS "erasureErrorCode",
 (SELECT o.review_codes FROM account_erasure_operations o WHERE o.subject_id=u.id AND o.state<>'completed') AS "erasureReviewCodes"`;
const identity = `${protectedMemberSql("u.id")} AS "operatorReadOnly",u.id AS "userId",u.name,u.nickname,u.email,u.phone,u.status AS "accountStatus",
 u."isActive" AS "accountActive",(SELECT sm.status FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='neture') AS "membershipStatus",
 u."isEmailVerified" AS "emailVerified",EXISTS(SELECT 1 FROM user_password_credentials pc WHERE pc.user_id=u.id) AS "hasPassword",u."createdAt" AS "joinedAt",${version} AS version,
 ${MEMBER_REGISTRATION_TYPE_SQL} AS "registrationType",${MEMBER_REGISTRATION_STATE_SQL} AS "registrationState",${MEMBER_REGISTRATION_LEGACY_ACCESS_SQL} AS "registrationLegacyMainAccess",${MEMBER_LOGIN_METHODS_SQL} AS "loginMethods",${ERASURE_SQL}`;
/** 회원 목록 「가입 유형」에 운영 역할을 보이기 위한 현재 유효한 관리자 · 운영자 역할(가입 신청서가 없는 운영자를 「미등록」으로 보이지 않게 한다 · 2026-11-10).
 *  판정식은 member-identity-guards 의 운영 권한 판정과 같다. */
const OPERATOR_ROLES_SQL = `ARRAY(SELECT ra.role FROM role_assignments ra WHERE ra.user_id=u.id AND ra.is_active=true
  AND (ra.valid_from IS NULL OR ra.valid_from<=statement_timestamp()) AND (ra.valid_until IS NULL OR ra.valid_until>=statement_timestamp())
  AND (ra.role LIKE 'platform:%' OR ra.role ~ '(^|:|_)(admin|operator)$') ORDER BY ra.role)`;
/** 표시용 운영 역할 — 활성 이력으로 남은 퇴역 역할(platform:member · kpa:branch_operator · cosmetics:* 등)은 현재 역할이 아니므로 뺀다
 *  (O4O-CURRENT-ADMIN-ROLE-POLICY-V1 · roleAssignmentService.getActiveRoles 와 같은 isRetiredRoleValue 기준). */
export function currentOperatorRoles(roles: unknown): string[] {
  return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string' && !isRetiredRoleValue(role)) : [];
}
const pharmacyExists = (status: string) => `EXISTS(SELECT 1 FROM neture_pharmacy_memberships n WHERE n.applicant_user_id=u.id AND n.status='${status}')`;
const privateValue = (value: unknown) => ({ toPostgres: () => value, toJSON: () => '[redacted]' });

/** Member delegates review signup fields and evidence; dedicated domain/admin commands retain their own grants. */
export async function memberWorkspaceAccess(db: Db, actor: string, lock = false, qualificationReview = false) {
  const roles = await centralOperationRoles(db, actor, lock);
  const keys = await centralOperationMenuKeys(db, actor, roles);
  if (!(qualificationReview ? keys.includes('neture.qualifications') : keys.includes('neture.members'))) throw new OperationError(403, 'MEMBER_DIRECTORY_REQUIRED', '공통 회원 조회 업무 위임이 필요합니다.');
  return {
    qualifications: keys.includes('neture.qualifications'),
    pharmacies: keys.includes('neture.pharmacies'),
    applications: keys.includes('neture.applications'),
    readDocuments: keys.includes('neture.members'),
    edit: !qualificationReview,
    manageAccount: !qualificationReview && roles.includes('platform:super_admin'),
    erase: !qualificationReview && roles.includes('platform:super_admin'),
  };
}

export class CentralMemberWorkspaceService {
  constructor(private readonly db: DataSource) {}

  async list(actor: string, task: MemberTask, page: number, search: string) {
    const permissions = await memberWorkspaceAccess(this.db, actor);
    if ((task === 'qualifications' && !permissions.qualifications) || (task === 'pharmacies' && !permissions.pharmacies))
      throw new OperationError(403, 'MEMBER_TASK_NOT_DELEGATED', '해당 심사 업무 권한이 필요합니다.');
    const qualificationCorrections = permissions.qualifications ? "p.qualification_status IN ('rejected','revoked')" : 'false';
    const pharmacyCorrections = permissions.pharmacies ? pharmacyExists('rejected') : 'false';
    const conditions: Record<MemberTask, string> = {
      all: 'true', qualifications: `p.qualification_status='pending'`, pharmacies: pharmacyExists('pending'),
      pending: `(${MEMBER_REGISTRATION_STATE_SQL}='pending' OR u.status='pending' OR (u."isEmailVerified"=false AND u.status IN ('active','approved')))`,
      // 목록 「회원 상태」 배지(resolveNetureMainMembershipStatus)와 같은 기준 — 계정이 멈춘 회원(삭제 요청 포함)도 해지 탭에 센다(2026-11-10).
      inactive: `(u.status='suspended' OR u."isActive"=false OR EXISTS(SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='neture' AND sm.status IN ('suspended','withdrawn')))`,
      corrections: `(${MEMBER_REGISTRATION_STATE_SQL}='rejected' OR ${qualificationCorrections} OR ${pharmacyCorrections})`,
    };
    const query = search.trim().slice(0, 100);
    const match = `($1='' OR u.id::text=$1 OR strpos(lower(COALESCE(u.name,'')),lower($1))>0 OR strpos(lower(COALESCE(u.nickname,'')),lower($1))>0 OR strpos(lower(COALESCE(u.email,'')),lower($1))>0)`;
    const from = `FROM users u LEFT JOIN kpa_pharmacist_profiles p ON p.user_id=u.id WHERE ${match}`;
    const [counts] = await this.db.query(`SELECT COUNT(*)::int AS all,
      COUNT(*) FILTER(WHERE ${conditions.pending})::int AS pending,COUNT(*) FILTER(WHERE ${conditions.inactive})::int AS inactive,
      COUNT(*) FILTER(WHERE ${permissions.qualifications ? conditions.qualifications : 'false'})::int AS qualifications,
      COUNT(*) FILTER(WHERE ${permissions.pharmacies ? conditions.pharmacies : 'false'})::int AS pharmacies,
      COUNT(*) FILTER(WHERE ${conditions.corrections})::int AS corrections ${from}`, [query]);
    const items = await this.db.query(`SELECT ${protectedMemberSql("u.id")} AS "operatorReadOnly",u.id AS "userId",u.name,u.nickname,u.email,u.status AS "accountStatus",
      ${MEMBER_REGISTRATION_TYPE_SQL} AS "registrationType",${MEMBER_REGISTRATION_STATE_SQL} AS "registrationState",${MEMBER_REGISTRATION_LEGACY_ACCESS_SQL} AS "registrationLegacyMainAccess",${MEMBER_LOGIN_METHODS_SQL} AS "loginMethods",
      u."isActive" AS "accountActive",u."isEmailVerified" AS "emailVerified",
      (SELECT sm.status FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='neture') AS "membershipStatus",
      COALESCE(p.qualification_status,'unrequested') AS "qualificationStatus",
      ${permissions.pharmacies ? `(SELECT n.status FROM neture_pharmacy_memberships n WHERE n.applicant_user_id=u.id ORDER BY n.applied_at DESC,n.id LIMIT 1)` : 'NULL::text'} AS "pharmacyStatus",
      ${OPERATOR_ROLES_SQL} AS "operatorRoles",${ERASURE_SQL}
      ${from} AND (${conditions[task]}) ORDER BY u."createdAt" DESC,u.id LIMIT 21 OFFSET $2`,
    [query, (page - 1) * 20]);
    return { items: items.slice(0, 20).map(row=>({...row,operatorRoles:currentOperatorRoles(row.operatorRoles),serviceStatus:resolveNetureMainMembershipStatus({account_status:row.accountStatus,account_active:row.accountActive,email_verified:row.emailVerified,membership_status:row.membershipStatus,registration_state:row.registrationState,legacy_main_access:row.registrationLegacyMainAccess})})), hasNext: items.length > 20, counts, permissions };
  }

  async detail(actor: string, target: string, qualificationReview = false) {
    const permissions = await memberWorkspaceAccess(this.db, actor, false, qualificationReview);
    const [member] = await this.db.query(`SELECT ${identity} FROM users u WHERE u.id=$1`, [target]);
    if (!member) throw new OperationError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.');
    member.serviceStatus=resolveNetureMainMembershipStatus({account_status:member.accountStatus,account_active:member.accountActive,email_verified:member.emailVerified,membership_status:member.membershipStatus,registration_state:member.registrationState,legacy_main_access:member.registrationLegacyMainAccess});
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
      md5(to_jsonb(n)::text || to_jsonb(o)::text) AS version,n.applied_at AS "appliedAt",n.decided_at AS "decidedAt",n.decided_by AS "decidedBy",o.address,o.phone,
      o.metadata->'businessProfile'->>'representativeName' AS "representativeName",
      o.metadata->'businessProfile'->>'businessType' AS "businessType",o.metadata->'businessProfile'->>'businessCategory' AS "businessCategory",
      o.metadata->'businessProfile'->>'businessRegistrationDocumentId' AS "documentId",
      o.metadata->>'contactName' AS "contactName",o.metadata->>'managerPhone' AS "managerPhone",
      o.metadata->>'contactEmail' AS "contactEmail",o.metadata->>'taxInvoiceEmail' AS "taxInvoiceEmail"
      FROM neture_pharmacy_memberships n JOIN organizations o ON o.id=n.organization_id
      WHERE n.applicant_user_id=$1 ORDER BY n.applied_at DESC,n.id`, [target]) : [];
    const actions = ['member.profile_corrected','member.license_corrected','member.temporary_password_issued','member.legacy_business_corrected','member.registration_rejected','member.registration_submitted','member.registration_approved','member.access_restored', ...(permissions.pharmacies ? ['member.pharmacy_profile_corrected'] : []), ...(permissions.qualifications ? ['qualification.pharmacist_requested', 'qualification.pharmacist_approved', 'qualification.pharmacist_rejected', 'qualification.pharmacist_revoked'] : [])];
    const history = await this.db.query(`SELECT action_key AS action,created_at AS "createdAt",user_id AS "actorId",meta->>'reason' AS reason
      FROM action_logs WHERE service_key='neture' AND meta->>'targetUserId'=$1 AND action_key=ANY($2::text[])
      ORDER BY created_at DESC,id DESC LIMIT 30`, [target, actions]);
    const registration=await readRegistrationView(this.db,target);
    return { member, registration, qualification: qualification ?? null, legacyLicense, legacyBusiness, pharmacies, history, permissions };
  }

  async correct(actor: string, target: string, input: MemberCorrection) {
    const reason = operationReason(input.reason);
    const phone = normalizePhoneDigits(input.phone);
    if (input.phone.trim() && !isPhoneShapeValid(input.phone)) throw new OperationError(400, 'INVALID_PHONE', '올바른 국내 휴대전화 번호를 입력해 주시기 바랍니다.');
    return await this.db.transaction(async manager => {
      const access=await memberWorkspaceAccess(manager, actor, true);
      if (!access.edit) throw new OperationError(403, 'MEMBER_ADMIN_REQUIRED', '회원 정보 정정 업무 위임이 필요합니다.');
      if (!access.manageAccount) await assertOperatorMemberTarget(manager,target);
      const [before] = await manager.query(`SELECT ${identity} FROM users u WHERE u.id=$1 FOR UPDATE`, [target]);
      if (!before) throw new OperationError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.');
      if (before.version !== input.version) throw new OperationError(409, 'MEMBER_CHANGED', '회원 정보가 변경되었습니다. 다시 조회한 뒤 정정해 주시기 바랍니다.');
      const result=await correctIdentity(manager,actor,target,before,access,input);
      if(input.registration){
        const next=await correctRegistration(manager,target,input.registration);
        if(next.state==='approved'){
          const {MemberRegistrationService}=await import('./member-registration.service.js');
          await new MemberRegistrationService(this.db).syncApprovedFields(manager,actor,target,next,input.qualificationVersion,reason,input.businessVersion);
        }
      }
      await manager.query(`UPDATE users SET name=$2,nickname=$3,phone=$4,"updatedAt"=clock_timestamp() WHERE id=$1`,
        [target, privateValue(input.name || null), privateValue(input.nickname || null), privateValue(phone || null)]);
      await recordOperation(manager, 'neture', actor, 'member.profile_corrected', { targetUserId: target, reason,
        previous: { name: before.name, nickname: before.nickname, phone: before.phone,...(result.emailChanged?{email:before.email}:{}) }, next: { name: input.name, nickname: input.nickname, phone,...(result.emailChanged?{email:input.email?.trim().toLowerCase()}:{}) } });
      return { saved: true, ...result };
    }).catch((error:unknown)=>{
      if((error as {code?:string}).code==='23505')throw new OperationError(409,'EMAIL_IN_USE','이미 가입된 이메일입니다.');
      throw error;
    });
  }
  async rejectRegistration(actor: string, target: string, input: {reason: string; version: string}) {
    const reason = operationReason(input.reason);
    return this.db.transaction(async manager => {
      if (!(await memberWorkspaceAccess(manager, actor, true)).manageAccount || actor === target)
        throw new OperationError(403,'ACCOUNT_ADMIN_REQUIRED','계정 가입 거부는 전체 관리자 업무입니다.');
      const [before] = await manager.query(`SELECT ${identity} FROM users u WHERE u.id=$1 FOR UPDATE`,[target]);
      if (!before) throw new OperationError(404,'MEMBER_NOT_FOUND','회원을 찾을 수 없습니다.');
      if (before.version !== input.version) throw new OperationError(409,'MEMBER_CHANGED','회원 정보가 변경되었습니다. 다시 조회해 주시기 바랍니다.');
      if (before.accountStatus !== 'pending') throw new OperationError(409,'NOT_PENDING_REGISTRATION','대기 중인 가입만 거부할 수 있습니다. 활성 회원은 서비스별 이용 중지 절차를 사용해 주시기 바랍니다.');
      const [privileged] = await manager.query(`SELECT 1 FROM role_assignments WHERE user_id=$1 AND is_active=true AND (role='platform:super_admin' OR role ~ '(^|:|_)(admin|operator)$') LIMIT 1`,[target]);
      if (privileged) throw new OperationError(409,'PRIVILEGED_ACCOUNT','운영 권한이 있는 계정은 가입 거부할 수 없습니다.');
      await manager.query(`UPDATE users SET status='rejected',"updatedAt"=clock_timestamp() WHERE id=$1`,[target]);
      await recordOperation(manager,'neture',actor,'member.registration_rejected',{targetUserId:target,reason,previousStatus:'pending',nextStatus:'rejected'});
      return {saved:true};
    });
  }

  async correctLegacyBusiness(actor: string, target: string, input: {fields: Record<string,string>; reason: string; version: string}) {
    const reason=operationReason(input.reason);
    const mapping: Record<string,string>={name:'businessName',businessNumber:'businessNumber',representativeName:'representativeName',businessType:'businessType',businessCategory:'businessItem',address:'address',addressDetail:'address2',businessEntityType:'businessEntityType',businessStartDate:'businessStartDate',contactName:'contactName',managerPhone:'managerPhone',taxInvoiceEmail:'taxInvoiceEmail'};
    return this.db.transaction(async manager=>{
      const access=await memberWorkspaceAccess(manager,actor,true);
      if (!access.edit || !access.applications) throw new OperationError(403,'BUSINESS_REVIEW_REQUIRED','기존 가입 사업자 정보 정정 권한이 필요합니다.');
      if (!access.manageAccount) await assertOperatorMemberTarget(manager,target);
      const [before]=await manager.query(`SELECT ${identity},u."businessInfo" AS business FROM users u WHERE u.id=$1 AND EXISTS(SELECT 1 FROM service_memberships WHERE user_id=$1 AND service_key='neture') FOR UPDATE`,[target]);
      if (!before) throw new OperationError(404,'BUSINESS_NOT_FOUND','기존 Neture 가입 자료를 찾을 수 없습니다.');
      if (before.version!==input.version) throw new OperationError(409,'MEMBER_CHANGED','회원 정보가 변경되었습니다. 다시 조회해 주시기 바랍니다.');
      const patch=Object.fromEntries(Object.entries(input.fields).map(([key,value])=>[mapping[key],value || null]));
      if(Object.hasOwn(before.business??{},'ceoName'))patch.ceoName=input.fields.representativeName||null;
      const update=buildBusinessInfoUpdateStatement({root:patch},target);
      if(!update)throw new OperationError(400,'BUSINESS_FIELDS_REQUIRED','정정할 사업자 정보를 입력해 주시기 바랍니다.');
      await manager.query(update.sql,update.params.map(privateValue));
      await recordOperation(manager,'neture',actor,'member.legacy_business_corrected',{targetUserId:target,reason,previous:Object.fromEntries(Object.entries(mapping).map(([key,column])=>[key,before.business?.[column]??(key==='representativeName'?before.business?.ceoName??null:null)])),next:input.fields});
      return {saved:true};
    });
  }

  async correctPharmacy(actor: string, target: string, id: string, input: {fields: Record<string,string>; reason: string; version: string; evidenceConfirmed: true}) {
    const reason=operationReason(input.reason), f=input.fields;
    if (!/^\d{10}$/.test(f.businessNumber)) throw new OperationError(400,'INVALID_BUSINESS_NUMBER','사업자등록번호 10자리를 입력해 주시기 바랍니다.');
    if (f.licenseNumber !== undefined && [...f.licenseNumber.trim()].length > 30) throw new OperationError(400,'INVALID_LICENSE_NUMBER','약국 신청 면허번호는 30자 이내로 입력해 주시기 바랍니다.');
    return this.db.transaction(async manager=>{
      const access=await memberWorkspaceAccess(manager,actor,true);
      if (!access.edit || !access.pharmacies) throw new OperationError(403,'PHARMACY_REVIEW_REQUIRED','약국 정보 정정 업무 위임이 필요합니다.');
      if (!access.manageAccount) await assertOperatorMemberTarget(manager,target);
      const [before]=await manager.query(`SELECT n.organization_id AS "organizationId",n.pharmacy_name AS name,n.business_number AS "businessNumber",n.pharmacist_license_number AS "licenseNumber",n.status,o.address,o.phone,o.metadata,md5(to_jsonb(n)::text||to_jsonb(o)::text) AS version
        FROM neture_pharmacy_memberships n JOIN organizations o ON o.id=n.organization_id WHERE n.id=$1 AND n.applicant_user_id=$2 FOR UPDATE OF n,o`,[id,target]);
      if (!before) throw new OperationError(404,'PHARMACY_NOT_FOUND','해당 회원의 약국 신청을 찾을 수 없습니다.');
      if (before.version!==input.version) throw new OperationError(409,'PHARMACY_CHANGED','약국 정보가 변경되었습니다. 다시 조회해 주시기 바랍니다.');
      if(f.licenseNumber!==undefined&&f.licenseNumber!==before.licenseNumber&&['active','suspended'].includes(before.status)){
        const [qualified]=await manager.query(`SELECT 1 FROM kpa_pharmacist_profiles WHERE user_id=$1 AND BTRIM(license_number)=$2 AND qualification_status='approved' AND license_verified=true AND verified_at IS NOT NULL AND verified_by IS NOT NULL`,[target,privateValue(f.licenseNumber)]);
        if(!qualified)throw new OperationError(409,'QUALIFICATION_LICENSE_MISMATCH','승인된 약국의 면허 변경은 일치하는 약사 자격을 먼저 확인해 주시기 바랍니다.');
      }
      const [duplicate]=await manager.query(`SELECT 1 FROM neture_pharmacy_memberships WHERE business_number=$1 AND status IN ('pending','active','suspended') AND id<>$2 LIMIT 1`,[f.businessNumber,id]);
      if (duplicate) throw new OperationError(409,'BUSINESS_NUMBER_IN_USE','이미 사용 중인 사업자등록번호입니다.');
      const [shared]=await manager.query(`SELECT 1 FROM neture_pharmacy_memberships WHERE organization_id=$1 AND applicant_user_id<>$2 LIMIT 1`,[before.organizationId,target]);
      if (shared) throw new OperationError(409,'PHARMACY_SHARED_ORGANIZATION','조직과 신청자 연결을 먼저 확인해야 합니다.');
      await manager.query(`UPDATE neture_pharmacy_memberships SET pharmacy_name=$2,business_number=$3,pharmacist_license_number=COALESCE($4,pharmacist_license_number),updated_at=clock_timestamp() WHERE id=$1`,[id,privateValue(f.name),privateValue(f.businessNumber),privateValue(f.licenseNumber??null)]);
      const profile={businessName:f.name,businessNumber:f.businessNumber,representativeName:f.representativeName,businessType:f.businessType,businessCategory:f.businessCategory,address:f.address};
      const contacts={contactName:f.contactName,managerPhone:f.managerPhone,contactEmail:f.contactEmail,taxInvoiceEmail:f.taxInvoiceEmail};
      await manager.query(`UPDATE organizations SET name=$2,business_number=$3,address=$4,phone=$5,"updatedAt"=clock_timestamp(),metadata=COALESCE(metadata,'{}'::jsonb)||$6::jsonb||jsonb_build_object('businessProfile',(CASE WHEN jsonb_typeof(metadata->'businessProfile')='object' THEN metadata->'businessProfile' ELSE '{}'::jsonb END)||$7::jsonb) WHERE id=$1`,[before.organizationId,privateValue(f.name),privateValue(f.businessNumber),privateValue(f.address),privateValue(f.phone),privateValue(JSON.stringify(contacts)),privateValue(JSON.stringify(profile))]);
      await recordOperation(manager,'neture',actor,'member.pharmacy_profile_corrected',{targetUserId:target,pharmacyId:id,reason,evidenceConfirmed:input.evidenceConfirmed,previous:{name:before.name,businessNumber:before.businessNumber,licenseNumber:before.licenseNumber,address:before.address,phone:before.phone,...Object.fromEntries(['representativeName','businessType','businessCategory'].map(key=>[key,before.metadata?.businessProfile?.[key]??null])),...Object.fromEntries(['contactName','managerPhone','contactEmail','taxInvoiceEmail'].map(key=>[key,before.metadata?.[key]??null]))},next:f});
      return {saved:true};
    }).catch((error:unknown)=>{
      if((error as {code?:string}).code==='23505')throw new OperationError(409,'BUSINESS_NUMBER_IN_USE','이미 사용 중인 사업자등록번호입니다.');
      throw error;
    });
  }

}
