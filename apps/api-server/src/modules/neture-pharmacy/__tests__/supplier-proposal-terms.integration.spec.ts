import { randomUUID } from 'crypto';
import { createCarePharmReviewDb } from '../../../__tests__/support/carepharm-review-db.js';
import { AddSupplierProposalTerms1792221000000 } from '../../../database/migrations/1792221000000-AddSupplierProposalTerms.js';
import { SupplyProposalService } from '../services/supply-proposal.service.js';
import { getSupplyOption } from '../services/supply-access.js';
import { PharmacyCartService, type OrderCreator } from '../services/pharmacy-cart.service.js';
import type { SemiFranchiseRow } from '../services/semi-franchise.service.js';

const local = process.env.CAREPHARM_REVIEW_DATABASE_URL ? describe : describe.skip;
local('independent supplier proposal terms (isolated PostgreSQL)', () => {
  let fixture: Awaited<ReturnType<typeof createCarePharmReviewDb>>, service: SupplyProposalService;
  const owner=randomUUID(), requester=randomUUID(), legacy=randomUUID(), operator=randomUUID(), closer=randomUUID();
  const org=randomUUID(), buyerOrg=randomUUID(), supplier=randomUUID(), master=randomUUID(), offer=randomUUID();
  const sf={id:randomUUID(),key:'pharmacy'} as SemiFranchiseRow, other={id:randomUUID(),key:'fixture-other'} as SemiFranchiseRow;
  const terms={baseShippingFee:2000,freeShippingThreshold:10000,minOrderAmount:0};
  const create=(key=sf.key, extra:Record<string,unknown>={}) => service.supplierCreate(supplier,requester,{offerId:offer,semiFranchiseKey:key,unitPrice:1000,terms,...extra});
  beforeAll(async()=>{
    fixture=await createCarePharmReviewDb();
    await fixture.ds.query(`
      CREATE TABLE users(id uuid PRIMARY KEY,name text);
      CREATE TABLE organizations(id uuid PRIMARY KEY,name text,phone text,address text,address_detail jsonb,type text);
      CREATE TABLE organization_members(organization_id uuid,user_id uuid,role text,left_at timestamptz,is_primary boolean);
      CREATE TABLE neture_suppliers(id uuid PRIMARY KEY,organization_id uuid,user_id uuid,slug text,status text,base_shipping_fee int,free_shipping_threshold int);
      CREATE TABLE product_masters(id uuid PRIMARY KEY,name text,status text,specification text,manufacturer_name text,barcode text);
      CREATE TABLE supplier_product_offers(id uuid PRIMARY KEY,master_id uuid,supplier_id uuid,approval_status text,deleted_at timestamptz,
        business_short_description text,business_detail_description text,is_active boolean DEFAULT true,price_general int,service_keys text[] DEFAULT '{}',default_supply_enabled boolean DEFAULT true,
        track_inventory boolean DEFAULT false,stock_quantity int DEFAULT 0,reserved_quantity int DEFAULT 0);
      CREATE TABLE semi_franchises(id uuid PRIMARY KEY,key text,name text,status text,organization_id uuid,payment_receiver_key text);
      CREATE TABLE semi_franchise_memberships(semi_franchise_id uuid,organization_id uuid,status text);
      CREATE TABLE neture_pharmacy_memberships(organization_id uuid);
      CREATE TABLE supply_proposals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),offer_id uuid,semi_franchise_id uuid,target_organization_id uuid,
        unit_price int,note text,status text,requested_by uuid,decided_by uuid,decided_at timestamptz,reason text,ended_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      CREATE TABLE organization_product_listings(id uuid,offer_id uuid,organization_id uuid,service_key text,source_type text,status text,is_active boolean,
        event_price numeric,start_at timestamp,end_at timestamp,total_quantity int,per_store_limit int,per_order_limit int);
      CREATE TABLE seller_recruitments(id uuid,semi_franchise_id uuid,supply_unit_price int,product_id text,seller_id text,service_id text,exposure_status text,status text);
      CREATE TABLE seller_recruitment_applications(recruitment_id uuid,applicant_organization_id uuid,status text);
      CREATE TABLE store_cart_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),buyer_id uuid,organization_id uuid,service_key text,source_type text,
        supplier_product_offer_id uuid,supply_proposal_id uuid,event_offer_id uuid,seller_recruitment_id uuid,product_name text,quantity int,price_snapshot int,created_at timestamptz DEFAULT now());
    `);
    const q=fixture.ds.createQueryRunner();await new AddSupplierProposalTerms1792221000000().up(q);await q.release();
    await fixture.ds.query(`INSERT INTO users VALUES ($1,'Owner'),($2,'Requester'),($3,'Legacy'),($4,'Reviewer'),($5,'Closer')`,[owner,requester,legacy,operator,closer]);
    await fixture.ds.query(`INSERT INTO organizations(id,name,type) VALUES ($1,'Supplier fixture','supplier'),($2,'Pharmacy fixture','pharmacy')`,[org,buyerOrg]);
    await fixture.ds.query(`INSERT INTO organization_members(organization_id,user_id,role,left_at) VALUES ($1,$2,'owner',NULL)`,[org,owner]);
    await fixture.ds.query(`INSERT INTO neture_suppliers VALUES ($1,$2,$3,'fixture','ACTIVE',3000,50000)`,[supplier,org,legacy]);
    await fixture.ds.query(`INSERT INTO product_masters(id,name,status) VALUES ($1,'Fixture product','ACTIVE')`,[master]);
    await fixture.ds.query(`INSERT INTO supplier_product_offers(id,master_id,supplier_id,approval_status,price_general) VALUES ($1,$2,$3,'APPROVED',1200)`,[offer,master,supplier]);
    await fixture.ds.query(`INSERT INTO semi_franchises VALUES ($1,'pharmacy','Business A','active',$3,'receiver'),($2,'fixture-other','Business B','active',$4,'receiver')`,[sf.id,other.id,randomUUID(),randomUUID()]);
    await fixture.ds.query(`INSERT INTO semi_franchise_memberships VALUES ($1,$3,'active'),($2,$3,'active')`,[sf.id,other.id,buyerOrg]);
    await fixture.ds.query(`INSERT INTO neture_pharmacy_memberships VALUES ($1)`,[buyerOrg]);
    service=new SupplyProposalService(fixture.ds);
  });
  afterAll(async()=>{if(fixture)await fixture.close();});
  beforeEach(async()=>{
    await fixture.ds.query('TRUNCATE supply_proposals,store_cart_items');
    await fixture.ds.query('UPDATE neture_suppliers SET base_shipping_fee=3000,free_shipping_threshold=50000');
    await fixture.ds.query('UPDATE organization_members SET left_at=NULL');
  });
  it('replays simultaneous requests once and preserves ended proposals on retry', async () => {
    const requestId=randomUUID();
    const results=await Promise.all(Array.from({length:4},()=>create(sf.key,{requestId})));
    expect(new Set(results.map(p=>p.id))).toEqual(new Set([requestId]));
    expect(results.filter(p=>!p.reused)).toHaveLength(1);
    expect((await service.supplierList(supplier))).toHaveLength(1);
    await service.supplierEnd(supplier,requestId,requester);
    await fixture.ds.query("UPDATE semi_franchises SET status='closed' WHERE id=$1",[sf.id]);
    try { expect(await create(sf.key,{requestId})).toMatchObject({id:requestId,status:'ended',reused:true}); }
    finally { await fixture.ds.query("UPDATE semi_franchises SET status='active' WHERE id=$1",[sf.id]); }
  });
  it('rejects reused IDs with changed conditions, requester or supplier without exposing the record',async()=>{
    const requestId=randomUUID();await create(sf.key,{requestId});
    for(const extra of [{unitPrice:1001},{note:'changed'},{terms:{...terms,baseShippingFee:0}},{semiFranchiseKey:other.key},{targetOrganizationId:buyerOrg}]) {
      await expect(create(sf.key,{requestId,...extra})).rejects.toMatchObject({httpStatus:409,code:'PROPOSAL_REQUEST_CONFLICT'});
    }
    const input={requestId,offerId:offer,semiFranchiseKey:sf.key,unitPrice:1000,terms};
    await expect(service.supplierCreate(supplier,operator,input)).rejects.toMatchObject({httpStatus:409});
    await expect(service.supplierCreate(randomUUID(),requester,input)).rejects.toMatchObject({httpStatus:409});
    expect((await service.supplierList(supplier))).toHaveLength(1);
  });
  it('allows independently requested identical offers and rejects malformed retry IDs',async()=>{
    await create(sf.key,{requestId:randomUUID()});await create(sf.key,{requestId:randomUUID()});
    expect((await service.supplierList(supplier))).toHaveLength(2);
    await expect(create(sf.key,{requestId:'bad'})).rejects.toMatchObject({httpStatus:400,code:'INVALID_REQUEST_ID'});
  });
  it('captures legacy API defaults at request time, independent of later supplier changes',async()=>{
    const p=await create(sf.key,{terms:undefined});
    await fixture.ds.query('UPDATE neture_suppliers SET base_shipping_fee=9000,free_shipping_threshold=NULL');
    expect((await service.supplierList(supplier))[0].termsSnapshot).toEqual({version:1,baseShippingFee:3000,freeShippingThreshold:50000,minOrderAmount:0});
    await service.operatorDecide(sf,operator,p.id,'approve');
    expect(await getSupplyOption(fixture.ds,buyerOrg,'proposal',p.id)).toMatchObject({baseShippingFee:3000,freeShippingThreshold:50000});
  });
  it('keeps independent business policies and accepts a target without active membership in that business',async()=>{
    await fixture.ds.query('DELETE FROM semi_franchise_memberships WHERE semi_franchise_id=$1',[other.id]);
    const a=await create();const b=await create(other.key,{targetOrganizationId:buyerOrg,terms:{...terms,baseShippingFee:0}});
    const rows=await service.supplierList(supplier);
    expect(rows.find(r=>r.id===a.id).termsSnapshot.baseShippingFee).toBe(2000);
    expect(rows.find(r=>r.id===b.id).termsSnapshot.baseShippingFee).toBe(0);
    await fixture.ds.query(`INSERT INTO semi_franchise_memberships VALUES ($1,$2,'active')`,[other.id,buyerOrg]);
  });
  it.each([['requester',requester],['canonical owner',owner],['legacy owner',legacy]])('blocks self approval by %s',async(_label,actor)=>{
    const p=await create();await expect(service.operatorDecide(sf,actor,p.id,'approve')).rejects.toMatchObject({code:'SELF_APPROVAL_FORBIDDEN'});
    expect((await service.supplierList(supplier))[0].status).toBe('pending');
  });
  it('uses canonical authority before a stale legacy supplier pointer',async()=>{
    const otherOrg=randomUUID(), otherSupplier=randomUUID();
    await fixture.ds.query("INSERT INTO organizations(id,name,type) VALUES ($1,'Other supplier fixture','supplier')",[otherOrg]);
    await fixture.ds.query("INSERT INTO neture_suppliers(id,organization_id,slug,status) VALUES ($1,$2,'other-fixture','ACTIVE')",[otherSupplier,otherOrg]);
    await fixture.ds.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'owner')",[otherOrg,legacy]);
    try {
      const p=await create();
      await expect(service.operatorDecide(sf,legacy,p.id,'approve')).resolves.toMatchObject({status:'approved'});
    } finally {
      await fixture.ds.query('DELETE FROM organization_members WHERE organization_id=$1',[otherOrg]);
      await fixture.ds.query('DELETE FROM neture_suppliers WHERE id=$1',[otherSupplier]);
      await fixture.ds.query('DELETE FROM organizations WHERE id=$1',[otherOrg]);
    }
  });
  it('does not treat a former owner as current supplier authority and keeps business scope',async()=>{
    const p=await create();await fixture.ds.query('UPDATE organization_members SET left_at=now()');
    await expect(service.operatorDecide(other,owner,p.id,'approve')).rejects.toMatchObject({httpStatus:404});
    await service.operatorDecide(sf,owner,p.id,'approve');
  });
  it('preserves first decision actor/time/reason while recording operator end separately',async()=>{
    const p=await create();await service.operatorDecide(sf,operator,p.id,'approve','Agreed');
    const before=(await service.supplierList(supplier))[0];
    await service.operatorDecide(sf,closer,p.id,'end','Ended separately');
    expect((await service.supplierList(supplier))[0]).toMatchObject({status:'ended',decidedBy:operator,decidedAt:before.decidedAt,reason:'Agreed',endedBy:closer,endReason:'Ended separately',termsSnapshot:before.termsSnapshot});
  });
  it('records supplier termination without changing approval history; new terms require new approval',async()=>{
    const p=await create();await service.operatorDecide(sf,operator,p.id,'approve');await service.supplierEnd(supplier,p.id,owner);
    const row=(await service.supplierList(supplier))[0];expect(row).toMatchObject({status:'ended',decidedBy:operator,endedBy:owner});
    const next=await create(sf.key,{terms:{...terms,baseShippingFee:5000}});expect(next.status).toBe('pending');
    expect((await service.supplierList(supplier)).find(r=>r.id===p.id).termsSnapshot.baseShippingFee).toBe(2000);
  });
  it('keeps pharmacy default supply and requires approval for its special-price proposal',async()=>{
    const p=await create(sf.key,{unitPrice:900});
    expect((await getSupplyOption(fixture.ds,buyerOrg,'default',offer))?.unitPrice).toBe(1200);
    expect(await getSupplyOption(fixture.ds,buyerOrg,'proposal',p.id)).toBeNull();
    await service.operatorDecide(sf,operator,p.id,'approve');expect((await getSupplyOption(fixture.ds,buyerOrg,'proposal',p.id))?.unitPrice).toBe(900);
  });
  const addCart=async(id:string,quantity=1)=>fixture.ds.query(`INSERT INTO store_cart_items(buyer_id,organization_id,service_key,source_type,supply_proposal_id,product_name,quantity,price_snapshot)
    VALUES ($1,$2,'neture-pharmacy','neture_proposal',$3,'Fixture product',$4,1000)`,[owner,buyerOrg,id,quantity]);
  const orderCreator=()=>jest.fn<ReturnType<OrderCreator>, Parameters<OrderCreator>>().mockImplementation(async dto=>({id:randomUUID(),orderNumber:'fixture',subtotal:dto.items.reduce((s,i)=>s+i.subtotal,0),shippingFee:dto.shippingFeeSnapshot??0,totalAmount:0}));
  it('applies separate business shipping even with the same supplier and receiver, preserving order conditions',async()=>{
    const a=await create();const b=await create(other.key,{terms:{...terms,baseShippingFee:5000}});
    await service.operatorDecide(sf,operator,a.id,'approve');await service.operatorDecide(other,operator,b.id,'approve');
    await addCart(a.id);await addCart(b.id);
    const save=orderCreator();const cart=new PharmacyCartService(fixture.ds,{} as never,save);
    const result=await cart.checkout(owner,buyerOrg);
    expect(result.failedItems).toEqual([]);expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls.map(([dto])=>dto.shippingFeeSnapshot).sort()).toEqual([2000,5000]);
    expect(save.mock.calls[0][0].items[0].metadata?.conditions).toMatchObject({proposalTerms:{version:1,...terms}});
    expect(result.paymentGroups).toHaveLength(1);
  });
  it('blocks only a group below its minimum and applies the free-shipping boundary on retry',async()=>{
    const p=await create(sf.key,{terms:{...terms,minOrderAmount:2000,freeShippingThreshold:2000}});
    await service.operatorDecide(sf,operator,p.id,'approve');await addCart(p.id);
    const save=orderCreator();const cart=new PharmacyCartService(fixture.ds,{} as never,save);
    expect((await cart.checkout(owner,buyerOrg)).failedItems[0].code).toBe('MIN_ORDER_AMOUNT_NOT_MET');expect(save).not.toHaveBeenCalled();
    await fixture.ds.query('UPDATE store_cart_items SET quantity=2');
    expect((await cart.checkout(owner,buyerOrg)).failedItems).toEqual([]);expect(save.mock.calls[0][0].shippingFeeSnapshot).toBe(0);
  });
  it('does not fall back to supplier free-shipping settings when fixed terms explicitly have no threshold',async()=>{
    const p=await create(sf.key,{terms:{...terms,freeShippingThreshold:null}});await service.operatorDecide(sf,operator,p.id,'approve');
    expect(await getSupplyOption(fixture.ds,buyerOrg,'proposal',p.id)).toMatchObject({baseShippingFee:2000,freeShippingThreshold:null});
  });
  it('sums equal-condition proposals within one business for minimum and free shipping',async()=>{
    const shared={...terms,minOrderAmount:2000,freeShippingThreshold:2000};
    const a=await create(sf.key,{terms:shared});const b=await create(sf.key,{unitPrice:1200,terms:shared});
    await service.operatorDecide(sf,operator,a.id,'approve');await service.operatorDecide(sf,operator,b.id,'approve');await addCart(a.id);await addCart(b.id);
    const save=orderCreator();const cart=new PharmacyCartService(fixture.ds,{} as never,save);
    expect((await cart.checkout(owner,buyerOrg)).failedItems).toEqual([]);expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].items).toHaveLength(2);expect(save.mock.calls[0][0].shippingFeeSnapshot).toBe(0);
  });
  it('ending a pending request does not invent an approval',async()=>{
    const p=await create();await service.operatorDecide(sf,operator,p.id,'end','Withdraw pending');
    expect((await service.supplierList(supplier))[0]).toMatchObject({decidedAt:null,decidedBy:null,reason:null,endedBy:operator,endReason:'Withdraw pending'});
  });
  it('keeps legacy proposals on their existing shipping behavior without fabricating a snapshot',async()=>{
    const p=await create();await fixture.ds.query('UPDATE supply_proposals SET terms_snapshot=NULL WHERE id=$1',[p.id]);await service.operatorDecide(sf,operator,p.id,'approve');
    await fixture.ds.query('UPDATE neture_suppliers SET base_shipping_fee=7000');
    expect(await getSupplyOption(fixture.ds,buyerOrg,'proposal',p.id)).toMatchObject({termsSnapshot:null,baseShippingFee:7000,minOrderAmount:0});
  });
  it('rejects malformed snapshots and refuses a destructive rollback with terms/history present',async()=>{
    await expect(fixture.ds.query(`INSERT INTO supply_proposals(terms_snapshot) VALUES ('{"version":1}'::jsonb)`)).rejects.toThrow();
    await create();const q=fixture.ds.createQueryRunner();await expect(new AddSupplierProposalTerms1792221000000().down(q)).rejects.toThrow('before rollback');await q.release();
  });
});
