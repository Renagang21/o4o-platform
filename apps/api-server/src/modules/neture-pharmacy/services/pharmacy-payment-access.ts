import type { EntityManager } from 'typeorm';
import { NeturePharmacyError, SUPPLY_KINDS, type SupplyKind } from '../constants.js';
import { assertNetureMainMembershipActive } from '../../neture/services/neture-main-membership.js';
import { getSupplyOption } from './supply-access.js';
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

interface PaymentOrder { items: Array<{ productId?: string; metadata?: Record<string, any> }> }
const SOURCE_TABLE: Record<SupplyKind, string> = {
  default: 'supplier_product_offers', proposal: 'supply_proposals',
  event: 'organization_product_listings', recruitment: 'seller_recruitments',
};

/** Existing order prices remain snapshots. Only current authority and source availability are revalidated.
 * Lock source/membership rows so concurrent withdrawal or proposal termination cannot pass between check and payment.
 * Stock is already reserved by checkout; it must not be reserved or deducted a second time here.
 */
export async function assertPaymentSupplyAccess(m: Executor, organizationId: string, orders: PaymentOrder[]) {
  const unavailable = () => new NeturePharmacyError(409, 'PAYMENT_SUPPLY_NOT_AVAILABLE', '공급이 종료되었거나 해당 협업체의 이용 자격이 변경되었습니다. 가입 상태와 공급조건을 확인한 뒤 주문을 다시 진행해 주세요.');
  const items = orders.flatMap(order => order.items ?? []);
  if (!items.length) throw unavailable();
  const refs = items.map(item => {
    const kind = item.metadata?.supplyKind as SupplyKind;
    const id = item.metadata?.supplyOptionId;
    if (!SUPPLY_KINDS.includes(kind) || typeof id !== 'string' || !UUID.test(id)
      || typeof item.productId !== 'string' || !UUID.test(item.productId)) throw unavailable();
    return { item, kind, id };
  }).sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
  for (const ref of refs) {
    // Table names come exclusively from the fixed SupplyKind whitelist above.
    await m.query(`SELECT id FROM ${SOURCE_TABLE[ref.kind]} WHERE id=$1 FOR SHARE`, [ref.id]);
  }
  const businesses = [...new Set(refs.map(ref => ref.item.metadata?.semiFranchiseKey).filter((key): key is string => typeof key === 'string'))].sort((a, b) => a.localeCompare(b, 'en'));
  for (const key of businesses) {
    const [business] = await m.query(`SELECT id FROM semi_franchises WHERE key=$1 AND status='active' FOR SHARE`, [key]);
    if (!business) throw unavailable();
    const [membership] = await m.query(`SELECT id FROM semi_franchise_memberships WHERE semi_franchise_id=$1
      AND organization_id=$2 AND status='active' FOR SHARE`, [business.id, organizationId]);
    if (!membership) throw unavailable();
  }
  for (const id of [...new Set(refs.map(ref => ref.item.productId!))].sort((a, b) => a.localeCompare(b, 'en'))) {
    await m.query(`SELECT spo.id FROM supplier_product_offers spo
      JOIN neture_suppliers ns ON ns.id=spo.supplier_id JOIN product_masters pm ON pm.id=spo.master_id
      WHERE spo.id=$1 FOR SHARE OF spo,ns,pm`, [id]);
  }
  for (const ref of refs) {
    if (ref.kind === 'recruitment') await m.query(`SELECT id FROM seller_recruitment_applications
      WHERE recruitment_id=$1 AND applicant_organization_id=$2 FOR SHARE`, [ref.id, organizationId]);
    const option = await getSupplyOption(m, organizationId, ref.kind, ref.id);
    if (!option || option.offerId !== ref.item.productId
      || (option.semiFranchiseKey ?? null) !== (ref.item.metadata?.semiFranchiseKey ?? null)) throw unavailable();
  }
}
