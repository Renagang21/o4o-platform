/** Optional isolated PostgreSQL fixture. Never point PH_DEV_FIXTURE_URL at a shared database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PharmacyHubDevelopmentPurge} from './pharmacy-hub-development-purge.mjs';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const ph='pharmacy-hub';
test('PostgreSQL: real plan/apply, mixed ownership, cross-schema FK, JSON refs, grouped payments and rollback',
  {skip:!process.env.PH_DEV_FIXTURE_URL},async()=>{
    const {Client}=createRequire(new URL('../../apps/api-server/package.json',import.meta.url))('pg');
    const client=new Client({connectionString:process.env.PH_DEV_FIXTURE_URL});await client.connect();
    const q={isTransactionActive:true,query:async(sql,args)=>(await client.query(sql,args)).rows};
    const seed=async()=>{
      await client.query('DROP SCHEMA IF EXISTS external CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public');
      await client.query(`CREATE TABLE checkout_orders(id uuid PRIMARY KEY,metadata jsonb);
        CREATE TABLE checkout_order_logs(id uuid PRIMARY KEY,"orderId" uuid REFERENCES checkout_orders(id));
        CREATE TABLE o4o_payments(id uuid PRIMARY KEY,"orderId" varchar,"sourceService" varchar,metadata jsonb);
        CREATE TABLE supplier_product_offers(id uuid PRIMARY KEY,service_keys text[]);
        CREATE TABLE offer_service_approvals(id uuid PRIMARY KEY,offer_id uuid REFERENCES supplier_product_offers(id),service_key varchar);
        CREATE TABLE offer_service_prices(id uuid PRIMARY KEY,offer_id uuid REFERENCES supplier_product_offers(id),service_key varchar);
        CREATE TABLE cms_contents(id uuid PRIMARY KEY,"serviceKey" varchar);
        CREATE TABLE forum_category_requests(id uuid PRIMARY KEY,service_code varchar);
        CREATE TABLE media_assets(id uuid PRIMARY KEY,service_key varchar,gcs_path text);
        CREATE TABLE users(id uuid PRIMARY KEY); CREATE TABLE organizations(id uuid PRIMARY KEY);
        CREATE TABLE shared_notes(id uuid PRIMARY KEY,metadata jsonb);`);
      for(let i=1;i<=6;i++){
        await client.query('INSERT INTO checkout_orders VALUES($1,$2)',[uuid(i),{serviceKey:ph,source:'pharmacy_hub_cart'}]);
        await client.query('INSERT INTO checkout_order_logs VALUES($1,$2)',[uuid(100+i),uuid(i)]);
        await client.query('INSERT INTO o4o_payments VALUES($1,$2,$3,$4)',[uuid(200+i),uuid(i===6?1:i),ph,{serviceKey:ph}]);
      }
      await client.query('INSERT INTO checkout_orders VALUES($1,$2)',[uuid(7),{serviceKey:'neture'}]);
      for(let i=1;i<=19;i++){
        await client.query('INSERT INTO supplier_product_offers VALUES($1,$2)',[uuid(300+i),[ph]]);
        if(i<=18)await client.query('INSERT INTO offer_service_approvals VALUES($1,$2,$3)',[uuid(400+i),uuid(300+i),ph]);
      }
      await client.query('INSERT INTO offer_service_prices VALUES($1,$2,$3)',[uuid(500),uuid(301),ph]);
      for(let i=1;i<=3;i++)await client.query('INSERT INTO cms_contents VALUES($1,$2)',[uuid(600+i),ph]);
      await client.query('INSERT INTO forum_category_requests VALUES($1,$2)',[uuid(700),ph]);
      await client.query('INSERT INTO media_assets VALUES($1,$2,$3)',[uuid(800),ph,'media/fixture.png']);
      await client.query('INSERT INTO users VALUES($1);',[uuid(900)]);
      await client.query('INSERT INTO organizations VALUES($1);',[uuid(901)]);
    };
    const begin=async()=>client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const preserved=async()=>{
      for(const table of ['checkout_orders','media_assets','users','organizations'])
        assert.equal((await client.query(`SELECT count(*)::text AS count FROM ${table}`)).rows[0].count,'1');
    };
    try {
      await seed();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const plan=await new PharmacyHubDevelopmentPurge().up(q,true);assert.equal(plan.applied,false);
      assert.equal(Object.values(plan.counts).reduce((a,b)=>a+b,0),60);await client.query('ROLLBACK');
      const scenarios=[
        ["UPDATE checkout_orders SET metadata=metadata||'{\"serviceKey\":\"kpa-society\"}' WHERE id='"+uuid(1)+"'",/MIXED_OWNERSHIP/],
        ["UPDATE supplier_product_offers SET service_keys=ARRAY['pharmacy-hub','neture'] WHERE id='"+uuid(301)+"'",/MIXED_OWNERSHIP/],
        ["CREATE SCHEMA external;CREATE TABLE external.refs(order_id uuid REFERENCES checkout_orders(id));INSERT INTO external.refs VALUES('"+uuid(1)+"')",/SHARED_FK/],
        ["INSERT INTO shared_notes VALUES('"+uuid(999)+"','{\"order\":\""+uuid(1)+"\"}')",/SHARED_VALUE/],
        ["INSERT INTO o4o_payments VALUES('"+uuid(998)+"','"+uuid(1)+"','neture','{}')",/SHARED_PAYMENT/],
        ["UPDATE checkout_orders SET metadata=metadata||'{\"paymentGroupId\":\"group\"}' WHERE id IN ('"+uuid(1)+"','"+uuid(7)+"');UPDATE o4o_payments SET \"orderId\"='group' WHERE id='"+uuid(201)+"'",/SHARED_PAYMENT/],
        ["CREATE FUNCTION deny_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN OLD; END $$;CREATE TRIGGER extra BEFORE DELETE ON cms_contents FOR EACH ROW EXECUTE FUNCTION deny_delete()",/DELETE_TRIGGER/],
      ];
      for(const [sql,error] of scenarios){
        await seed();await client.query(sql);await begin();
        await assert.rejects(new PharmacyHubDevelopmentPurge().up(q),error);await client.query('ROLLBACK');
        assert.equal((await client.query('SELECT count(*)::text AS count FROM checkout_order_logs')).rows[0].count,'6');
      }
      await seed();await begin();await new PharmacyHubDevelopmentPurge().up(q);await client.query('ROLLBACK');
      assert.equal((await client.query('SELECT count(*)::text AS count FROM checkout_orders')).rows[0].count,'7');
      await begin();const applied=await new PharmacyHubDevelopmentPurge().up(q);assert.equal(applied.applied,true);await client.query('COMMIT');
      await preserved();
      for(const table of ['checkout_order_logs','o4o_payments','supplier_product_offers','cms_contents','forum_category_requests'])
        assert.equal((await client.query(`SELECT count(*)::text AS count FROM ${table}`)).rows[0].count,'0');
    } finally {await client.query('ROLLBACK');await client.end();}
  });
