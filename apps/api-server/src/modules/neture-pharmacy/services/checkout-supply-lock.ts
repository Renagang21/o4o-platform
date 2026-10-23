import type { EntityManager } from 'typeorm';
import type { SupplyKind } from '../constants.js';
import type { SupplyOption } from './supply-access.js';

const SOURCE: Record<SupplyKind, string> = {
  default: 'supplier_product_offers', proposal: 'supply_proposals',
  event: 'organization_product_listings', recruitment: 'seller_recruitments',
};

/** Hold eligibility rows until the order and cart removal commit. Revalidation follows these locks. */
export async function lockCheckoutSupply(m: EntityManager, organizationId: string, options: SupplyOption[]) {
  // Lifecycle: supplier → listings; master merge: masters → offers; rejection: offers → listings.
  // Keep each row class ordered and avoid a planner-dependent multi-table lock order.
  for (const id of [...new Set(options.map(o => o.supplierId))].sort((a, b) => a.localeCompare(b, 'en'))) {
    await m.query('SELECT id FROM neture_suppliers WHERE id=$1 FOR SHARE', [id]);
  }
  for (const id of [...new Set(options.map(o => o.masterId))].sort((a, b) => a.localeCompare(b, 'en'))) {
    await m.query('SELECT id FROM product_masters WHERE id=$1 FOR SHARE', [id]);
  }
  for (const id of [...new Set(options.map(o => o.offerId))].sort((a, b) => a.localeCompare(b, 'en'))) {
    await m.query('SELECT id FROM supplier_product_offers WHERE id=$1 FOR SHARE', [id]);
  }
  const refs = [...new Map(options.map(o => [`${o.kind}:${o.optionId}`, o])).values()]
    .sort((a, b) => `${a.kind}:${a.optionId}`.localeCompare(`${b.kind}:${b.optionId}`, 'en'));
  const keys = [...new Set(options.map(o => o.semiFranchiseKey).filter((key): key is string => !!key))].sort((a,b)=>a.localeCompare(b,'en'));
  for (const key of keys) await m.query('SELECT id FROM semi_franchises WHERE key=$1 FOR SHARE', [key]);
  await m.query('SELECT organization_id FROM semi_franchise_memberships WHERE organization_id=$1 ORDER BY semi_franchise_id FOR SHARE', [organizationId]);
  for (const o of refs) {
    // Reservation updates event quantities; avoid shared-to-exclusive lock upgrades.
    const lock = o.kind === 'event' ? 'UPDATE' : 'SHARE';
    await m.query(`SELECT id FROM ${SOURCE[o.kind]} WHERE id=$1 FOR ${lock}`, [o.optionId]);
  }
  for (const o of refs.filter(o => o.kind === 'recruitment')) await m.query(`SELECT recruitment_id FROM seller_recruitment_applications
    WHERE recruitment_id=$1 AND applicant_organization_id=$2 FOR SHARE`, [o.optionId, organizationId]);
}
