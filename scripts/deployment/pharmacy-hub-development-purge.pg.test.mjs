/** Optional isolated PostgreSQL fixture. Never point PH_DEV_FIXTURE_URL at a shared database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PharmacyHubDevelopmentPurge} from './pharmacy-hub-development-purge.mjs';
import {PharmacyHubMediaPurge} from './pharmacy-hub-media-purge.mjs';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const ph='pharmacy-hub';
test('PostgreSQL: real plan/apply, mixed ownership, cross-schema FK, JSON refs, grouped payments and rollback',
  {skip:!process.env.PH_DEV_FIXTURE_URL},async()=>{
    const {Client}=createRequire(new URL('../../apps/api-server/package.json',import.meta.url))('pg');
    const fixtureUrl=new URL(process.env.PH_DEV_FIXTURE_URL);
    if(fixtureUrl.hostname!=='127.0.0.1'||fixtureUrl.pathname!=='/ph_dev_purge_fixture')throw new Error('Isolated loopback fixture database required');
    const client=new Client({connectionString:process.env.PH_DEV_FIXTURE_URL});await client.connect();
    const q={isTransactionActive:true,query:async(sql,args)=>(await client.query(sql,args)).rows};
    const seed=async()=>{
      await client.query('DROP SCHEMA IF EXISTS external CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public');
      await client.query(`CREATE TABLE checkout_orders(id uuid PRIMARY KEY,metadata jsonb);
        CREATE TABLE checkout_order_logs(id uuid PRIMARY KEY,"orderId" uuid REFERENCES checkout_orders(id));
        CREATE TABLE o4o_payments(id uuid PRIMARY KEY,"orderId" varchar,"sourceService" varchar,metadata jsonb);
        CREATE TYPE supplier_product_offers_distribution_type_enum AS ENUM ('PUBLIC','SERVICE','PRIVATE');
        CREATE TABLE supplier_product_offers(id uuid PRIMARY KEY,service_keys text[],is_public boolean DEFAULT false,allowed_seller_ids text[],distribution_type supplier_product_offers_distribution_type_enum DEFAULT 'SERVICE',is_active boolean DEFAULT true,approval_status varchar DEFAULT 'APPROVED');
        CREATE TABLE offer_service_approvals(id uuid PRIMARY KEY,offer_id uuid REFERENCES supplier_product_offers(id),service_key varchar);
        CREATE TABLE offer_service_prices(id uuid PRIMARY KEY,offer_id uuid REFERENCES supplier_product_offers(id),service_key varchar);
        CREATE TABLE cms_contents(id uuid PRIMARY KEY,"serviceKey" varchar);
        CREATE TABLE forum_category_requests(id uuid PRIMARY KEY,service_code varchar);
        CREATE TABLE media_assets(id uuid PRIMARY KEY,service_key varchar,gcs_path text,url text);
        CREATE TABLE media_entity_links(id uuid PRIMARY KEY,media_asset_id uuid REFERENCES media_assets(id),entity_type varchar,entity_id varchar);
        CREATE TABLE users(id uuid PRIMARY KEY); CREATE TABLE organizations(id uuid PRIMARY KEY);
        CREATE TABLE shared_notes(id uuid PRIMARY KEY,metadata jsonb);`);
      for(let i=1;i<=6;i++){
        await client.query('INSERT INTO checkout_orders VALUES($1,$2)',[uuid(i),{serviceKey:ph,source:'pharmacy_hub_cart'}]);
        await client.query('INSERT INTO checkout_order_logs VALUES($1,$2)',[uuid(100+i),uuid(i)]);
        await client.query('INSERT INTO o4o_payments VALUES($1,$2,$3,$4)',[uuid(200+i),uuid(i===6?1:i),ph,{serviceKey:ph}]);
      }
      await client.query('INSERT INTO checkout_orders VALUES($1,$2)',[uuid(7),{serviceKey:'neture'}]);
      for(let i=1;i<=19;i++){
        await client.query('INSERT INTO supplier_product_offers(id,service_keys) VALUES($1,$2)',[uuid(300+i),[ph]]);
        if(i<=18)await client.query('INSERT INTO offer_service_approvals VALUES($1,$2,$3)',[uuid(400+i),uuid(300+i),ph]);
      }
      await client.query('INSERT INTO offer_service_prices VALUES($1,$2,$3)',[uuid(500),uuid(301),ph]);
      for(let i=1;i<=3;i++)await client.query('INSERT INTO cms_contents VALUES($1,$2)',[uuid(600+i),ph]);
      await client.query('INSERT INTO forum_category_requests VALUES($1,$2)',[uuid(700),ph]);
      for(let i=0;i<4;i++)await client.query('INSERT INTO media_assets VALUES($1,$2,$3,$4)',[uuid(800+i),ph,`media/fixture-${i}.png`,`https://storage.googleapis.com/o4o-media-library/media/fixture-${i}.png`]);
      await client.query('INSERT INTO media_assets VALUES($1,$2,$3,$4)',[uuid(810),'neture','media/shared.png','https://storage.googleapis.com/o4o-media-library/media/shared.png']);
      await client.query('INSERT INTO media_entity_links VALUES($1,$2,$3,$4)',[uuid(820),uuid(800),'service',ph]);
      await client.query('INSERT INTO users VALUES($1);',[uuid(900)]);
      await client.query('INSERT INTO organizations VALUES($1);',[uuid(901)]);
    };
    const begin=async()=>client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const preserved=async()=>{
      for(const table of ['checkout_orders','media_assets','users','organizations'])
        assert.equal((await client.query(`SELECT count(*)::text AS count FROM ${table}`)).rows[0].count,table==='media_assets'?'5':'1');
    };
    try {
      await seed();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const plan=await new PharmacyHubDevelopmentPurge().up(q,true);assert.equal(plan.applied,false);
      assert.equal(Object.values(plan.counts).reduce((a,b)=>a+b,0),60);await client.query('ROLLBACK');
      const scenarios=[
        ["UPDATE supplier_product_offers SET is_public=true WHERE id='"+uuid(301)+"'",/SHARED_BASELINE_WIDENING/],
        ["UPDATE supplier_product_offers SET allowed_seller_ids=ARRAY['seller'] WHERE id='"+uuid(301)+"'",/SHARED_BASELINE_WIDENING/],
        ["UPDATE checkout_orders SET metadata=metadata||'{\"serviceKey\":\"kpa-society\"}' WHERE id='"+uuid(1)+"'",/MIXED_OWNERSHIP/],

        ["CREATE SCHEMA external;CREATE TABLE external.refs(order_id uuid REFERENCES checkout_orders(id));INSERT INTO external.refs VALUES('"+uuid(1)+"')",/SHARED_FK/],
        ["INSERT INTO shared_notes VALUES('"+uuid(999)+"','{\"order\":\""+uuid(1)+"\"}')",/SHARED_VALUE/],
        ["INSERT INTO shared_notes VALUES('"+uuid(999)+"','{\"orderLog\":\""+uuid(101)+"\"}')",/SHARED_VALUE/],
        ["INSERT INTO o4o_payments VALUES('"+uuid(998)+"','"+uuid(1)+"','neture','{}')",/SHARED_PAYMENT/],
        ["UPDATE checkout_orders SET metadata=metadata||'{\"paymentGroupId\":\"group\"}' WHERE id IN ('"+uuid(1)+"','"+uuid(7)+"');UPDATE o4o_payments SET \"orderId\"='group' WHERE id='"+uuid(201)+"'",/SHARED_PAYMENT/],
        ["CREATE FUNCTION deny_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN OLD; END $$;CREATE TRIGGER extra BEFORE DELETE ON cms_contents FOR EACH ROW EXECUTE FUNCTION deny_delete()",/MUTATION_TRIGGER/],
      ];
      for(const [sql,error] of scenarios){
        await seed();await client.query(sql);await begin();
        await assert.rejects(new PharmacyHubDevelopmentPurge().up(q),error);await client.query('ROLLBACK');
        assert.equal((await client.query('SELECT count(*)::text AS count FROM checkout_order_logs')).rows[0].count,'6');
      }
      await seed();await begin();await new PharmacyHubDevelopmentPurge().up(q);await client.query('ROLLBACK');
      assert.equal((await client.query('SELECT count(*)::text AS count FROM checkout_orders')).rows[0].count,'7');
      await client.query("UPDATE supplier_product_offers SET is_public=true, distribution_type='PUBLIC', service_keys=ARRAY['pharmacy-hub','neture'],allowed_seller_ids=ARRAY['seller'] WHERE id='"+uuid(301)+"'");
      await begin();const applied=await new PharmacyHubDevelopmentPurge().up(q);assert.equal(applied.applied,true);await client.query('COMMIT');
      await preserved();
      for(const table of ['checkout_order_logs','o4o_payments','cms_contents','forum_category_requests'])
        assert.equal((await client.query(`SELECT count(*)::text AS count FROM ${table}`)).rows[0].count,'0');
      const offers=await client.query("SELECT count(*)::text AS count FROM supplier_product_offers");assert.equal(offers.rows[0].count,'19');
      const shared=await client.query('SELECT is_public,service_keys,allowed_seller_ids,distribution_type FROM supplier_product_offers WHERE id=$1',[uuid(301)]);
      assert.deepEqual(shared.rows[0],{is_public:true,service_keys:['neture'],allowed_seller_ids:['seller'],distribution_type:'PUBLIC'});
      assert.equal((await client.query("SELECT count(*)::text AS count FROM supplier_product_offers WHERE service_keys @> ARRAY['pharmacy-hub']")).rows[0].count,'0');
      assert.equal((await client.query("SELECT count(*)::text AS count FROM supplier_product_offers WHERE is_active=false AND cardinality(service_keys)=0")).rows[0].count,'18');
      const missing=new Set(),removed=[];
      const storage={bucket(name){assert.equal(name,'o4o-media-library');return {file(path){return {
        async getMetadata(){if(missing.has(path))throw Object.assign(new Error('not found'),{code:404});return [{generation:'123',name:path,bucket:'o4o-media-library'}];},
        async delete(options){assert.equal(options.ifGenerationMatch,'123');missing.add(path);removed.push(path);},
      };}};}};
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      assert.equal((await new PharmacyHubMediaPurge({storage}).up(q,true)).assets,4);await client.query('ROLLBACK');
      assert.equal(removed.length,0);
      await client.query('INSERT INTO shared_notes VALUES($1,$2)',[uuid(999),{image:'https://storage.googleapis.com/o4o-media-library/media/fixture-0.png'}]);
      await begin();await assert.rejects(new PharmacyHubMediaPurge({storage}).up(q),/SHARED_VALUE/);await client.query('ROLLBACK');
      await client.query('DELETE FROM shared_notes');
      await client.query('INSERT INTO shared_notes VALUES($1,$2)',[uuid(999),{catalogLink:uuid(820)}]);
      await begin();await assert.rejects(new PharmacyHubMediaPurge({storage}).up(q),/SHARED_VALUE/);await client.query('ROLLBACK');
      await client.query('DELETE FROM shared_notes');
      await client.query('INSERT INTO media_entity_links VALUES($1,$2,$3,$4)',[uuid(821),uuid(800),'product',uuid(300)]);
      await begin();await assert.rejects(new PharmacyHubMediaPurge({storage}).up(q),/LINK_CENSUS_CHANGED/);await client.query('ROLLBACK');
      await client.query('DELETE FROM media_entity_links WHERE id=$1',[uuid(821)]);
      await client.query("UPDATE media_entity_links SET entity_type='video-production-job'");
      await begin();await assert.rejects(new PharmacyHubMediaPurge({storage}).up(q),/LINK_CENSUS_CHANGED/);await client.query('ROLLBACK');
      await client.query('CREATE TABLE product_masters(id uuid PRIMARY KEY,name text)');
      await client.query('INSERT INTO product_masters VALUES($1,$2)',[uuid(300),'shared product']);
      await client.query("UPDATE media_entity_links SET entity_type='product',entity_id=$1",[uuid(300)]);
      await client.query('CREATE SCHEMA external; CREATE TABLE external.asset_consumers(asset_id uuid REFERENCES media_assets(id))');
      await client.query('INSERT INTO external.asset_consumers VALUES($1)',[uuid(800)]);
      await begin();await assert.rejects(new PharmacyHubMediaPurge({storage}).up(q),/SHARED_FK/);await client.query('ROLLBACK');
      await client.query('DROP SCHEMA external CASCADE');
      await begin();await new PharmacyHubMediaPurge({storage}).up(q);await client.query('COMMIT');
      assert.equal(removed.length,4);assert.equal((await client.query('SELECT count(*)::text AS count FROM media_assets')).rows[0].count,'1');
      assert.equal((await client.query('SELECT count(*)::text AS count FROM media_entity_links')).rows[0].count,'0');
      assert.equal((await client.query('SELECT name FROM product_masters')).rows[0].name,'shared product');
    } finally {await client.query('ROLLBACK');await client.end();}
  });
