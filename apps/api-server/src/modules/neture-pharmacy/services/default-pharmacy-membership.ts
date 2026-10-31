import type { EntityManager } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import { recordOperation } from '../../../services/operations/operation-audit.js';

/** The caller must hold the approved pharmacy ledger lock in the same transaction.
 * Pharmacy is the default business; this is not consent to other business terms.
 */
export async function connectDefaultPharmacyMembership(
  manager: Pick<EntityManager, 'query'>,
  input: { organizationId: string; applicantId: string; approvedBy: string | null; actorId: string },
): Promise<{ id: string; status: string }> {
  const [business] = await manager.query(
    "SELECT id,status FROM semi_franchises WHERE key='pharmacy' FOR SHARE",
  );
  if (!business || business.status !== 'active')
    throw new NeturePharmacyError(409, 'DEFAULT_PHARMACY_UNAVAILABLE', 'Pharmacy 회원 연결을 준비하고 있습니다. 운영자에게 문의해 주세요.');

  // The unique key also serializes older clients using the independent apply path.
  const [created] = await manager.query(
    `INSERT INTO semi_franchise_memberships
      (semi_franchise_id,organization_id,status,applied_by,decided_by,decided_at,reason)
     VALUES($1,$2,'active',$3,$4,NOW(),'약국 승인에 따른 Pharmacy 기본 회원 연결')
     ON CONFLICT (semi_franchise_id,organization_id) DO NOTHING RETURNING id,status`,
    [business.id, input.organizationId, input.applicantId, input.approvedBy],
  );
  let result = created;
  let previousStatus: string | null = null;
  if (!result) {
    const [existing] = await manager.query(
      'SELECT id,status FROM semi_franchise_memberships WHERE semi_franchise_id=$1 AND organization_id=$2 FOR UPDATE',
      [business.id, input.organizationId],
    );
    // Existing rejection, suspension and withdrawal remain authoritative.
    if (existing.status !== 'pending') return existing;
    previousStatus = existing.status;
    [result] = await manager.query(
      `UPDATE semi_franchise_memberships SET status='active',decided_by=$2,decided_at=NOW(),
       reason='약국 승인에 따른 Pharmacy 기본 회원 연결',updated_at=NOW()
       WHERE id=$1 RETURNING id,status`,
      [existing.id, input.approvedBy],
    );
  }
  await recordOperation(manager, 'neture', input.actorId, 'pharmacy.default_membership.connect', {
    organizationId: input.organizationId, businessId: business.id, membershipId: result.id,
    previousStatus, approvedBy: input.approvedBy,
  });
  return result;
}
