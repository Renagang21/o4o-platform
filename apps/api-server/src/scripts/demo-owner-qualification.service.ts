/** Explicit synthetic Demo repair. Dry-run first; no credentials, role, identity or staff writes. */
import { createHash } from 'node:crypto';
import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';
import { recordOperation } from '../services/operations/operation-audit.js';
import type { DemoQueryClient } from './demo-account-reconcile.service.js';

const fail = (code: string): never => { throw new Error(code); };
export async function runDemoOwnerQualification(client: DemoQueryClient, options: {
  apply?: boolean; expectedDigest?: string; reviewerId?: string;
} = {}) {
  const apply = options.apply === true;
  if (apply && !/^[a-f0-9]{64}$/.test(options.expectedDigest ?? '')) fail('EXACT_PLAN_DIGEST_REQUIRED');
  if (apply && !options.reviewerId) fail('ADMIN_REVIEWER_REQUIRED');
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  let committed = false;
  try {
    await client.query("SET LOCAL statement_timeout='20s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    if (apply) await client.query("SELECT pg_advisory_xact_lock(hashtext('demo-owner-qualification-v1'))");
    const registry = await client.query(`SELECT d.user_id,u.email,u.status,u."isActive",u."isEmailVerified"
      FROM demo_accounts d JOIN users u ON u.id=d.user_id WHERE d.is_active AND d.demo_type='STORE_OWNER'
      ORDER BY d.user_id ${apply ? 'FOR UPDATE OF d,u' : ''}`);
    const owner = registry[0];
    if (registry.length !== 1 || owner.email !== PUBLIC_DEMO_ACCOUNTS.find(account => account.type === 'STORE_OWNER')?.email)
      fail('AMBIGUOUS_OWNER_DEMO');
    if (!owner.isActive || !owner.isEmailVerified || !['active', 'approved'].includes(String(owner.status))) fail('OWNER_NOT_ACTIVE');
    if (!(await client.query("SELECT 1 FROM service_memberships WHERE user_id=$1 AND service_key='neture' AND status='active'", [owner.user_id])).length) fail('MAIN_MEMBERSHIP_REQUIRED');
    const pharmacies = await client.query(`SELECT pm.id,pm.organization_id,pm.pharmacist_license_number,pm.business_number,
      o.address,o.phone,o.business_number AS org_business_number,o.address AS org_address,o.phone AS org_phone
      FROM neture_pharmacy_memberships pm JOIN organizations o ON o.id=pm.organization_id AND o.type='pharmacy'
      JOIN organization_members om ON om.organization_id=o.id AND om.user_id=pm.applicant_user_id AND om.role='owner' AND om.left_at IS NULL
      WHERE pm.applicant_user_id=$1 AND pm.status='active' ORDER BY pm.id ${apply ? 'FOR UPDATE OF pm,o,om' : ''}`, [owner.user_id]);
    if (pharmacies.length !== 1) fail('AMBIGUOUS_APPROVED_DEMO_PHARMACY');
    const pharmacy = pharmacies[0], license = String(pharmacy.pharmacist_license_number ?? '').trim();
    if (!license || !pharmacy.business_number) fail('DEMO_BUSINESS_FIELDS_REQUIRED');
    const profiles = await client.query(`SELECT * FROM kpa_pharmacist_profiles WHERE user_id=$1 ${apply ? 'FOR UPDATE' : ''}`, [owner.user_id]);
    const profile = profiles[0];
    const ready = profile?.qualification_status === 'approved' && profile.license_verified === true && profile.verified_at && profile.verified_by && String(profile.license_number).trim() === license;
    if (profile && !ready && profile.qualification_status !== 'unrequested') fail('EXISTING_QUALIFICATION_REQUIRES_REVIEW');
    const duplicates = await client.query(`SELECT user_id FROM kpa_pharmacist_profiles WHERE user_id<>$1 AND BTRIM(license_number)=$2 AND qualification_status='approved' AND license_verified=true`, [owner.user_id, license]);
    if (duplicates.length) fail('LICENSE_ALREADY_APPROVED');
    const digest = createHash('sha256').update(JSON.stringify({ operation: 'demo-owner-qualification-v1', registry, pharmacies, profiles })).digest('hex');
    const summary = { operation: 'demo-owner-qualification-v1', mode: apply ? 'apply' : 'plan', digest,
      qualification: ready ? 'preserve' : 'prepare-synthetic', existingBusinessIdentityPreserved: true,
      fillBusinessFields: ['business_number', 'address', 'phone'].filter(key => !pharmacy[`org_${key}`] && pharmacy[key]) };
    if (!apply) return summary;
    if (digest !== options.expectedDigest) fail('PLAN_CHANGED');
    const reviewers = await client.query(`SELECT u.id FROM users u WHERE u.id=$1 AND u."isActive" AND u.status IN ('active','approved')
      AND EXISTS(SELECT 1 FROM role_assignments r WHERE r.user_id=u.id AND r.role='platform:super_admin' AND r.is_active
        AND r.valid_from<=now() AND (r.valid_until IS NULL OR r.valid_until>=now()))`, [options.reviewerId]);
    if (reviewers.length !== 1) fail('ADMIN_REVIEWER_REQUIRED');
    if (!ready) await client.query(`INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,qualification_status,verified_at,verified_by,qualification_reason)
      VALUES($1,$2,true,'approved',now(),$3,'Synthetic Demo fixture only; no real professional licence was verified.')
      ON CONFLICT(user_id) DO UPDATE SET license_number=$2,license_verified=true,qualification_status='approved',verified_at=now(),verified_by=$3,
      qualification_reason='Synthetic Demo fixture only; no real professional licence was verified.',updated_at=clock_timestamp()`, [owner.user_id, license, options.reviewerId]);
    if (summary.fillBusinessFields.length) await client.query(`UPDATE organizations SET business_number=COALESCE(NULLIF(business_number,''),$2),
      address=COALESCE(NULLIF(address,''),$3),phone=COALESCE(NULLIF(phone,''),$4),"updatedAt"=clock_timestamp() WHERE id=$1`,
      [pharmacy.organization_id, pharmacy.business_number, pharmacy.address, pharmacy.phone]);
    if (!ready || summary.fillBusinessFields.length) await recordOperation(client, 'neture', options.reviewerId!, 'member.demo_qualification_prepared',
      { targetUserId: owner.user_id, reason: 'Synthetic Demo fixture consistency; no real licence review', qualificationChanged: !ready, filledFields: summary.fillBusinessFields });
    await client.query('COMMIT'); committed = true;
    return summary;
  } finally { if (!committed) await client.query('ROLLBACK'); }
}
