import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { ProductTrashBatchService } from '../product-trash-batch.service.js';
import { ProductCleanupOperationsService } from '../product-cleanup-operations.service.js';
const local=process.env.PRODUCT_TRASH_TEST_SOCKET;
const ci=process.env.CI==='true' && process.env.CANDIDATE_WORKFLOW_CI_PORT==='55432';
const suite=local||ci?describe:describe.skip;
suite('offer trash workflows — disposable PostgreSQL only',()=>{
 let db:DataSource,service:ProductTrashBatchService;
 const schema=`trash_${randomUUID().replace(/-/g,'')}`,actor=randomUUID();
 const database=ci?`product_${schema}`:'product_trash_test';
 const ciAdmin=()=>new DataSource({type:'postgres',host:'127.0.0.1',port:55432,username:'agent',database:'postgres'});
 beforeAll(async()=>{
  if(!ci && !local?.startsWith('/tmp/product-trash-pg/'))throw Error('Dedicated local socket required');
  if(ci){const admin=ciAdmin();await admin.initialize();try{await admin.query(`CREATE DATABASE ${database}`);}finally{await admin.destroy();}}
  db=new DataSource({type:'postgres',host:ci?'127.0.0.1':local,port:ci?55432:33458,username:'agent',database,extra:{options:`-c search_path=${schema},public`}});
  await db.initialize();await db.query(`CREATE SCHEMA ${schema}`);
  // This fixture is run in the CI disposable DB or our own named local DB, never against runtime credentials.
  await db.query('CREATE SCHEMA neture');
  await db.query(`CREATE TABLE supplier_product_offers(id uuid PRIMARY KEY,approval_status text DEFAULT 'PENDING',deleted_at timestamptz,deleted_by uuid,delete_reason text,is_active boolean DEFAULT true);
   CREATE TABLE product_masters(id uuid PRIMARY KEY,name text);
   CREATE TABLE organization_product_listings(offer_id uuid REFERENCES supplier_product_offers(id),is_active boolean);
   CREATE TABLE service_products(offer_id uuid REFERENCES supplier_product_offers(id));
   CREATE TABLE offer_service_approvals(offer_id uuid REFERENCES supplier_product_offers(id),approval_status text);
   CREATE TABLE neture.neture_order_items(product_id uuid REFERENCES supplier_product_offers(id));
   CREATE TABLE checkout_orders(items jsonb);
   CREATE TABLE store_cart_items(supplier_product_offer_id uuid REFERENCES supplier_product_offers(id));
   CREATE TABLE spot_price_policies(offer_id uuid REFERENCES supplier_product_offers(id));
   CREATE TABLE action_logs(service_key text,user_id uuid,action_key text,source text,status text,meta jsonb);`);
  service=new ProductTrashBatchService(db);
 });
 beforeEach(async()=>{await db.query('TRUNCATE supplier_product_offers,product_masters,organization_product_listings,service_products,offer_service_approvals,neture.neture_order_items,checkout_orders,store_cart_items,spot_price_policies,action_logs');});
 afterAll(async()=>{if(db?.isInitialized){await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.query('DROP SCHEMA neture CASCADE');await db.destroy();}if(ci){const admin=ciAdmin();await admin.initialize();try{await admin.query(`DROP DATABASE ${database}`);}finally{await admin.destroy();}}});
 const seed=async(count=1,trash=true)=>{const ids=Array.from({length:count},()=>randomUUID());await db.query(`INSERT INTO supplier_product_offers(id,deleted_at) SELECT id,${trash?'clock_timestamp()':'NULL'} FROM unnest($1::uuid[]) id`,[ids]);return ids;};
 it('moves all selected states in one mutation and preserves Masters',async()=>{
  const ids=await seed(3,false);await db.query("UPDATE supplier_product_offers SET approval_status='REJECTED' WHERE id=$1",[ids[0]]);
  const master=randomUUID();await db.query('INSERT INTO product_masters VALUES($1,$2)',[master,'합성 상품']);
  expect(await service.move(ids,actor)).toEqual({moved:3});expect(await db.query('SELECT id FROM supplier_product_offers WHERE deleted_at IS NOT NULL AND is_active=false')).toHaveLength(3);
  expect(await db.query('SELECT id FROM product_masters')).toHaveLength(1);await expect(service.move(ids,actor)).rejects.toMatchObject({code:'TRASH_CHANGED'});
 });
 it('empties more than one page, excludes later arrivals and returns protected records without deleting them',async()=>{
  const ids=await seed(124);await db.query('INSERT INTO store_cart_items VALUES($1)',[ids[0]]);await db.query('INSERT INTO neture.neture_order_items VALUES($1)',[ids[1]]);
  await db.query('INSERT INTO organization_product_listings VALUES($1,true)',[ids[2]]);await db.query('INSERT INTO service_products VALUES($1)',[ids[3]]);
  await db.query('INSERT INTO checkout_orders VALUES($1)',[JSON.stringify([{productId:ids[4]}])]);await db.query('INSERT INTO spot_price_policies VALUES($1)',[ids[5]]);
  const preview=await service.preview(actor);expect(preview.count).toBe(124);await seed();
  const result=await service.empty(actor,preview);expect(result.deleted).toBe(119);expect(result.blocked).toHaveLength(5);expect(await db.query('SELECT id FROM supplier_product_offers')).toHaveLength(6);
  expect(await db.query('SELECT * FROM spot_price_policies')).toHaveLength(0);expect((await db.query("SELECT meta FROM action_logs WHERE action_key='product.admin.empty_trash'"))[0].meta.deleted).toBe(119);
 });
 it('rejects changed rows, another actor, malformed or expired previews and replay',async()=>{
  const [id]=await seed();const preview=await service.preview(actor);
  await expect(service.empty(randomUUID(),preview)).rejects.toMatchObject({code:'TRASH_CHANGED'});
  await expect(service.empty(actor,{...preview,count:2})).rejects.toMatchObject({code:'TRASH_CHANGED'});
  await expect(service.empty(actor,{...preview,cutoff:'2000-01-01'})).rejects.toMatchObject({code:'TRASH_CHANGED'});
  await expect(service.empty(actor,{})).rejects.toMatchObject({code:'PREVIEW_REQUIRED'});
  await db.query('UPDATE supplier_product_offers SET is_active=false WHERE id=$1',[id]);await expect(service.empty(actor,preview)).rejects.toMatchObject({code:'TRASH_CHANGED'});
  const fresh=await service.preview(actor);expect((await service.empty(actor,fresh)).deleted).toBe(1);await expect(service.empty(actor,fresh)).rejects.toMatchObject({code:'TRASH_CHANGED'});
 });
 it('allows exactly one concurrent execution for the same snapshot',async()=>{
  await seed(3);const preview=await service.preview(actor);const results=await Promise.allSettled([service.empty(actor,preview),service.empty(actor,preview)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
 });
 it('rolls back removal if durable audit fails',async()=>{
  await seed(2);const preview=await service.preview(actor);await db.query("ALTER TABLE action_logs ADD CONSTRAINT reject_empty CHECK(action_key <> 'product.admin.empty_trash')");
  try{await expect(service.empty(actor,preview)).rejects.toBeTruthy();expect(await db.query('SELECT id FROM supplier_product_offers')).toHaveLength(2);}finally{await db.query('ALTER TABLE action_logs DROP CONSTRAINT reject_empty');}
 });
 it('permanently deletes an individual trash offer without free text, retaining reference protection and an automatic audit reason',async()=>{
  const [id,protectedId]=await seed(2);const single=new ProductCleanupOperationsService(db);await db.query('INSERT INTO store_cart_items VALUES($1)',[protectedId]);
  await expect(single.remove(protectedId,'trash',actor)).rejects.toMatchObject({code:'HAS_COMMERCE_REFERENCES'});
  expect(await single.remove(id,'trash',actor)).toEqual({hardDeleted:true});expect((await db.query('SELECT meta FROM action_logs'))[0].meta.reason).toBe('관리자 휴지통 완전 삭제');
 });
 it('validates selections and rolls back a partially changed move without touching valid targets',async()=>{
  const [active]=await seed(1,false);const [trashed]=await seed();await expect(service.move([active,trashed],actor)).rejects.toMatchObject({code:'TRASH_CHANGED'});
  expect((await db.query('SELECT deleted_at FROM supplier_product_offers WHERE id=$1',[active]))[0].deleted_at).toBeNull();
  await expect(service.move([active,active],actor)).rejects.toMatchObject({code:'INVALID_IDS'});await expect(service.move(['bad'],actor)).rejects.toMatchObject({code:'INVALID_IDS'});
 });
});
