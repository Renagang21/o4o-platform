import {inboxRecipients} from '../inbox-scope.js';
import {contactRecipients} from '../contact-service-scope.js';
import {randomUUID} from 'node:crypto';
import {DataSource} from 'typeorm';
import {centralContactRecipients, assertCentralContactAccess} from '../central-contact-access.js';
import {centralNotificationMenuPredicate} from '../../../services/admin/central-notification-scope.js';
const socket=process.env.CONTACT_REVIEW_PG_SOCKET;
const integration=socket?describe:describe.skip;
integration('central Contact ownership on isolated PostgreSQL',()=>{
 let db:DataSource;
 const schema=`contact_central_${randomUUID().replace(/-/g,'')}`;
 const local=randomUUID(),central=randomUUID(),other=randomUUID(),fed=randomUUID(),platform=randomUUID();
 beforeAll(async()=>{
  if(!socket?.startsWith('/tmp/'))throw Error('disposable local socket required');
  db=new DataSource({type:'postgres',host:socket,username:'o4o_local',database:'o4o_platform',schema,extra:{options:`-c search_path=${schema},public`}});
  await db.initialize();await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`CREATE TABLE users(id uuid,status text,"isActive" boolean,"isEmailVerified" boolean);
   CREATE TABLE role_assignments(id uuid DEFAULT gen_random_uuid(),user_id uuid,role text,is_active boolean DEFAULT true,scope_type text,valid_from timestamptz,valid_until timestamptz);
   CREATE TABLE service_memberships(user_id uuid,service_key text,status text);
   CREATE TABLE central_operation_menu_grants(assignment_id uuid,menu_keys text[]);
   CREATE TABLE cooperative_roles(cooperative_id uuid,user_id uuid,revoked_at timestamptz);
   CREATE TABLE semi_franchises(id uuid,key text);
   CREATE TABLE semi_franchise_operators(semi_franchise_id uuid,user_id uuid,revoked_at timestamptz);
   CREATE TABLE notifications("userId" uuid,"serviceKey" text,"organizationId" uuid,type text,metadata jsonb);`);
  for(const [id,role,scope,key,menu] of [
   [local,'supplier:operator',null,'supplier',null],
   [central,'supplier:operator','o4o-direct','supplier','supplier.inbox'],
   [other,'supplier:operator','o4o-direct','supplier','supplier.members'],
   [fed,'neture:pharmcoop_operator','o4o-direct','neture','pharmcoop.inbox'],
   [platform,'platform:super_admin',null,'neture',null],
  ]){
   await db.query(`INSERT INTO users VALUES($1,'active',true,true)`,[id]);
   const [assignment]=await db.query('INSERT INTO role_assignments(user_id,role,scope_type) VALUES($1,$2,$3) RETURNING id',[id,role,scope]);
   await db.query(`INSERT INTO service_memberships VALUES($1,$2,'active')`,[id,key]);
   if(menu)await db.query('INSERT INTO central_operation_menu_grants VALUES($1,$2)',[assignment.id,[menu]]);
  }
 },30000);
 afterAll(async()=>{if(db?.isInitialized){await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.destroy();}});
 it('selects central menu delegates and platform admin; excludes service-only operators',async()=>{
  expect((await centralContactRecipients(db,'supplier.inbox')).map(r=>r.userId).sort()).toEqual([central,platform].sort());
  await expect(assertCentralContactAccess(db,local,'supplier','google')).rejects.toMatchObject({status:403});
  await expect(assertCentralContactAccess(db,other,'supplier','google')).rejects.toMatchObject({status:403});
  await expect(assertCentralContactAccess(db,central,'supplier','google')).resolves.toBeUndefined();
 });
 it('keeps federation central and never derives individual-cooperative authority',async()=>{
  expect((await centralContactRecipients(db,'pharmcoop.inbox')).map(r=>r.userId).sort()).toEqual([fed,platform].sort());
  await expect(assertCentralContactAccess(db,fed,'synthetic-cooperative','google')).rejects.toMatchObject({status:403});
 });
 it('removes revoked inquiry duties immediately and preserves unrelated service duties',async()=>{
  await db.query("UPDATE central_operation_menu_grants SET menu_keys=ARRAY['supplier.members'] WHERE assignment_id IN(SELECT id FROM role_assignments WHERE user_id=$1)",[central]);
  expect((await centralContactRecipients(db,'supplier.inbox')).map(r=>r.userId)).toEqual([platform]);
  await db.query("UPDATE central_operation_menu_grants SET menu_keys=ARRAY['supplier.inbox'] WHERE assignment_id IN(SELECT id FROM role_assignments WHERE user_id=$1)",[central]);
 });
 it('keeps Drugstore, CarePharm and each cooperative on their own operator recipients',async()=>{
  const drug=randomUUID(),care=randomUUID(),coop=randomUUID(),otherCoop=randomUUID();
  for(const [id,key] of [[drug,'drugstore'],[care,'carepharm']]){
   await db.query(`INSERT INTO users VALUES($1,'active',true,true)`,[id]);
   await db.query(`INSERT INTO service_memberships VALUES($1,'neture','active')`,[id]);
   await db.query('INSERT INTO role_assignments(user_id,role) VALUES($1,$2)',[id,`neture:${key}_operator`]);
  }
  expect(await contactRecipients(db,'drugstore')).toEqual([{userId:drug}]);
  expect(await contactRecipients(db,'carepharm')).toEqual([{userId:care}]);
  await db.query('INSERT INTO cooperative_roles VALUES($1,$2,NULL),($3,$4,NULL)',[coop,local,otherCoop,other]);
  const scope={kind:'cooperative' as const,key:'synthetic-coop',name:'synthetic',serviceKey:'neture',organizationId:randomUUID(),cooperativeId:coop,publicPath:'/contact',managePath:'/operator',taskPath:'/operator'};
  expect(await inboxRecipients(db,scope)).toEqual([{userId:local}]);
  expect(await inboxRecipients(db,{...scope,cooperativeId:otherCoop})).toEqual([{userId:other}]);
 });
 it('hides historical Contact titles without the exact menu and filters count identically',async()=>{
  for(const [service,meta] of [['neture',{contactMessageId:'synthetic'}],['neture',{contactInquiryId:'synthetic'}],['supplier',{contactInquiryId:'synthetic'}],['lecture',{contactInquiryId:'synthetic'}],['neture',{operationMenu:'neture.members'}]])
   await db.query('INSERT INTO notifications VALUES($1,$2,NULL,\'contact.new\',$3)',[central,service,JSON.stringify(meta)]);
  const read=async(keys:string[])=>db.query(`SELECT "serviceKey",metadata FROM notifications WHERE "userId"=$1 AND "serviceKey"=ANY($2::text[]) AND "organizationId" IS NULL AND ${centralNotificationMenuPredicate}`,[central,['neture','supplier','lecture'],keys]);
  expect(await read(['neture.qualifications'])).toHaveLength(0);
  expect(await read(['neture.legacy-contact'])).toHaveLength(1);
  expect(await read(['neture.inbox'])).toHaveLength(1);
  expect(await read(['lecture.contact'])).toHaveLength(1);
  expect(await read(['supplier.inbox'])).toHaveLength(1);
 });
});
