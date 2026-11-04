import type { EntityManager } from 'typeorm';
import {
  MEMBER_REGISTRATION_KEY,
  type MemberRegistration,
  type MemberRegistrationInput,
  type MemberRegistrationFields,
  registrationFieldKeys,
} from '@o4o/types';
import { buildBusinessInfoUpdateStatement } from '../../utils/business-info-write.js';
import { OperationError } from '../operations/operation-audit.js';
import { validateRegistration } from './member-registration-contract.js';

export const REGISTRATION_SQL = `u."businessInfo"::jsonb->'${MEMBER_REGISTRATION_KEY}'`;
export const MEMBER_REGISTRATION_TYPE_SQL = `COALESCE(${REGISTRATION_SQL}->>'type',
 CASE WHEN EXISTS(SELECT 1 FROM neture_pharmacy_memberships pm WHERE pm.applicant_user_id=u.id) THEN 'pharmacy_owner'
 WHEN EXISTS(SELECT 1 FROM neture_suppliers ns JOIN organization_members om ON om.organization_id=ns.organization_id WHERE om.user_id=u.id AND om.role='owner' AND om.left_at IS NULL) THEN 'supplier'
 WHEN EXISTS(SELECT 1 FROM kpa_pharmacist_profiles pp WHERE pp.user_id=u.id AND NULLIF(BTRIM(pp.license_number),'') IS NOT NULL) THEN 'pharmacist' END)`;
export const MEMBER_REGISTRATION_STATE_SQL = `${REGISTRATION_SQL}->>'state'`;
export const MEMBER_LOGIN_METHODS_SQL = `ARRAY(SELECT DISTINCT la.provider FROM linked_accounts la WHERE la."userId"=u.id AND la.provider IN ('google','kakao')) || CASE WHEN EXISTS(SELECT 1 FROM user_password_credentials pc WHERE pc.user_id=u.id) THEN ARRAY['email']::text[] ELSE ARRAY[]::text[] END`;
type Exec = Pick<EntityManager, 'query'>;
export const privateRegistrationValue = (value: unknown) => ({
  toPostgres: () => value,
  toJSON: () => '[redacted]',
});

