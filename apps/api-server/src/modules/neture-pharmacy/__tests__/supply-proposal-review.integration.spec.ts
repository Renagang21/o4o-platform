import { randomUUID } from 'crypto';
import { createCarePharmReviewDb } from '../../../__tests__/support/carepharm-review-db.js';
import { SupplyProposalService } from '../services/supply-proposal.service.js';
import type { SemiFranchiseRow } from '../services/semi-franchise.service.js';
const local = process.env.CAREPHARM_REVIEW_DATABASE_URL ? describe : describe.skip;
local('Supply proposal review information — isolated real PostgreSQL', () => {
  let fixture: Awaited<ReturnType<typeof createCarePharmReviewDb>>;
  let service: SupplyProposalService;
  const supplier = randomUUID(), otherSupplier = randomUUID(), care = randomUUID(), other = randomUUID(), offer = randomUUID(), master = randomUUID(), proposal = randomUUID();
  beforeAll(async () => {
    fixture = await createCarePharmReviewDb(); service = new SupplyProposalService(fixture.ds);
    await fixture.ds.query(`CREATE TABLE organizations(id uuid, name text);
      CREATE TABLE neture_suppliers(id uuid, slug text, organization_id uuid, base_shipping_fee integer, free_shipping_threshold integer);
      CREATE TABLE product_masters(id uuid, name text, specification text, manufacturer_name text, barcode text);
      CREATE TABLE supplier_product_offers(id uuid, master_id uuid, supplier_id uuid, price_general integer, business_short_description text, business_detail_description text);
      CREATE TABLE semi_franchises(id uuid, key text, name text);
      CREATE TABLE supply_proposals(id uuid, offer_id uuid, semi_franchise_id uuid, target_organization_id uuid, status text, unit_price integer, note text, reason text, created_at timestamp DEFAULT now(), decided_at timestamp, ended_at timestamp);`);
    await fixture.ds.query("INSERT INTO neture_suppliers VALUES ($1,'synthetic-supplier',null,3000,50000),($2,'another',null,0,0)", [supplier,otherSupplier]);
    await fixture.ds.query("INSERT INTO product_masters VALUES ($1,'Synthetic product','30 units','Synthetic manufacturer','SYNTHETIC')", [master]);
    await fixture.ds.query("INSERT INTO supplier_product_offers VALUES ($1,$2,$3,12000,'B2B summary','<p>B2B details</p>')", [offer,master,supplier]);
    await fixture.ds.query("INSERT INTO semi_franchises VALUES ($1,'carepharm','CarePharm'),($2,'other','Other')", [care,other]);
    await fixture.ds.query("INSERT INTO supply_proposals(id,offer_id,semi_franchise_id,status,unit_price) VALUES ($1,$2,$3,'pending',9000),($4,$2,$5,'pending',8000)", [proposal,offer,care,randomUUID(),other]);
  });
  afterAll(async () => { if (fixture) await fixture.close(); });
  it('returns reviewable product details and supplier conditions within the selected business only', async () => {
    const rows = await service.operatorList({ id: care } as SemiFranchiseRow, 'pending');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: proposal, semiFranchiseKey: 'carepharm', unitPrice: 9000, priceGeneral: 12000, productSpecification: '30 units', productManufacturer: 'Synthetic manufacturer', productBarcode: 'SYNTHETIC', productSummary: 'B2B summary', productDescription: '<p>B2B details</p>', baseShippingFee: 3000, freeShippingThreshold: 50000 });
  });
  it('preserves supplier ownership scope and status filters with the extended projection', async () => {
    expect(await service.supplierList(otherSupplier)).toEqual([]);
    expect(await service.supplierList(supplier)).toHaveLength(2);
    expect(await service.operatorList({ id: care } as SemiFranchiseRow, 'approved')).toEqual([]);
  });
});
