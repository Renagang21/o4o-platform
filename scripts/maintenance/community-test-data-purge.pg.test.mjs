import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {runPurge} from './community-test-data-purge.mjs';
const socket=process.env.COMMUNITY_PURGE_TEST_SOCKET;
const enabled=!!socket;
const dbName='community_purge_'+randomUUID().replaceAll('-','');
let admin,db;
const ids=Object.fromEntries(['user','operator','community','membership','forum','post','comment','businessForum','businessPost'].map(k=>[k,randomUUID()]));
before(async()=>{
 if(!enabled)return;
 admin=new Client({host:socket,port:5543,user:'agent',database:'postgres'});await admin.connect();await admin.query(`CREATE DATABASE "${dbName}"`);
 db=new Client({host:socket,port:5543,user:'agent',database:dbName});await db.connect();
 await db.query(`
 CREATE TABLE users(id uuid PRIMARY KEY);
 CREATE TABLE role_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,role text,is_active bool,valid_from timestamptz,valid_until timestamptz);
 CREATE TABLE service_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,service_key text,status text);
 CREATE TABLE communities(id uuid PRIMARY KEY,slug text);
 CREATE TABLE community_memberships(id uuid PRIMARY KEY,community_id uuid REFERENCES communities ON DELETE CASCADE,user_id uuid);
 CREATE TABLE community_membership_changes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),community_id uuid REFERENCES communities ON DELETE CASCADE,membership_id uuid REFERENCES community_memberships ON DELETE CASCADE);
 CREATE TABLE community_creation_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),created_community_id uuid REFERENCES communities ON DELETE SET NULL);
 CREATE TABLE forum_category_requests(id uuid PRIMARY KEY,service_code text,organization_id uuid,name text);
 CREATE TABLE forum_post(id uuid PRIMARY KEY,forum_id uuid REFERENCES forum_category_requests ON DELETE SET NULL,organization_id uuid,is_organization_exclusive bool DEFAULT false,content jsonb,metadata jsonb);
 CREATE TABLE forum_comment(id uuid PRIMARY KEY,"postId" uuid REFERENCES forum_post ON DELETE CASCADE,"parentId" uuid REFERENCES forum_comment ON DELETE CASCADE);
 CREATE TABLE forum_like(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"targetType" text,"targetId" uuid);
 CREATE TABLE forum_bookmark(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"postId" uuid REFERENCES forum_post ON DELETE CASCADE);
 CREATE TABLE forum_post_like(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),post_id uuid);
 CREATE TABLE forum_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"postId" uuid,"commentId" uuid);
 CREATE TABLE forum_category_members(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),forum_category_id uuid);
 CREATE TABLE forum_join_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),forum_category_id uuid REFERENCES forum_category_requests ON DELETE CASCADE);
 `);
});
after(async()=>{if(db)await db.end();if(admin){await admin.query(`DROP DATABASE "${dbName}"`);await admin.end();}});
beforeEach(async()=>{
 if(!enabled)return;
 await db.query('DROP TABLE IF EXISTS outside_references');
 await db.query('TRUNCATE communities,community_memberships,community_membership_changes,community_creation_requests,service_memberships,role_assignments,users,forum_category_requests,forum_post,forum_comment,forum_like,forum_bookmark,forum_post_like,forum_notifications,forum_category_members,forum_join_requests CASCADE');
 await db.query('INSERT INTO users VALUES($1),($2)',[ids.user,ids.operator]);
 await db.query(`INSERT INTO communities VALUES($1,'pharmacy')`,[ids.community]);
 await db.query('INSERT INTO community_memberships VALUES($1,$2,$3),($4,$2,$5)',[ids.membership,ids.community,ids.user,randomUUID(),ids.operator]);
 await db.query('INSERT INTO community_membership_changes(community_id,membership_id) VALUES($1,$2)',[ids.community,ids.membership]);
 await db.query('INSERT INTO community_creation_requests(created_community_id) VALUES($1)',[ids.community]);
 await db.query(`INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'community','active'),($2,'community','active'),($1,'funding','active')`,[ids.user,ids.operator]);
 await db.query(`INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'community:admin',true,NOW()-interval '1 day')`,[ids.operator]);
 await db.query(`INSERT INTO forum_category_requests VALUES($1,'neture',NULL,'fixture'),($2,'sf:business',NULL,'business fixture')`,[ids.forum,ids.businessForum]);
 await db.query(`INSERT INTO forum_post(id,forum_id,content) VALUES($1,$2,'[]'),($3,$4,'[]')`,[ids.post,ids.forum,ids.businessPost,ids.businessForum]);
 await db.query('INSERT INTO forum_comment(id,"postId") VALUES($1,$2)',[ids.comment,ids.post]);
 await db.query(`INSERT INTO forum_like("targetType","targetId") VALUES('post',$1),('comment',$2)`,[ids.post,ids.comment]);
 await db.query('INSERT INTO forum_bookmark("postId") VALUES($1)',[ids.post]);
 await db.query('INSERT INTO forum_post_like(post_id) VALUES($1)',[ids.post]);
 await db.query('INSERT INTO forum_notifications("postId","commentId") VALUES($1,$2)',[ids.post,ids.comment]);
 await db.query('INSERT INTO forum_category_members(forum_category_id) VALUES($1)',[ids.forum]);
 await db.query('INSERT INTO forum_join_requests(forum_category_id) VALUES($1)',[ids.forum]);
});
const check=(name,fn)=>test(name,{skip:!enabled},fn);
check('plan is read-only and exposes only counts/fingerprint',async()=>{
 const result=await runPurge(db);assert.equal(result.applied,false);assert.equal(result.counts.forum_post,1);assert.equal(result.blockers.length,0);
 assert.equal(JSON.stringify(result).includes(ids.user),false);assert.equal((await db.query('SELECT count(*)::int n FROM forum_post')).rows[0].n,2);
});
check('deletes scoped resources and loose links, preserving identity/business/operator membership',async()=>{
 const p=await runPurge(db);const result=await runPurge(db,{apply:true,expectedDigest:p.digest});assert.equal(result.applied,true);assert.ok(Object.values(result.remaining).every(n=>n===0));
 assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n,2);
 assert.deepEqual((await db.query('SELECT id FROM forum_post')).rows,[{id:ids.businessPost}]);
 assert.equal((await db.query('SELECT count(*)::int n FROM service_memberships')).rows[0].n,2);
});
check('blocks fingerprint drift without deleting any resource',async()=>{
 const p=await runPurge(db);await db.query("UPDATE forum_category_requests SET name='changed' WHERE id=$1",[ids.forum]);
 await assert.rejects(()=>runPurge(db,{apply:true,expectedDigest:p.digest}),/PLAN_CHANGED/);
 assert.equal((await db.query('SELECT count(*)::int n FROM communities')).rows[0].n,1);
});
check('blocks outside references even for ON DELETE CASCADE foreign keys',async()=>{
 await db.query('CREATE TABLE outside_references(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),forum_id uuid REFERENCES forum_category_requests ON DELETE CASCADE)');
 await db.query('INSERT INTO outside_references(forum_id) VALUES($1)',[ids.forum]);
 const p=await runPurge(db);assert.ok(p.blockers.some(b=>b.kind==='outside_scope_reference'));
 await assert.rejects(()=>runPurge(db,{apply:true,expectedDigest:p.digest}),/REFERENCE_REVIEW_REQUIRED/);
 assert.equal((await db.query('SELECT count(*)::int n FROM outside_references')).rows[0].n,1);
});
check('blocks organization-owned content and uploaded-object references',async()=>{
 await db.query(`UPDATE forum_post SET organization_id=$1,content='{"url":"/uploads/fixture.png"}' WHERE id=$2`,[randomUUID(),ids.post]);
 const p=await runPurge(db);assert.ok(p.blockers.some(b=>b.kind==='organization_content'));assert.ok(p.blockers.some(b=>b.kind==='media_reference_review'));
 await assert.rejects(()=>runPurge(db,{apply:true,expectedDigest:p.digest}),/REFERENCE_REVIEW_REQUIRED/);
});
check('rejects apply with no reviewed fingerprint',async()=>{await assert.rejects(()=>runPurge(db,{apply:true}),/DIGEST_REQUIRED/);});

check('empty plan is idempotent after retirement',async()=>{
 const p=await runPurge(db);await runPurge(db,{apply:true,expectedDigest:p.digest});
 const empty=await runPurge(db);assert.ok(Object.values(empty.counts).every(n=>n===0));
 assert.equal((await runPurge(db,{apply:true,expectedDigest:empty.digest})).applied,true);
});