/** Only this module owns the reserved signup snapshot. Other businessInfo writers cannot change it. */
export async function writeRegistration(
  m: Exec,
  target: string,
  value: MemberRegistration,
) {
  const update = buildBusinessInfoUpdateStatement(
    {
      registrationOwner: 'member-registration',
      root: { [MEMBER_REGISTRATION_KEY]: value },
    },
    target,
  )!;
  await m.query(
    update.sql,
    update.params.map((v, i) =>
      i === update.params.length - 1 ? v : privateRegistrationValue(v),
    ),
  );
}
export async function readRegistration(
  m: Exec,
  target: string,
): Promise<MemberRegistration | null> {
  const [row] = await m.query(
    `SELECT ${REGISTRATION_SQL} AS registration FROM users u WHERE id=$1`,
    [target],
  );
  const r = row?.registration;
  if (
    !r ||
    !['pending', 'approved', 'rejected'].includes(r.state) ||
    !validateStored(r)
  )
    return null;
  return r as MemberRegistration;
}
/** Current owner relation, rather than supplier.user_id, is the business authority. */
export async function readRegistrationBusiness(
  m: Exec,
  target: string,
  type: string,
  lock = false,
) {
  if (type !== 'supplier' && type !== 'pharmacy_owner') return null;
  const table =
    type === 'supplier' ? 'neture_suppliers' : 'neture_pharmacy_memberships';
  const applicant = type === 'supplier' ? '' : 'AND n.applicant_user_id=$1';
  const rows = await m.query(
    `SELECT n.*,row_to_json(o) AS organization,
    md5(to_jsonb(n)::text||to_jsonb(o)::text) AS registration_business_version
    FROM ${table} n JOIN organizations o ON o.id=n.organization_id
    JOIN organization_members om ON om.organization_id=o.id AND om.user_id=$1 AND om.role='owner' AND om.left_at IS NULL
    WHERE o.type='${type === 'supplier' ? 'supplier' : 'pharmacy'}' ${applicant} ORDER BY n.id LIMIT 2 ${lock ? 'FOR UPDATE OF n,o,om' : ''}`,
    [target],
  );
  if (rows.length > 1)
    throw new OperationError(
      409,
      'BUSINESS_SELECTION_REQUIRED',
      '연결된 사업체가 여러 개입니다. 해당 사업체 관리에서 수정해 주세요.',
    );
  return rows[0] ?? null;
}
/** Legacy compatibility is read-only. Approved profiles always read the live domain records. */
export async function readRegistrationView(
  m: Exec,
  target: string,
): Promise<MemberRegistration | null> {
  const stored = await readRegistration(m, target);
  const [qualification] = await m.query(
    `SELECT *,to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') AS registration_version FROM kpa_pharmacist_profiles WHERE user_id=$1`,
    [target],
  );
  if (stored && stored.state !== 'approved')
    return {
      ...stored,
      qualificationVersion: qualification?.registration_version ?? null,
    };
  const pharmacy =
    !stored || stored.type === 'pharmacy_owner'
      ? await readRegistrationBusiness(m, target, 'pharmacy_owner')
      : null;
  const supplier =
    !stored || stored.type === 'supplier'
      ? await readRegistrationBusiness(m, target, 'supplier')
      : null;
  const type =
    stored?.type ??
    (pharmacy
      ? 'pharmacy_owner'
      : supplier
        ? 'supplier'
        : qualification?.license_number
          ? 'pharmacist'
          : null);
  if (!type) return null;
  if (stored && ['other', 'partner'].includes(type)) return stored;
  const source = type === 'pharmacy_owner' ? pharmacy : supplier;
  if (stored && ['supplier', 'pharmacy_owner'].includes(type) && !source)
    return {
      ...stored,
      businessEditable: false,
      businessVersion: null,
      qualificationVersion: qualification?.registration_version ?? null,
    };
  const [user] = await m.query(
    'SELECT "businessInfo" AS business FROM users WHERE id=$1',
    [target],
  );
  const b =
    user?.business && typeof user.business === 'object' ? user.business : {};
  const org = source?.organization ?? {},
    profile = org.metadata?.businessProfile ?? {},
    addressDetail = org.address_detail ?? {};
  const values: MemberRegistrationFields = {
    licenseNumber:
      qualification?.license_number ??
      pharmacy?.pharmacist_license_number ??
      b.licenseNumber,
    businessName: org.name ?? b.businessName,
    businessNumber: org.business_number ?? b.businessNumber,
    representativeName: supplier
      ? (supplier.representative_name ?? '')
      : (profile.representativeName ?? b.representativeName ?? b.ceoName),
    businessType: supplier
      ? (supplier.business_type ?? '')
      : (profile.businessType ?? b.businessType),
    businessItem: supplier
      ? (supplier.business_item ?? '')
      : (profile.businessItem ?? profile.businessCategory ?? b.businessItem),
    businessEntityType: profile.businessEntityType ?? b.businessEntityType,
    businessStartDate: profile.businessStartDate ?? b.businessStartDate,
    zipCode: addressDetail.zipCode ?? b.storeAddress?.zipCode,
    address: org.address ?? b.address,
    addressDetail: addressDetail.detailAddress ?? b.address2,
    businessPhone: org.phone ?? b.businessPhone,
    contactName: supplier
      ? (supplier.manager_name ?? '')
      : (org.metadata?.contactName ?? b.contactName),
    contactPhone: supplier
      ? (supplier.manager_phone ?? '')
      : (org.metadata?.managerPhone ?? b.managerPhone),
    contactEmail: supplier
      ? (supplier.contact_email ?? '')
      : (org.metadata?.contactEmail ?? b.contactEmail),
    managerEmail: profile.managerEmail,
    taxInvoiceEmail: supplier
      ? (supplier.tax_invoice_email ?? '')
      : (org.metadata?.taxInvoiceEmail ?? b.taxInvoiceEmail),
    businessRegistrationDocumentId: supplier
      ? (supplier.business_registration_document_id ?? '')
      : profile.businessRegistrationDocumentId,
  };
  const fields: MemberRegistrationFields = {};
  for (const key of registrationFieldKeys(type))
    if (typeof values[key] === 'string') fields[key] = values[key];
  const state =
    stored?.state ??
    (pharmacy
      ? pharmacy.status === 'active' &&
        qualification?.qualification_status === 'approved'
        ? 'approved'
        : pharmacy.status === 'rejected'
          ? 'rejected'
          : 'pending'
      : supplier
        ? supplier.status === 'ACTIVE'
          ? 'approved'
          : supplier.status === 'REJECTED'
            ? 'rejected'
            : 'pending'
        : qualification.qualification_status === 'approved'
          ? 'approved'
          : qualification.qualification_status === 'rejected'
            ? 'rejected'
            : 'pending');
  return {
    ...stored,
    type,
    fields,
    state,
    qualificationVersion: qualification?.registration_version ?? null,
    ...(['supplier', 'pharmacy_owner'].includes(type)
      ? {
          businessEditable: true,
          businessVersion: source?.registration_business_version ?? null,
        }
      : {}),
  };
}
function validateStored(value: unknown) {
  try {
    const v = value as MemberRegistration;
    validateRegistration({ type: v.type, fields: v.fields });
    return true;
  } catch {
    return false;
  }
}
export async function assertRegistrationDocument(
  m: Exec,
  target: string,
  fields: MemberRegistrationFields,
) {
  const id = fields.businessRegistrationDocumentId;
  if (!id) return;
  const rows = await m.query(
    `SELECT d.id FROM kyc_documents d WHERE d.id=$2 AND d."documentType"='business_registration' AND
    ((d.user_id=$1 AND NOT EXISTS(SELECT 1 FROM organizations o WHERE o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text))
    OR EXISTS(SELECT 1 FROM organizations o JOIN organization_members om ON om.organization_id=o.id WHERE
      o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text AND om.user_id=$1 AND om.role='owner' AND om.left_at IS NULL))`,
    [target, id],
  );
  if (!rows.length)
    throw new OperationError(
      403,
      'REGISTRATION_DOCUMENT_FORBIDDEN',
      '이 회원의 사업자등록증을 선택해 주세요.',
    );
}
export async function correctRegistration(
  m: Exec,
  target: string,
  input: MemberRegistrationInput,
) {
  const value = validateRegistration(input);
  await assertRegistrationDocument(m, target, value.fields);
  const prior = await readRegistrationView(m, target);
  if (prior?.state === 'approved' && prior.type !== value.type)
    throw new OperationError(
      409,
      'REGISTRATION_TYPE_ALREADY_APPROVED',
      '추가 자격은 My Home의 해당 절차로 처리해 주세요.',
    );
  const [legacy] = prior
    ? []
    : await m.query(
        `SELECT "businessInfo"::jsonb ? '${MEMBER_REGISTRATION_KEY}' AS marked,
    "isActive" AS active,"isEmailVerified" AS verified,status FROM users WHERE id=$1`,
        [target],
      );
  const generalAlreadyActive =
    value.type === 'other' &&
    legacy?.marked !== true &&
    legacy?.active === true &&
    legacy?.verified === true &&
    ['active', 'approved'].includes(legacy?.status);
  const next = {
    ...value,
    state: prior?.state ?? (generalAlreadyActive ? 'approved' : 'pending'),
    ...(prior?.type === value.type && prior.requestId
      ? { requestId: prior.requestId }
      : {}),
    ...(prior?.reviewedAt
      ? { reviewedAt: prior.reviewedAt, reviewedBy: prior.reviewedBy }
      : {}),
  } as MemberRegistration;
  await writeRegistration(m, target, next);
  return next;
}
