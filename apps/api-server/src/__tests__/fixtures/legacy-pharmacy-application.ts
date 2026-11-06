/** Historical pending-record creation for integration fixtures only. Never imported by runtime. */
import type { DataSource } from 'typeorm';
import { recordEnrollmentPolicies, recordEnrollmentApplication, type EnrollmentPolicyReference } from '../../modules/policy-acceptance/service-enrollment-policy.service.js';
import { NeturePharmacyError, canReapply, rowsOf } from '../../modules/neture-pharmacy/constants.js';
import { createPharmacyStoreOrganization, updatePharmacyStoreProfile } from '../../modules/neture-pharmacy/services/pharmacy-store-link.js';
import { assertNetureMainMembershipActive } from '../../modules/neture/services/neture-main-membership.js';
import { PharmacyMembershipService as MembershipService, type PharmacyMembershipRow, type PharmacyStoreProvisioner } from '../../modules/neture-pharmacy/services/pharmacy-membership.service.js';
export type { PharmacyStoreProvisioner } from '../../modules/neture-pharmacy/services/pharmacy-membership.service.js';
export interface PharmacyApplicationInput {
  policyReferences?: EnrollmentPolicyReference[];
  pharmacyName: string;
  businessNumber: string;
  pharmacistLicenseNumber: string;
  businessRegistrationDocumentId?: string | null;
  contactName?: string;
  managerPhone?: string;
  contactEmail?: string;
  taxInvoiceEmail?: string;
  representativeName?: string;
  businessType?: string;
  businessCategory?: string;
  address?: string | null;
  phone?: string | null;
}

export function normalizeBusinessNumber(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length === 10 ? digits : null;
}

function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return v.length > 0 && v.length <= max ? v : null;
}

export function validateApplication(input: Partial<PharmacyApplicationInput>): PharmacyApplicationInput {
  if (input.businessRegistrationDocumentId != null && (typeof input.businessRegistrationDocumentId !== 'string' || input.businessRegistrationDocumentId.length > 36))
    throw new NeturePharmacyError(400, 'INVALID_DOCUMENT', '본인이 제출한 사업자등록증을 선택해 주세요.');
  const pharmacyName = cleanText(input.pharmacyName, 255);
  const businessNumber = normalizeBusinessNumber(input.businessNumber);
  const pharmacistLicenseNumber = cleanText(input.pharmacistLicenseNumber, 30);
  if (!pharmacyName) throw new NeturePharmacyError(400, 'INVALID_PHARMACY_NAME', '약국 이름을 입력해 주세요.');
  if (!businessNumber) throw new NeturePharmacyError(400, 'INVALID_BUSINESS_NUMBER', '사업자등록번호 10자리를 입력해 주세요.');
  if (!pharmacistLicenseNumber) throw new NeturePharmacyError(400, 'INVALID_LICENSE_NUMBER', '약사 면허번호를 입력해 주세요.');
  for (const email of [input.contactEmail, input.taxInvoiceEmail]) {
    if (email && (typeof email !== 'string' || email.trim().length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))
      throw new NeturePharmacyError(400, 'INVALID_EMAIL', '올바른 이메일 주소를 입력해 주세요.');
  }
  return {
    pharmacyName,
    businessNumber,
    pharmacistLicenseNumber,
    businessRegistrationDocumentId: cleanText(input.businessRegistrationDocumentId, 36) ?? undefined,
    contactName: cleanText(input.contactName, 100) ?? undefined,
    managerPhone: cleanText(input.managerPhone, 50) ?? undefined,
    contactEmail: cleanText(input.contactEmail, 255) ?? undefined,
    taxInvoiceEmail: cleanText(input.taxInvoiceEmail, 255) ?? undefined,
    representativeName: cleanText(input.representativeName, 100) ?? undefined,
    businessType: cleanText(input.businessType, 100) ?? undefined,
    businessCategory: cleanText(input.businessCategory, 100) ?? undefined,
    address: cleanText(input.address, 500),
    phone: cleanText(input.phone, 50),
  };
}

const SELECT_COLUMNS = `npm.id, npm.organization_id, npm.applicant_user_id, npm.status, npm.pharmacy_name,
  npm.business_number, npm.pharmacist_license_number, npm.applied_at, npm.decided_by, npm.decided_at, npm.reason`;
