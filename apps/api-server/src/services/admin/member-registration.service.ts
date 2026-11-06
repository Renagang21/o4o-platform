import { randomUUID } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import {
  type MemberRegistration,
  type MemberRegistrationFields,
  type MemberRegistrationInput,
} from '@o4o/types';
import {
  OperationError,
  operationReason,
  recordOperation,
} from '../operations/operation-audit.js';
import { memberWorkspaceAccess } from './central-member-workspace.service.js';
import { assertRecoverableTarget } from './member-identity-guards.js';
import { validateRegistration } from './member-registration-contract.js';
import {
  assertRegistrationDocument,
  readRegistrationBusiness,
  readRegistration,
  readRegistrationView,
  writeRegistration,
  privateRegistrationValue as secret,
} from './member-registration-data.js';
import {
  isPhoneShapeValid,
  normalizePhoneDigits,
} from '../../common/auth/phone-shape.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { invalidateRoles } from '../../modules/auth/utils/role-cache.js';
import {
  createPharmacyStoreOrganization,
  activatePharmacyStore,
} from '../../modules/neture-pharmacy/services/pharmacy-store-link.js';
import { connectDefaultPharmacyMembership } from '../../modules/neture-pharmacy/services/default-pharmacy-membership.js';
import { organizationOpsService } from '../../modules/organization/services/organization-ops.service.js';
import {
  getEnrollmentPolicies,
  recordEnrollmentPolicies,
  recordEnrollmentApplication,
  type EnrollmentPolicyReference,
} from '../../modules/policy-acceptance/service-enrollment-policy.service.js';

