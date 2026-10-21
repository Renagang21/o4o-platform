import { randomUUID } from 'crypto';
import { createCarePharmReviewDb } from '../../../__tests__/support/carepharm-review-db.js';
import { getSupplyOption, listSupplyOptions } from '../services/supply-access.js';
import { SemiFranchiseRecruitmentService } from '../services/semi-franchise-recruitment.service.js';
import { PharmacyCartService, type OrderCreator } from '../services/pharmacy-cart.service.js';
import { createStoreLibraryFeedController } from '../../../routes/o4o-store/controllers/store-library-feed.controller.js';

const store = randomUUID(), otherStore = randomUUID(), actor = randomUUID(), supplier = randomUUID(), supplierUser = randomUUID();
const business = randomUUID(), offer = randomUUID(), master = randomUUID(), publicRecruitment = randomUUID(), businessRecruitment = randomUUID();
jest.mock('../../../routes/o4o-store/controllers/kpa-content-organization.js', () => ({
  readContentUserId: () => actor,
  resolveKpaContentOrganization: async () => store,
}));
const local = process.env.CAREPHARM_REVIEW_DATABASE_URL ? describe : describe.skip;

local('Store cooperation — actual local SQL, fixture actor and order creator', () => {
  let fixture: Awaited<ReturnType<typeof createCarePharmReviewDb>>;
  let cart: PharmacyCartService;
  const created: Parameters<OrderCreator>[0][] = [];
  beforeAll(async () => {
    fixture = await createCarePharmReviewDb();
    await fixture.ds.query(`
      CREATE TABLE organizations(id uuid PRIMARY KEY, name text, phone text, address text, address_detail jsonb);
      CREATE TABLE semi_franchises(id uuid PRIMARY KEY, key text, name text, organization_id uuid, status text, payment_receiver_key text);
      CREATE TABLE semi_franchise_memberships(semi_franchise_id uuid, organization_id uuid, status text);
      CREATE TABLE product_masters(id uuid PRIMARY KEY, name text, status text);
      CREATE TABLE neture_suppliers(id uuid PRIMARY KEY, slug text, organization_id uuid, user_id uuid, status text, base_shipping_fee int, free_shipping_threshold int);
      CREATE TABLE supplier_product_offers(id uuid PRIMARY KEY, master_id uuid, supplier_id uuid, price_general int, service_keys text[], default_supply_enabled boolean,
        track_inventory boolean, stock_quantity int, reserved_quantity int, is_active boolean, deleted_at timestamp, approval_status text);
      CREATE TABLE supply_proposals(id uuid PRIMARY KEY, offer_id uuid, semi_franchise_id uuid, status text, unit_price int, target_organization_id uuid, note text, terms_snapshot jsonb);
      CREATE TABLE organization_product_listings(id uuid PRIMARY KEY, offer_id uuid, organization_id uuid, event_price int, start_at timestamp, end_at timestamp,
        total_quantity int, per_store_limit int, per_order_limit int, service_key text, source_type text, status text, is_active boolean);
      CREATE TABLE seller_recruitments(id uuid PRIMARY KEY, product_id text, product_name text, seller_id text, seller_name text, semi_franchise_id uuid,
        supply_unit_price int, consumer_price int, exposure_status text, status text, service_id text, created_at timestamp DEFAULT now());
      CREATE TABLE seller_recruitment_applications(id uuid DEFAULT gen_random_uuid(), recruitment_id uuid, applicant_organization_id uuid, status text);
      CREATE TABLE store_cart_items(id uuid DEFAULT gen_random_uuid(), buyer_id uuid, organization_id uuid, service_key text, source_type text, supplier_id uuid,
        supplier_product_offer_id uuid, supply_proposal_id uuid, event_offer_id uuid, seller_recruitment_id uuid, organization_product_listing_id uuid, product_name text, quantity int,
        product_master_id uuid, pricing_source text, price_snapshot int, created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now());
      CREATE TABLE o4o_asset_snapshots(id uuid PRIMARY KEY, organization_id uuid, source_service text, asset_type text, title text, content_json jsonb, tags jsonb DEFAULT '[]', created_at timestamp DEFAULT now());
      CREATE TABLE kpa_store_asset_controls(snapshot_id uuid, organization_id uuid, publish_status text, lifecycle_status text);
      CREATE TABLE kpa_store_contents(id uuid PRIMARY KEY, organization_id uuid, snapshot_id uuid, source_type text, title text, content_json jsonb, tags jsonb DEFAULT '[]', created_at timestamp DEFAULT now(), source_metadata jsonb);
      CREATE TABLE store_execution_assets(id uuid PRIMARY KEY, organization_id uuid, asset_type text, is_active boolean, title text, html_content text, description text, category text, tags jsonb, created_at timestamp);
    `);
    cart = new PharmacyCartService(fixture.ds, { reserveEventOfferListing: jest.fn(), incrementListingQuantity: jest.fn() }, async input => {
      created.push(input); return { id: randomUUID(), orderNumber: 'FIXTURE', totalAmount: input.items.reduce((sum, item) => sum + item.subtotal, 0) + (input.shippingFeeSnapshot ?? 0) } as Awaited<ReturnType<OrderCreator>>;
    });
  });
  beforeEach(async () => {
    created.length = 0;
    await fixture.ds.query(`TRUNCATE organizations, semi_franchises, semi_franchise_memberships, product_masters, neture_suppliers,
      supplier_product_offers, supply_proposals, organization_product_listings, seller_recruitments, seller_recruitment_applications,
      store_cart_items, o4o_asset_snapshots, kpa_store_asset_controls, kpa_store_contents, store_execution_assets`);
    await fixture.ds.query(`INSERT INTO organizations(id,name) VALUES($1,'Store fixture'),($2,'Other store');
      `, [store, otherStore]);
    await fixture.ds.query("INSERT INTO semi_franchises VALUES($1,'carepharm','Care fixture',$2,'active','receiver-care')", [business, business]);
    await fixture.ds.query("INSERT INTO semi_franchise_memberships VALUES($1,$2,'active')", [business,store]);
    await fixture.ds.query("INSERT INTO product_masters VALUES($1,'Product fixture','ACTIVE')", [master]);
    await fixture.ds.query("INSERT INTO neture_suppliers VALUES($1,'supplier-fixture',null,$2,'ACTIVE',1000,10000)", [supplier,supplierUser]);
    await fixture.ds.query("INSERT INTO supplier_product_offers VALUES($1,$2,$3,9000,'{}',false,false,100,0,true,null,'APPROVED')", [offer,master,supplier]);
    for (const [id,sf,price] of [[publicRecruitment,null,2500],[businessRecruitment,business,3500]]) {
      await fixture.ds.query("INSERT INTO seller_recruitments(id,product_id,product_name,seller_id,seller_name,semi_franchise_id,supply_unit_price,consumer_price,exposure_status,status,service_id) VALUES($1,$2,'Product fixture',$3,'Supplier fixture',$4,$5,0,'approved','recruiting','neture')", [id,master,supplierUser,sf,price]);
      await fixture.ds.query("INSERT INTO seller_recruitment_applications(recruitment_id,applicant_organization_id,status) VALUES($1,$2,'approved')", [id,store]);
    }
  });
  afterAll(async () => { if (fixture) await fixture.close(); });

  it('keeps business and public filters independent of kind and applies identical pagination counts', async () => {
    const all = await listSupplyOptions(fixture.ds,store,{ source:'recruitment',limit:1 });
    expect(all.total).toBe(2); expect(all.items).toHaveLength(1);
    const own = await listSupplyOptions(fixture.ds,store,{ source:'recruitment',business:'carepharm' });
    expect(own.total).toBe(1); expect(own.items[0].optionId).toBe(businessRecruitment);
    const direct = await listSupplyOptions(fixture.ds,store,{ business:'__public__',recruitment:publicRecruitment });
    expect(direct.total).toBe(1); expect(direct.items[0]).toMatchObject({ semiFranchiseKey:null,unitPrice:2500,paymentReceiverKey:null });
    expect((await listSupplyOptions(fixture.ds,otherStore)).total).toBe(0);
  });
  it('public approved recruitment uses its explicit price and supplier shipping through the existing cart', async () => {
    await cart.add(actor,store,{kind:'recruitment',id:publicRecruitment,quantity:2});
    expect(await cart.list(actor,otherStore)).toEqual([]);
    const result = await cart.checkout(actor,store);
    expect(result.failedItems).toEqual([]); expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ supplierId:supplier,sellerOrganizationId:store,shippingFeeSnapshot:1000,
      items:[{ unitPrice:2500,quantity:2,metadata:{supplyKind:'recruitment',semiFranchiseKey:null,sellerRecruitmentId:publicRecruitment} }],
      metadata:{receiverDetermined:false,fulfillmentVisibility:'hidden_until_paid'} });
    expect(await cart.list(actor,store)).toEqual([]);
  });
  it.each(['pending','cancelled','rejected'])('an application changed to %s is unavailable at checkout', async status => {
    await cart.add(actor,store,{kind:'recruitment',id:publicRecruitment});
    await fixture.ds.query('UPDATE seller_recruitment_applications SET status=$1 WHERE recruitment_id=$2',[status,publicRecruitment]);
    const result = await cart.checkout(actor,store);
    expect(result.failedItems[0].code).toBe('SUPPLY_OPTION_NOT_AVAILABLE'); expect(created).toHaveLength(0);
  });
  it('never substitutes a general price or grants a missing business membership', async () => {
    await fixture.ds.query('UPDATE seller_recruitments SET supply_unit_price=null WHERE id=$1',[publicRecruitment]);
    expect(await getSupplyOption(fixture.ds,store,'recruitment',publicRecruitment)).toBeNull();
    await fixture.ds.query("UPDATE semi_franchise_memberships SET status='suspended'");
    expect(await getSupplyOption(fixture.ds,store,'recruitment',businessRecruitment)).toBeNull();
    const rows = await new SemiFranchiseRecruitmentService(fixture.ds).pharmacyBrowse(store);
    expect(rows.find((row: {id:string})=>row.id===publicRecruitment)?.orderable).toBe(false);
  });
  it('does not reinterpret legacy untargeted pharmacy recruitment as public supply', async () => {
    await fixture.ds.query("UPDATE seller_recruitments SET service_id='kpa-society' WHERE id=$1",[publicRecruitment]);
    expect(await getSupplyOption(fixture.ds,store,'recruitment',publicRecruitment)).toBeNull();
    expect((await listSupplyOptions(fixture.ds,store,{business:'__public__'})).total).toBe(0);
  });
  it('closed recruitment, inactive supplier and deleted offers are rejected by the same availability query', async () => {
    for (const sql of ["UPDATE seller_recruitments SET status='closed'", "UPDATE neture_suppliers SET status='INACTIVE'", 'UPDATE supplier_product_offers SET deleted_at=now()']) {
      await fixture.ds.query(sql); expect(await getSupplyOption(fixture.ds,store,'recruitment',publicRecruitment)).toBeNull();
      await fixture.ds.query("UPDATE seller_recruitments SET status='recruiting'; UPDATE neture_suppliers SET status='ACTIVE'; UPDATE supplier_product_offers SET deleted_at=null");
    }
  });
  it('retains snapshot business provenance after edits and membership loss, without leaking other stores', async () => {
    const snapshot = randomUUID();
    await fixture.ds.query("INSERT INTO o4o_asset_snapshots(id,organization_id,source_service,asset_type,title,content_json) VALUES($1,$2,'semi-franchise','content','Original title',$3)", [snapshot,store,{semiFranchiseKey:'carepharm',semiFranchiseName:'Care fixture',body:'original',tags:['Fixture']}]);
    await fixture.ds.query("INSERT INTO kpa_store_contents(id,organization_id,snapshot_id,source_type,title,content_json) VALUES($1,$2,$3,'snapshot_edit','Edited title',$4)",[randomUUID(),store,snapshot,{semiFranchiseKey:'other',body:'edited'}]);
    await fixture.ds.query("INSERT INTO o4o_asset_snapshots(id,organization_id,source_service,asset_type,title,content_json) VALUES($1,$2,'semi-franchise','content','Foreign copy',$3)",[randomUUID(),otherStore,{semiFranchiseKey:'carepharm'}]);
    await fixture.ds.query('DELETE FROM semi_franchise_memberships');
    const router = createStoreLibraryFeedController(fixture.ds, (_req,_res,next)=>next());
    const handler = (router as any).stack.find((entry:any)=>entry.route?.path==='/contents').route.stack.at(-1).handle;
    const response = { json:jest.fn(),status:jest.fn().mockReturnThis() };
    await handler({query:{business:'carepharm',search:'Original',source:'franchise',tag:'Fixture',page:'1',limit:'20'},get:()=>null},response);
    expect(response.json.mock.calls[0][0]).toMatchObject({success:true,data:{total:1,items:[{title:'Edited title',sourceBusinessKey:'carepharm',sourceName:'Care fixture'}]}});
  });
});
