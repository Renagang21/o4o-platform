import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { requestCommunityServiceMembership } from '../community-service-membership.js';
const fixture = process.env.COMMUNITY_TEST_PG_SOCKET;
// Dedicated local fixture only. Never infer a database from application or production credentials.
(fixture ? describe : describe.skip)('community service enrollment PostgreSQL transaction', () => {
 const schema = `community_test_${randomUUID().replace(/-/g,'')}`;
 let db: DataSource;
 beforeAll(async()=>{
  db=new DataSource({type:'postgres',host:fixture!,port:5543,username:'agent',database:'postgres',entities:[],extra:{options:`-c search_path=${schema}`,max:4}});
  await db.initialize(); await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`CREATE TABLE users(id uuid PRIMARY KEY,status text,"isActive" boolean,"isEmailVerified" boolean)`);
  await db.query(`CREATE TABLE service_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,service_key text,role text,status text,created_at timestamptz,updated_at timestamptz,UNIQUE(user_id,service_key))`);
  await db.query(`CREATE TABLE service_policy_documents(id uuid,service_key text,document_type text,status text,published_at timestamptz,version integer,title text,content text,slug text)`);
  await db.query(`CREATE TABLE action_logs(service_key text,user_id uuid,action_key text,source text,status text,meta jsonb)`);
 });
 afterAll(async()=>{ if(db?.isInitialized) {await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.destroy();} });
 beforeEach(async()=>{await db.query('TRUNCATE users,service_memberships,action_logs,service_policy_documents');});
 async function account(){const id=randomUUID();await db.query(`INSERT INTO users VALUES($1,'active',true,true)`,[id]);return id;}
 it('serializes simultaneous requests and records exactly one pending membership and audit',async()=>{
  const id=await account();
  const results=await Promise.all([1,2].map(()=>db.transaction(m=>requestCommunityServiceMembership(m,id,[]))));
  expect(results.filter(r=>r.requestSubmitted)).toHaveLength(1);
  expect(await db.query('SELECT service_key,status,role FROM service_memberships')).toEqual([{service_key:'community',status:'pending',role:'member'}]);
  expect(await db.query('SELECT count(*)::int AS n FROM action_logs')).toEqual([{n:1}]);
 });
 it('rolls back membership insertion if writing policy audit fails',async()=>{
  const id=await account(); await db.query(`ALTER TABLE action_logs ADD CONSTRAINT reject_fixture CHECK (false)`);
  try {await expect(db.transaction(m=>requestCommunityServiceMembership(m,id,[]))).rejects.toThrow();}
  finally {await db.query('ALTER TABLE action_logs DROP CONSTRAINT reject_fixture');}
  expect(await db.query('SELECT * FROM service_memberships')).toHaveLength(0);
 });
 it.each(['suspended','withdrawn'])('does not revive %s via service signup',async status=>{
  const id=await account();await db.query(`INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'community','member',$2)`,[id,status]);
  await expect(db.transaction(m=>requestCommunityServiceMembership(m,id,[]))).rejects.toMatchObject({code:'MEMBERSHIP_NOT_ACTIVE'});
  expect(await db.query('SELECT status FROM service_memberships')).toEqual([{status}]);
 });
 it('rejected operator memberships can only reapply as ordinary members',async()=>{
  const id=await account();await db.query(`INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'community','admin','rejected')`,[id]);
  await db.transaction(m=>requestCommunityServiceMembership(m,id,[]));
  expect(await db.query('SELECT status,role FROM service_memberships')).toEqual([{status:'pending',role:'member'}]);
 });
 it('does not require or modify an unrelated service membership',async()=>{
  const id=await account();await db.query(`INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'neture','member','suspended')`,[id]);
  await expect(db.transaction(m=>requestCommunityServiceMembership(m,id,[]))).resolves.toMatchObject({status:'pending'});
  expect(await db.query(`SELECT status FROM service_memberships WHERE service_key='neture'`)).toEqual([{status:'suspended'}]);
 });
});