const versionSql = `to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US')`;
export function registrationPolicyScope(type: string) {
  return type === 'pharmacy_owner'
    ? 'kpa-society'
    : type === 'supplier'
      ? 'supplier'
      : type === 'partner'
        ? 'partner-support'
        : null;
}
export class MemberRegistrationService {
  constructor(private readonly db: DataSource) {}
  async self(user: string) {
    const [member] = await this.db.query(
      `SELECT name,nickname,phone,${versionSql} AS version,
      ("businessInfo"::jsonb->'o4oMembershipRegistrationV1'->>'state'='pending' AND "businessInfo"::jsonb->'o4oMembershipRegistrationV1'->>'type' IS NULL) AS "requiresRegistration" FROM users WHERE id=$1`,
      [user],
    );
    if (!member)
      throw new OperationError(
        404,
        'MEMBER_NOT_FOUND',
        '회원을 찾을 수 없습니다.',
      );
    const registration = await readRegistrationView(this.db, user);
    return {
      member,
      requiresRegistration: member.requiresRegistration === true,
      canSubmit:
        !registration ||
        registration.state === 'rejected' ||
        (registration.state === 'pending' && !registration.requestId),
      registration: registration
        ? {
            type: registration.type,
            fields: registration.fields,
            state: registration.state,
            reason: registration.reason,
          }
        : null,
    };
  }
  async policies(type: string) {
    const scope = registrationPolicyScope(type);
    return scope ? getEnrollmentPolicies(this.db, scope) : [];
  }
  async submit(
    user: string,
    input: MemberRegistrationInput & {
      name: string;
      nickname: string;
      phone: string;
      version: string;
      policyReferences?: EnrollmentPolicyReference[];
    },
  ) {
    const value = validateRegistration(
      { type: input.type, fields: input.fields },
      true,
    );
    const name = input.name.trim(),
      nickname = input.nickname.trim(),
      phone = normalizePhoneDigits(input.phone);
    if (
      !name ||
      name.length > 100 ||
      !nickname ||
      nickname.length > 100 ||
      !isPhoneShapeValid(phone)
    )
      throw new OperationError(
        400,
        'INVALID_MEMBER_PROFILE',
        '이름·닉네임·휴대전화를 확인해 주시기 바랍니다.',
      );
    return this.db.transaction(async (m) => {
      const row = await this.lock(m, user, input.version);
      await assertRecoverableTarget(m, user, false, false);
      if (!row.isActive || !['active', 'approved'].includes(row.status))
        throw new OperationError(
          409,
          'ACCOUNT_NOT_ACTIVE',
          '계정 이용 상태를 먼저 확인해 주시기 바랍니다.',
        );
      const [membership] = await m.query(
        "SELECT status FROM service_memberships WHERE user_id=$1 AND service_key='neture' FOR UPDATE",
        [user],
      );
      if (['suspended', 'withdrawn'].includes(membership?.status))
        throw new OperationError(
          409,
          'MEMBER_SERVICE_INACTIVE',
          '회원 복구는 운영자에게 요청해 주시기 바랍니다.',
        );
      const prior = await readRegistrationView(m, user);
      if (prior?.state === 'approved')
        throw new OperationError(
          409,
          'REGISTRATION_ALREADY_APPROVED',
          '승인 후 정보 변경은 My Home의 해당 절차를 이용해 주시기 바랍니다.',
        );
      await assertRegistrationDocument(m, user, value.fields);
      const scope = registrationPolicyScope(value.type);
      const policies = scope
        ? await recordEnrollmentPolicies(m, user, scope, input.policyReferences)
        : [];
      const requestId = randomUUID();
      await writeRegistration(m, user, {
        ...value,
        state: 'pending',
        requestId,
        ...(prior?.legacyMainAccess ? { legacyMainAccess: true } : {}),
      });
      await m.query(
        'UPDATE users SET name=$2,nickname=$3,phone=$4,"updatedAt"=clock_timestamp() WHERE id=$1',
        [user, secret(name), secret(nickname), secret(phone)],
      );
      if (scope)
        await recordEnrollmentApplication(
          m,
          user,
          scope,
          { type: 'member_registration', id: requestId },
          policies,
        );
      await recordOperation(
        m,
        'neture',
        user,
        'member.registration_submitted',
        { targetUserId: user, type: value.type },
      );
      return { saved: true, state: 'pending' };
    });
  }
  private async lock(m: EntityManager, target: string, version: string) {
    const [row] = await m.query(
      `SELECT id,status,"isActive",${versionSql} AS version FROM users WHERE id=$1 FOR UPDATE`,
      [target],
    );
    if (!row)
      throw new OperationError(
        404,
        'MEMBER_NOT_FOUND',
        '회원을 찾을 수 없습니다.',
      );
    if (row.version !== version)
      throw new OperationError(
        409,
        'MEMBER_CHANGED',
        '회원 정보가 변경되었습니다. 다시 조회해 주시기 바랍니다.',
      );
    return row;
  }
  async decide(
    actor: string,
    target: string,
    input: { action: 'approve' | 'reject'; reason: string; version: string },
  ) {
    const reason = operationReason(input.reason);
    const result = await this.db.transaction(async (m) => {
      const access = await memberWorkspaceAccess(m, actor, true);
      if (actor === target)
        throw new OperationError(
          403,
          'SELF_APPROVAL_FORBIDDEN',
          '본인 가입은 다른 운영자가 확인해야 합니다.',
        );
      await assertRecoverableTarget(m, target, access.manageAccount, false);
      const account = await this.lock(m, target, input.version);
      if (
        !account.isActive ||
        !['pending', 'active', 'approved'].includes(account.status)
      )
        throw new OperationError(
          409,
          'ACCOUNT_NOT_ACTIVE',
          '공통 계정 이용 상태를 먼저 확인해 주시기 바랍니다.',
        );
      const prior = await readRegistration(m, target);
      if (!prior)
        throw new OperationError(
          409,
          'REGISTRATION_REQUIRED',
          '가입 유형과 제출 정보를 먼저 저장해 주시기 바랍니다.',
        );
      if (prior.state === 'approved') {
        if (input.action !== 'approve')
          throw new OperationError(
            409,
            'REGISTRATION_ALREADY_APPROVED',
            '승인된 회원은 회원 해지로 처리해 주시기 바랍니다.',
          );
        return {
          saved: true,
          state: 'approved',
          type: prior.type,
          alreadyApproved: true,
        };
      }
      const [service] = await m.query(
        "SELECT status FROM service_memberships WHERE user_id=$1 AND service_key='neture' FOR UPDATE",
        [target],
      );
      if (['suspended', 'withdrawn'].includes(service?.status))
        throw new OperationError(
          409,
          'MEMBER_SERVICE_INACTIVE',
          '해지된 회원은 이용 복구 후 처리해 주시기 바랍니다.',
        );
      if (input.action === 'reject') {
        await writeRegistration(m, target, {
          ...prior,
          state: 'rejected',
          reason,
          reviewedAt: new Date().toISOString(),
          reviewedBy: actor,
        });
        await m.query(
          'UPDATE users SET "updatedAt"=clock_timestamp() WHERE id=$1',
          [target],
        );
        await recordOperation(
          m,
          'neture',
          actor,
          'member.registration_rejected',
          { targetUserId: target, reason, type: prior.type },
        );
        return { saved: true, state: 'rejected', type: prior.type };
      }
      validateRegistration({ type: prior.type, fields: prior.fields }, true);
      await assertRegistrationDocument(m, target, prior.fields);
      await this.assertPolicyEvidence(m, target, prior);
      if (prior.type === 'pharmacist' || prior.type === 'pharmacy_owner')
        await this.approveLicense(
          m,
          actor,
          target,
          prior.fields.licenseNumber!,
          reason,
        );
      let organizationId: string | undefined;
      if (prior.type === 'pharmacy_owner')
        organizationId = await this.approvePharmacy(
          m,
          actor,
          target,
          prior.fields,
        );
      if (prior.type === 'supplier')
        organizationId = await this.approveSupplier(
          m,
          actor,
          target,
          prior.fields,
        );
      await m.query(
        `INSERT INTO service_memberships(user_id,service_key,status,role,approved_by,approved_at)
        VALUES($1,'neture','active','customer',$2,now()) ON CONFLICT(user_id,service_key) DO UPDATE
        SET status='active',approved_by=$2,approved_at=now(),rejection_reason=NULL,updated_at=now()`,
        [target, actor],
      );
      // A reviewed contact address is confirmed by the operator; provider identity is never rewritten.
      await m.query(
        `UPDATE users SET status=CASE WHEN status='pending' THEN 'active' ELSE status END,
        "isEmailVerified"=true,"updatedAt"=clock_timestamp() WHERE id=$1`,
        [target],
      );
      await writeRegistration(m, target, {
        ...prior,
        state: 'approved',
        reason,
        reviewedAt: new Date().toISOString(),
        reviewedBy: actor,
      });
      await recordOperation(
        m,
        'neture',
        actor,
        'member.registration_approved',
        {
          targetUserId: target,
          type: prior.type,
          reason,
          contactConfirmation: 'operator',
          organizationId,
        },
      );
      return {
        saved: true,
        state: 'approved',
        type: prior.type,
        organizationId,
      };
    });
    invalidateRoles(target);
    return result;
  }
  private async assertPolicyEvidence(
    m: EntityManager,
    target: string,
    registration: MemberRegistration,
  ) {
    const scope = registrationPolicyScope(registration.type);
    if (!scope) return;
    const docs = await getEnrollmentPolicies(m, scope);
    if (!docs.length) return;
    const [evidence] = await m.query(
      `SELECT 1 FROM action_logs WHERE user_id=$1 AND service_key=$2
      AND action_key='service:application_policy' AND meta->'application'->>'type'='member_registration'
      AND meta->'application'->>'id'=$3 LIMIT 1`,
      [target, scope, registration.requestId ?? ''],
    );
    if (!evidence)
      throw new OperationError(
        409,
        'ENROLLMENT_POLICY_REQUIRED',
        '회원이 해당 역할의 약관·개인정보 안내를 확인해야 합니다. 가입 정보 화면에서 해당 유형으로 제출해 주시기 바랍니다.',
      );
  }
  private async approveLicense(
    m: EntityManager,
    actor: string,
    target: string,
    license: string,
    reason: string,
  ) {
    const [prior] = await m.query(
      'SELECT license_number,qualification_status FROM kpa_pharmacist_profiles WHERE user_id=$1 FOR UPDATE',
      [target],
    );
    if (
      prior?.license_number === license &&
      prior.qualification_status === 'approved'
    )
      return;
    await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
      secret('pharmacist-license:' + license),
    ]);
    const [other] = await m.query(
      "SELECT 1 FROM kpa_pharmacist_profiles WHERE user_id<>$1 AND BTRIM(license_number)=$2 AND qualification_status='approved' AND license_verified=true",
      [target, secret(license)],
    );
    if (other)
      throw new OperationError(
        409,
        'LICENSE_REVIEW_REQUIRED',
        '이미 승인된 면허번호입니다.',
      );
    await m.query(
      `INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,qualification_status,verified_at,verified_by,qualification_reason)
      VALUES($1,$2,true,'approved',now(),$3,$4) ON CONFLICT(user_id) DO UPDATE SET license_number=$2,license_verified=true,
      qualification_status='approved',qualification_reason=$4,verified_at=now(),verified_by=$3,updated_at=clock_timestamp()`,
      [target, secret(license), actor, secret(reason)],
    );
  }
  private async approvePharmacy(
    m: EntityManager,
    actor: string,
    target: string,
    f: MemberRegistrationFields,
  ) {
    const [existing] = await m.query(
      'SELECT id,organization_id,status FROM neture_pharmacy_memberships WHERE applicant_user_id=$1 FOR UPDATE',
      [target],
    );
    if (existing && ['terminated', 'suspended'].includes(existing.status))
      throw new OperationError(
        409,
        'PHARMACY_LIFECYCLE_REQUIRED',
        '종료·정지 약국은 기존 약국 관리 절차로 처리해 주시기 바랍니다.',
      );
    const organizationId =
      existing?.organization_id ??
      (await createPharmacyStoreOrganization(m, target, {
        pharmacyName: f.businessName!,
        businessNumber: f.businessNumber!,
        address: f.address,
        phone: f.businessPhone,
      }));
    await this.writeBusiness(m, target, organizationId, f);
    const id = existing?.id ?? randomUUID();
    await m.query(
      `INSERT INTO neture_pharmacy_memberships(id,organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number,decided_by,decided_at)
      VALUES($1,$2,$3,'active',$4,$5,$6,$7,now()) ON CONFLICT(id) DO UPDATE SET status='active',pharmacy_name=$4,
      business_number=$5,pharmacist_license_number=$6,decided_by=$7,decided_at=now(),updated_at=now()`,
      [
        id,
        organizationId,
        target,
        secret(f.businessName),
        secret(f.businessNumber),
        secret(f.licenseNumber),
        actor,
      ],
    );
    await roleAssignmentService.assignRole(
      { userId: target, role: 'neture:store_owner', assignedBy: actor },
      m,
    );
    await connectDefaultPharmacyMembership(m, {
      organizationId,
      applicantId: target,
      approvedBy: actor,
      actorId: actor,
    });
    await activatePharmacyStore(
      m as unknown as DataSource,
      { organizationId, pharmacyName: f.businessName! },
      m.queryRunner,
    );
    return organizationId as string;
  }
  private async approveSupplier(
    m: EntityManager,
    actor: string,
    target: string,
    f: MemberRegistrationFields,
  ) {
    let supplier = await readRegistrationBusiness(m, target, 'supplier', true);
    if (supplier?.status === 'INACTIVE')
      throw new OperationError(
        409,
        'SUPPLIER_LIFECYCLE_REQUIRED',
        '이용 종료 공급자는 기존 공급자 관리 절차로 처리해 주시기 바랍니다.',
      );
    if (!supplier) {
      const [org] = await m.query(
        `INSERT INTO organizations(name,code,type,business_number,address,created_by_user_id,"isActive")
        VALUES($1,$2,'supplier',$3,$4,$5,true) RETURNING id`,
        [
          secret(f.businessName),
          'supplier-' + randomUUID(),
          secret(f.businessNumber),
          secret(f.address),
          target,
        ],
      );
      const id = randomUUID();
      [supplier] = await m.query(
        `INSERT INTO neture_suppliers(id,slug,user_id,organization_id,status) VALUES($1,$2,$3,$4,'PENDING') RETURNING id,organization_id,status`,
        [id, 'supplier-' + id, target, org.id],
      );
      await organizationOpsService.setOwner(org.id, target, m.queryRunner);
    }
    if (!supplier.organization_id)
      throw new OperationError(
        409,
        'SUPPLIER_ORGANIZATION_REQUIRED',
        '공급자 사업체 연결을 먼저 확인해 주시기 바랍니다.',
      );
    await this.writeBusiness(m, target, supplier.organization_id, f, true);
    await m.query(
      `UPDATE neture_suppliers SET status='ACTIVE',approved_by=$2,approved_at=now(),representative_name=$3,
      manager_name=$4,manager_phone=$5,contact_email=$6,business_type=$7,business_item=$8,tax_invoice_email=$9,
      business_registration_document_id=$10,contact_phone=$11,updated_at=now() WHERE id=$1`,
      [
        supplier.id,
        actor,
        ...[
          f.representativeName,
          f.contactName,
          f.contactPhone,
          f.contactEmail,
          f.businessType,
          f.businessItem,
          f.taxInvoiceEmail,
          f.businessRegistrationDocumentId,
          f.businessPhone,
        ].map((x) => secret(x || null)),
      ],
    );
    await organizationOpsService.enrollService(
      { organizationId: supplier.organization_id, serviceCode: 'neture' },
      m.queryRunner,
    );
    await roleAssignmentService.assignRole(
      { userId: target, role: 'neture:supplier', assignedBy: actor },
      m,
    );
    return supplier.organization_id as string;
  }
  async writeBusiness(
    m: EntityManager,
    target: string,
    organizationId: string,
    f: MemberRegistrationFields,
    supplier = false,
  ) {
    const [owner] = await m.query(
      "SELECT 1 FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND role='owner' AND left_at IS NULL FOR UPDATE",
      [organizationId, target],
    );
    if (!owner)
      throw new OperationError(
        409,
        'BUSINESS_OWNER_CHANGED',
        '현재 사업체 소유자를 다시 확인해 주시기 바랍니다.',
      );
    const metadata = supplier
      ? {
          businessEntityType: f.businessEntityType ?? null,
          businessStartDate: f.businessStartDate ?? null,
          managerEmail: f.managerEmail || null,
        }
      : {
          representativeName: f.representativeName ?? null,
          businessType: f.businessType ?? null,
          businessCategory: f.businessItem ?? null,
          businessEntityType: f.businessEntityType ?? null,
          businessStartDate: f.businessStartDate ?? null,
          businessRegistrationDocumentId:
            f.businessRegistrationDocumentId ?? null,
          ...(f.managerEmail !== undefined
            ? { managerEmail: f.managerEmail || null }
            : {}),
        };
    await m.query(
      `UPDATE organizations SET name=$2,business_number=$3,address=$4,phone=$5,
      metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('businessProfile',COALESCE(metadata->'businessProfile','{}'::jsonb)||$6::jsonb)||
      CASE WHEN $12::boolean THEN '{}'::jsonb ELSE jsonb_build_object('contactName',$7::text,'managerPhone',$8::text,'contactEmail',$9::text,'taxInvoiceEmail',$10::text) END,
      address_detail=COALESCE(address_detail::jsonb,'{}'::jsonb)||$11::jsonb,"updatedAt"=clock_timestamp() WHERE id=$1`,
      [
        organizationId,
        secret(f.businessName),
        secret(f.businessNumber),
        secret(f.address || null),
        secret(f.businessPhone || null),
        secret(JSON.stringify(metadata)),
        ...[
          f.contactName,
          f.contactPhone,
          f.contactEmail,
          f.taxInvoiceEmail,
        ].map((v) => secret(v || null)),
        secret(
          JSON.stringify({
            zipCode: f.zipCode || null,
            baseAddress: f.address || null,
            detailAddress: f.addressDetail || null,
          }),
        ),
        supplier,
      ],
    );
  }

  async syncApprovedFields(
    m: EntityManager,
    actor: string,
    target: string,
    registration: MemberRegistration,
    qualificationVersion?: string | null,
    reason = '운영자 가입 정보 정정',
    businessVersion?: string | null,
  ) {
    validateRegistration(
      { type: registration.type, fields: registration.fields },
      true,
    );
    const f = registration.fields;
    const business = await readRegistrationBusiness(
      m,
      target,
      registration.type,
      true,
    );
    if (
      ['supplier', 'pharmacy_owner'].includes(registration.type) &&
      (!business ||
        !businessVersion ||
        business.registration_business_version !== businessVersion)
    )
      throw new OperationError(
        409,
        'BUSINESS_CHANGED',
        '사업자 정보 또는 소유자가 변경되었습니다. 다시 조회해 주시기 바랍니다.',
      );
    if (
      registration.type === 'pharmacist' ||
      registration.type === 'pharmacy_owner'
    ) {
      const [qualification] = await m.query(
        `SELECT license_number,qualification_status,to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') AS version FROM kpa_pharmacist_profiles WHERE user_id=$1 FOR UPDATE`,
        [target],
      );
      if (qualification?.license_number !== f.licenseNumber) {
        if (!qualification || qualification.version !== qualificationVersion)
          throw new OperationError(
            409,
            'QUALIFICATION_CHANGED',
            '면허 정보가 변경되었습니다. 다시 조회해 주시기 바랍니다.',
          );
        if (qualification.qualification_status !== 'approved')
          throw new OperationError(
            409,
            'QUALIFICATION_NOT_APPROVED',
            '자격 이용 상태를 먼저 확인해 주시기 바랍니다.',
          );
        await this.approveLicense(m, actor, target, f.licenseNumber!, reason);
      }
    }
    if (registration.type === 'pharmacy_owner') {
      const [pharmacy] = await m.query(
        'SELECT id,organization_id FROM neture_pharmacy_memberships WHERE applicant_user_id=$1 FOR UPDATE',
        [target],
      );
      if (!pharmacy)
        throw new OperationError(
          409,
          'PHARMACY_NOT_FOUND',
          '기존 약국 연결을 확인해 주시기 바랍니다.',
        );
      await this.writeBusiness(m, target, pharmacy.organization_id, f);
      await m.query(
        'UPDATE neture_pharmacy_memberships SET pharmacy_name=$2,business_number=$3,pharmacist_license_number=$4,updated_at=now() WHERE id=$1',
        [
          pharmacy.id,
          secret(f.businessName),
          secret(f.businessNumber),
          secret(f.licenseNumber),
        ],
      );
    }
    if (registration.type === 'supplier') {
      const supplier = business;
      if (!supplier?.organization_id)
        throw new OperationError(
          409,
          'SUPPLIER_ORGANIZATION_REQUIRED',
          '기존 공급자 사업체를 확인해 주시기 바랍니다.',
        );
      await this.writeBusiness(m, target, supplier.organization_id, f, true);
      await m.query(
        `UPDATE neture_suppliers SET representative_name=$2,manager_name=$3,manager_phone=$4,contact_email=$5,
        business_type=$6,business_item=$7,tax_invoice_email=$8,business_registration_document_id=$9,contact_phone=$10,updated_at=now() WHERE id=$1`,
        [
          supplier.id,
          ...[
            f.representativeName,
            f.contactName,
            f.contactPhone,
            f.contactEmail,
            f.businessType,
            f.businessItem,
            f.taxInvoiceEmail,
            f.businessRegistrationDocumentId,
            f.businessPhone,
          ].map((v) => secret(v || null)),
        ],
      );
    }
  }
}