export class PharmacyMembershipService extends MembershipService {
  constructor(private readonly fixtureDb: DataSource, provisioner: PharmacyStoreProvisioner) { super(fixtureDb, provisioner); }
  async apply(userId: string, raw: Partial<PharmacyApplicationInput>): Promise<PharmacyMembershipRow> {
    const input = validateApplication(raw);
    return this.fixtureDb.transaction(async (m) => {
      // 같은 사용자의 동시 신청을 직렬화한다.
      await m.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`neture-pharmacy-apply:${userId}`]);
      // 신청 자격 = Neture 가입 승인(active). 이 신청은 Neture 원장을 만들거나 바꾸지 않는다.
      await assertNetureMainMembershipActive(m, userId);

      // Evidence is optional. When supplied, retain ownership/type/status validation.
      if (input.businessRegistrationDocumentId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.businessRegistrationDocumentId))
          throw new NeturePharmacyError(400, 'INVALID_DOCUMENT', '본인이 제출한 사업자등록증을 선택해 주세요.');
        const [document] = await m.query(`SELECT id FROM kyc_documents WHERE id = $1 AND user_id = $2 AND "documentType" = 'business_registration' AND "verificationStatus" IN ('PENDING','VERIFIED')`, [input.businessRegistrationDocumentId, userId]);
        if (!document) throw new NeturePharmacyError(400, 'INVALID_DOCUMENT', '본인이 제출한 사업자등록증을 선택해 주세요.');
      }
      const existing = await this.findMine(userId, m);
      if (existing && !canReapply(existing.status)) {
        throw new NeturePharmacyError(409, 'ALREADY_APPLIED', '이미 신청했거나 가입된 약국이 있습니다.');
      }

      const [dup] = await m.query(
        `SELECT 1 FROM neture_pharmacy_memberships
          WHERE business_number = $1 AND status IN ('pending','active','suspended')
            AND ($2::uuid IS NULL OR id <> $2::uuid)
          LIMIT 1`,
        [input.businessNumber, existing?.id ?? null],
      );
      if (dup) {
        throw new NeturePharmacyError(409, 'BUSINESS_NUMBER_IN_USE', '이미 가입 진행 중인 사업자등록번호입니다.');
      }

      const policies = await recordEnrollmentPolicies(m, userId, 'kpa-society', raw.policyReferences);
      const saveProfile = async (organizationId: string) => m.query(
        `UPDATE organizations SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb || jsonb_build_object('businessProfile', COALESCE(metadata->'businessProfile', '{}'::jsonb) || $2::jsonb) WHERE id = $1`,
        [organizationId, JSON.stringify({ applicationPolicies: policies, businessRegistrationDocumentId: raw.businessRegistrationDocumentId !== undefined ? (input.businessRegistrationDocumentId ?? null) : undefined,
          businessName: input.pharmacyName, businessNumber: input.businessNumber, representativeName: raw.representativeName !== undefined ? (input.representativeName ?? null) : undefined,
          businessType: raw.businessType !== undefined ? (input.businessType ?? null) : undefined,
          businessCategory: raw.businessCategory !== undefined ? (input.businessCategory ?? null) : undefined,
          address: raw.address !== undefined ? (input.address ?? null) : undefined }),
          JSON.stringify({
            contactName: raw.contactName !== undefined ? (input.contactName ?? null) : undefined,
            managerPhone: raw.managerPhone !== undefined ? (input.managerPhone ?? null) : undefined,
            contactEmail: raw.contactEmail !== undefined ? (input.contactEmail ?? null) : undefined,
            taxInvoiceEmail: raw.taxInvoiceEmail !== undefined ? (input.taxInvoiceEmail ?? null) : undefined,
          })],
      );
      if (existing) {
        await saveProfile(existing.organization_id);
        // 재신청 — 같은 행 · 같은 조직(약국 1 : 매장 1).
        await updatePharmacyStoreProfile(m, existing.organization_id, input);
        const [row] = rowsOf(await m.query(
          `UPDATE neture_pharmacy_memberships npm
              SET status = 'pending', pharmacy_name = $2, business_number = $3, pharmacist_license_number = $4,
                  applied_at = NOW(), decided_by = NULL, decided_at = NULL, reason = NULL, updated_at = NOW()
            WHERE id = $1
          RETURNING ${SELECT_COLUMNS}`,
          [existing.id, input.pharmacyName, input.businessNumber, input.pharmacistLicenseNumber],
        ));
        await recordEnrollmentApplication(m, userId, 'kpa-society', { type: 'pharmacy_application', id: row.id, resourceId: existing.organization_id }, policies);
        return row;
      }

      // Store 트랙 계약 — 약국 조직(= 내 매장) + owner 관계.
      const organizationId = await createPharmacyStoreOrganization(m, userId, input);
      await saveProfile(organizationId);
      const [row] = await m.query(
        `INSERT INTO neture_pharmacy_memberships
           (organization_id, applicant_user_id, status, pharmacy_name, business_number, pharmacist_license_number)
         VALUES ($1, $2, 'pending', $3, $4, $5)
         RETURNING ${SELECT_COLUMNS.replace(/npm\./g, '')}`,
        [organizationId, userId, input.pharmacyName, input.businessNumber, input.pharmacistLicenseNumber],
      );
      await recordEnrollmentApplication(m, userId, 'kpa-society', { type: 'pharmacy_application', id: row.id, resourceId: organizationId }, policies);
      return row;
    });
  }

}
