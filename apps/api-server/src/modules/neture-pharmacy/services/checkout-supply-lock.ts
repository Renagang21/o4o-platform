import type { EntityManager } from 'typeorm';
import type { SupplyKind } from '../constants.js';
import type { SupplyOption } from './supply-access.js';

const SOURCE: Record<SupplyKind, string> = {
  default: 'supplier_product_offers', proposal: 'supply_proposals',
  event: 'organization_product_listings', recruitment: 'seller_recruitments',
};

/** Hold eligibility rows until the order and cart removal commit. Revalidation follows these locks. */
export async function lockCheckoutSupply(m: EntityManager, organizationId: string, options: SupplyOption[]) {
  const refs = [...new Map(options.map(o => [`${o.kind}:${o.optionId}`, o])).values()]
    .sort((a, b) => `${a.kind}:${a.optionId}`.localeCompare(`${b.kind}:${b.optionId}`, 'en'));
  for (const o of refs) {
    await m.query(`SELECT id FROM ${SOURCE[o.kind]} WHERE id=$1 FOR SHARE`, [o.optionId]);
  }
  const keys = [...new Set(options.map(o => o.semiFranchiseKey).filter((key): key is string => !!key))].sort((a,b)=>a.localeCompare(b,'en'));
  for (const key of keys) await m.query('SELECT id FROM semi_franchises WHERE key=$1 FOR SHARE', [key]);
  await m.query('SELECT organization_id FROM semi_franchise_memberships WHERE organization_id=$1 ORDER BY semi_franchise_id FOR SHARE', [organizationId]);
  const offers = [...new Set(options.map(o => o.offerId))].sort((a,b)=>a.localeCompare(b,'en'));
  for (const id of offers) await m.query(`SELECT spo.id FROM supplier_product_offers spo
    JOIN neture_suppliers ns ON ns.id=spo.supplier_id JOIN product_masters pm ON pm.id=spo.master_id
    WHERE spo.id=$1 FOR SHARE OF spo,ns,pm`, [id]);
  for (const o of refs.filter(o => o.kind === 'recruitment')) await m.query(`SELECT recruitment_id FROM seller_recruitment_applications
    WHERE recruitment_id=$1 AND applicant_organization_id=$2 FOR SHARE`, [o.optionId, organizationId]);
}
