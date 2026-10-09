/** Real SQL verification using only transaction-local temporary fixtures on loopback PostgreSQL. */
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { SupplierCopilotService } from '../services/supplier-copilot.service.js';
import { SemiFranchiseRecruitmentService } from '../../neture-pharmacy/services/semi-franchise-recruitment.service.js';

const url = process.env.SUPPLIER_PHASE1_IT_DATABASE_URL;
const localTests = url ? describe : describe.skip;
let database: DataSource;
localTests('Supplier phase 1 — PostgreSQL temporary fixtures', () => {
  beforeAll(async () => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(url!).hostname)) throw new Error('Loopback PostgreSQL required');
    database = new DataSource({ type: 'postgres', url, entities: [], synchronize: false });
    await database.initialize();
  });
  afterAll(async () => { if (database?.isInitialized) await database.destroy(); });

  it('counts paid orders per product and supplier, excludes unpaid/refunded orders, and compares periods', async () => {
    await database.transaction(async manager => {
      await manager.query(`CREATE TEMP TABLE product_masters(id uuid PRIMARY KEY, name text) ON COMMIT DROP;
        CREATE TEMP TABLE supplier_product_offers(id uuid PRIMARY KEY, master_id uuid, supplier_id uuid, is_active boolean) ON COMMIT DROP;
        CREATE TEMP TABLE organization_product_listings(id uuid, offer_id uuid, is_active boolean) ON COMMIT DROP;
        CREATE TEMP TABLE checkout_orders(id uuid PRIMARY KEY, "supplierId" uuid, "createdAt" timestamptz,
          "paymentStatus" text, status text, items jsonb) ON COMMIT DROP`);
      const supplier = randomUUID(), other = randomUUID();
      const masterA = randomUUID(), masterB = randomUUID(), masterC = randomUUID();
      const offerA = randomUUID(), offerB = randomUUID(), offerC = randomUUID();
      for (const [master, offer, name] of [[masterA, offerA, 'A'], [masterB, offerB, 'B'], [masterC, offerC, 'C']]) {
        await manager.query('INSERT INTO product_masters VALUES ($1, $2)', [master, name]);
        await manager.query('INSERT INTO supplier_product_offers VALUES ($1,$2,$3,true)', [offer, master, supplier]);
      }
      const insert = (owner: string, offer: string, subtotal: number, days: number, payment = 'paid', status = 'paid') =>
        manager.query(`INSERT INTO checkout_orders VALUES ($1,$2,CURRENT_DATE - $3 * INTERVAL '1 day',$4,$5,$6::jsonb)`,
          [randomUUID(), owner, days, payment, status, JSON.stringify([{ productId: offer, subtotal }])]);
      await insert(supplier, offerA, 100, 1);
      await insert(supplier, offerA, 200, 2);
      await insert(supplier, offerB, 400, 1);
      await insert(supplier, offerA, 50, 9);
      await insert(supplier, offerB, 999, 1, 'pending', 'created');
      await insert(supplier, offerA, 999, 1, 'paid', 'refunded');
      await insert(other, offerA, 999, 1);
      const service = new SupplierCopilotService(manager as unknown as DataSource);
      expect(await service.getKpiSummary(supplier)).toMatchObject({ registeredProducts: 3, recentOrders: 3 });
      expect(await service.getProductPerformance(supplier)).toEqual([
        { productId: masterB, productName: 'B', orders: 1, revenue: 400, qrScans: 0 },
        { productId: masterA, productName: 'A', orders: 3, revenue: 350, qrScans: 0 },
        { productId: masterC, productName: 'C', orders: 0, revenue: 0, qrScans: 0 },
      ]);
      expect(await service.getTrendingProducts(supplier)).toEqual(expect.arrayContaining([
        { productName: 'A', currentOrders: 2, previousOrders: 1, growthRate: 100 },
        { productName: 'B', currentOrders: 1, previousOrders: 0, growthRate: 100 },
      ]));
      await manager.query('ALTER TABLE checkout_orders RENAME COLUMN "supplierId" TO broken_column');
      await expect(service.getProductPerformance(supplier)).rejects.toThrow();
    });
  });

  it('public pending/rejected posts are visible and applicable, but targeted and legacy supply-price posts retain approval and membership gates', async () => {
    await database.transaction(async manager => {
      await manager.query(`CREATE TEMP TABLE seller_recruitments(id uuid PRIMARY KEY, product_name text, seller_name text,
        supply_unit_price int, consumer_price int, created_at timestamptz, semi_franchise_id uuid, service_id text,
        exposure_status text, status text) ON COMMIT DROP;
        CREATE TEMP TABLE semi_franchises(id uuid PRIMARY KEY, key text, name text, status text) ON COMMIT DROP;
        CREATE TEMP TABLE semi_franchise_memberships(semi_franchise_id uuid, organization_id uuid, status text) ON COMMIT DROP;
        CREATE TEMP TABLE seller_recruitment_applications(id uuid DEFAULT gen_random_uuid(), recruitment_id uuid,
          applicant_organization_id uuid, applicant_id uuid, applicant_name text, status text) ON COMMIT DROP;
        CREATE TEMP TABLE organizations(id uuid, name text) ON COMMIT DROP`);
      const org = randomUUID(), user = randomUUID(), sf = randomUUID();
      await manager.query("INSERT INTO organizations VALUES ($1,'Store')", [org]);
      await manager.query("INSERT INTO semi_franchises VALUES ($1,'pharmacy','Pharmacy','active')", [sf]);
      const ids = Array.from({ length: 6 }, () => randomUUID());
      for (const [i, target, price, exposure, status] of [
        [0, null, null, 'pending', 'recruiting'], [1, null, null, 'rejected', 'recruiting'],
        [2, sf, 100, 'approved', 'recruiting'], [3, sf, 100, 'pending', 'recruiting'],
        [4, null, 100, 'approved', 'recruiting'], [5, null, null, 'approved', 'closed'],
      ] as const) {
        await manager.query("INSERT INTO seller_recruitments VALUES ($1,'Product','Supplier',$2,200,NOW(),$3,'kpa-society',$4,$5)", [ids[i], price, target, exposure, status]);
      }
      const service = new SemiFranchiseRecruitmentService({
        query: (sql: string, params: unknown[]) => manager.query(sql, params),
        transaction: (fn: (m: typeof manager) => unknown) => fn(manager),
      } as unknown as DataSource);
      expect((await service.pharmacyBrowse(org)).map(r => r.id).sort()).toEqual(ids.slice(0, 2).sort());
      expect(await service.pharmacyApply(org, user, ids[0])).toMatchObject({ status: 'pending' });
      await expect(service.pharmacyApply(org, user, ids[0])).rejects.toMatchObject({ code: 'DUPLICATE_APPLICATION' });
      for (const id of ids.slice(2)) await expect(service.pharmacyApply(org, user, id)).rejects.toMatchObject({ code: 'RECRUITMENT_NOT_AVAILABLE' });
      await manager.query("INSERT INTO semi_franchise_memberships VALUES ($1,$2,'active')", [sf, org]);
      expect((await service.pharmacyBrowse(org)).map(r => r.id).sort()).toEqual([ids[0], ids[1], ids[2], ids[4]].sort());
      await expect(service.pharmacyApply(org, user, ids[3])).rejects.toMatchObject({ code: 'RECRUITMENT_NOT_AVAILABLE' });
      expect(await service.pharmacyApply(org, user, ids[2])).toMatchObject({ status: 'pending' });
    });
  });
});
