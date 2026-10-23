import type { EntityManager } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import { assertNetureMainMembershipActive } from '../../neture/services/neture-main-membership.js';
import { PolicyAcceptanceService } from '../../policy-acceptance/policy-acceptance.service.js';

type Executor = Pick<EntityManager, 'query'>;
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

/** Recheck the middleware's owner/staff contract inside the payment transaction. */
export async function assertPaymentStoreAccess(m: Executor, actorId: string, organizationId: string) {
  if (!UUID.test(organizationId)) throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '결제할 약국을 다시 선택해 주세요.');
  // Match the publication lock before actor/FK locks, including when the first agreement is published.
  await m.query('SELECT pg_advisory_xact_lock_shared(hashtext($1))', ['service-policy:kpa-society']);
  const [actor] = await m.query(`SELECT id FROM users WHERE id=$1 AND "isActive"=true
    AND "isEmailVerified"=true AND status IN ('active','approved') FOR UPDATE`, [actorId]);
  const [pharmacy] = await m.query(`SELECT organization_id FROM neture_pharmacy_memberships
    WHERE organization_id=$1 AND status='active' FOR SHARE`, [organizationId]);
  const [member] = await m.query(`SELECT role FROM organization_members WHERE user_id=$1 AND organization_id=$2
    AND left_at IS NULL AND role IN ('owner','admin','manager','staff') FOR SHARE`, [actorId, organizationId]);
  if (!actor || !pharmacy || !member) throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '현재 약국의 이용 권한을 다시 확인해 주세요.');
  if (member.role === 'staff') {
    const [role] = await m.query(`SELECT id FROM role_assignments WHERE user_id=$1 AND role='kpa:store_member'
      AND is_active=true AND valid_from<=now() AND (valid_until IS NULL OR valid_until>=now()) FOR SHARE`, [actorId]);
    if (!role) throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '현재 약국의 직원 권한을 다시 확인해 주세요.');
  } else {
    await m.query(`SELECT user_id FROM service_memberships WHERE user_id=$1 AND service_key='neture' FOR SHARE`, [actorId]);
    await assertNetureMainMembershipActive(m, actorId);
    await assertCurrentStoreAgreement(m, actorId);
  }
}

async function assertCurrentStoreAgreement(m: Executor, actorId: string) {
  await m.query(`SELECT id FROM service_policy_documents WHERE service_key='kpa-society'
    AND document_type='store_owner_agreement' AND status='published' ORDER BY id FOR SHARE`);
  await m.query(`SELECT id FROM user_policy_acceptances WHERE user_id=$1 AND service_key='kpa-society'
    AND document_type='store_owner_agreement' ORDER BY id FOR SHARE`, [actorId]);
  // A transaction-local instance reads the canonical rules without the middleware's publication cache.
  const pending = await new PolicyAcceptanceService().getPendingStoreOwnerAgreementsForUser(actorId, 'kpa-society', m);
  if (pending.length) throw new NeturePharmacyError(428, 'STORE_OWNER_AGREEMENT_REQUIRED', '매장 이용계약을 다시 확인하고 결제를 진행해 주세요.');
}
