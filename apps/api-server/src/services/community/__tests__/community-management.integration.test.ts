import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { setCommunityBoardStatus, planCommunityDeletion, applyCommunityDeletion } from '../community-management.service.js';
const fixture=process.env.COMMUNITY_TEST_PG_SOCKET;
(fixture ? describe : describe.skip)('community operations and admin deletion (PostgreSQL)',()=>{
 const schema=`community_management_${randomUUID().replaceAll('-','')}`;
 let db: DataSource;
 let admin:string,operator:string,member:string,other:string,board:string,foreign:string;
 beforeAll(async()=>{
  db=new DataSource({type:'postgres',host:fixture!,port:5543,username:'agent',database:'postgres',entities:[],extra:{options:`-c search_path=${schema}`,max:4}});
  await db.initialize();await db.query(`CREATE SCHEMA ${schema}`);
  const ddl=[
   'users(id uuid PRIMARY KEY,status text,"isActive" boolean,"isEmailVerified" boolean)',
   'service_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,service_key text,status text)',
   'role_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,role text,is_active boolean DEFAULT true,valid_from timestamptz DEFAULT NOW(),valid_until timestamptz)',
   "forum_category_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),service_code text,organization_id uuid,requester_id uuid,name text,status text,metadata jsonb DEFAULT '{}',updated_at timestamptz DEFAULT NOW())",
   `forum_post(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),forum_id uuid REFERENCES forum_category_requests(id),author_id uuid,organization_id uuid,is_organization_exclusive boolean DEFAULT false,content jsonb DEFAULT '[]',metadata jsonb DEFAULT '{}',"commentCount" int DEFAULT 0,"likeCount" int DEFAULT 0)`,
   `forum_comment(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"postId" uuid REFERENCES forum_post(id) ON DELETE CASCADE,author_id uuid,"parentId" uuid REFERENCES forum_comment(id) ON DELETE CASCADE,status text DEFAULT 'publish',"likeCount" int DEFAULT 0,"replyCount" int DEFAULT 0)`,
   'forum_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"postId" uuid,"commentId" uuid,"userId" uuid,"actorId" uuid)',
   'forum_like(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"targetType" text,"targetId" uuid,"userId" uuid)',
   'forum_bookmark(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"postId" uuid,"userId" uuid)',
   'forum_post_like(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),post_id uuid,user_id uuid)',
   'forum_category_members(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),forum_category_id uuid REFERENCES forum_category_requests(id),user_id uuid,role text DEFAULT \'member\')',
   'forum_join_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),forum_category_id uuid REFERENCES forum_category_requests(id),user_id uuid)',
   'action_logs(service_key text,user_id uuid,action_key text,source text,status text,meta jsonb)',
  ];
  for(const table of ddl)await db.query(`CREATE TABLE ${table}`);
 });
 afterAll(async()=>{if(db?.isInitialized){await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.destroy();}});
 beforeEach(async()=>{
  await db.query('TRUNCATE users,service_memberships,role_assignments,forum_category_requests,forum_post,forum_comment,forum_notifications,forum_like,forum_bookmark,forum_post_like,forum_category_members,forum_join_requests,action_logs CASCADE');
  [admin,operator,member,other,board,foreign]=Array.from({length:6},()=>randomUUID());
  for(const id of [admin,operator,member,other])await db.query(`INSERT INTO users VALUES($1,'active',true,true)`,[id]);
  for(const [id,status] of [[admin,'active'],[operator,'active'],[member,'suspended'],[other,'active']])await db.query(`INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'community',$2)`,[id,status]);
  await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'community:admin'),($2,'community:operator'),($3,'community:member')`,[admin,operator,member]);
  await db.query(`INSERT INTO forum_category_requests(id,service_code,name,status,requester_id) VALUES($1,'community','board','completed',$3),($2,'sf:fixture','foreign','completed',$3)`,[board,foreign,other]);
 });
 const plan=(actor:string,kind:'boards'|'members',id:string)=>db.transaction('REPEATABLE READ',m=>planCommunityDeletion(m,actor,kind,id));
 const apply=(actor:string,kind:'boards'|'members',id:string,digest:string)=>db.transaction('SERIALIZABLE',m=>applyCommunityDeletion(m,actor,kind,id,digest));
 async function post(forum=board,author=member){const id=randomUUID();await db.query('INSERT INTO forum_post(id,forum_id,author_id) VALUES($1,$2,$3)',[id,forum,author]);return id;}
 it('operator suspends and reopens a board while retaining its posts',async()=>{
  const id=await post();for(const status of ['archived','completed'])await db.transaction(m=>setCommunityBoardStatus(m,operator,board,status));
  expect(await db.query('SELECT id FROM forum_post')).toEqual([{id}]);
 });
 it.each(['community:operator','neture:admin','platform:super_admin'])('denies permanent deletion to %s',async role=>{
  await db.query('UPDATE role_assignments SET role=$2 WHERE user_id=$1',[operator,role]);
  await expect(plan(operator,'boards',board)).rejects.toMatchObject({code:'COMMUNITY_ADMIN_REQUIRED'});
  await expect(apply(operator,'boards',board,'a'.repeat(64))).rejects.toMatchObject({code:'COMMUNITY_ADMIN_REQUIRED'});
 });
 it('blocks suspended memberships and expired admin roles',async()=>{
  await db.query(`UPDATE service_memberships SET status='suspended' WHERE user_id=$1`,[admin]);
  await expect(plan(admin,'boards',board)).rejects.toMatchObject({status:403});
  await db.query(`UPDATE service_memberships SET status='active' WHERE user_id=$1`,[admin]);
  await db.query(`UPDATE role_assignments SET valid_until=NOW()-INTERVAL '1 minute' WHERE user_id=$1`,[admin]);
  await expect(plan(admin,'boards',board)).rejects.toMatchObject({status:403});
 });
 it('denies both tiers access to business-owned boards',async()=>{
  await expect(db.transaction(m=>setCommunityBoardStatus(m,operator,foreign,'archived'))).rejects.toMatchObject({status:404});
  await expect(plan(admin,'boards',foreign)).rejects.toMatchObject({status:404});
 });
 it('requires suspension then purges forum dependents while retaining other services',async()=>{
  const own=await post(),outside=await post(foreign),comment=randomUUID();
  await db.query('INSERT INTO forum_comment(id,"postId",author_id) VALUES($1,$2,$3)',[comment,own,other]);
  await db.query(`INSERT INTO forum_like("targetType","targetId","userId") VALUES('comment',$1,$2)`,[comment,other]);
  await db.query('INSERT INTO forum_bookmark("postId","userId") VALUES($1,$2)',[own,other]);
  await db.query('INSERT INTO forum_join_requests(forum_category_id,user_id) VALUES($1,$2)',[board,other]);
  const live=await plan(admin,'boards',board);expect(live.blockers.length).toBeGreaterThan(0);
  await expect(apply(admin,'boards',board,live.digest)).rejects.toMatchObject({code:'DELETION_BLOCKED'});
  await db.transaction(m=>setCommunityBoardStatus(m,operator,board,'archived'));
  const p=await plan(admin,'boards',board);expect(p.blockers).toEqual([]);await apply(admin,'boards',board,p.digest);
  expect(await db.query('SELECT id FROM forum_post')).toEqual([{id:outside}]);
  for(const t of ['forum_comment','forum_like','forum_bookmark','forum_join_requests'])expect(await db.query(`SELECT * FROM ${t}`)).toHaveLength(0);
  expect(await db.query('SELECT * FROM users')).toHaveLength(4);
  expect(await db.query(`SELECT * FROM action_logs WHERE action_key='community:permanent_delete'`)).toHaveLength(1);
 });
 it('rejects stale plans, media and unexpected cascading foreign references',async()=>{
  await db.transaction(m=>setCommunityBoardStatus(m,operator,board,'archived'));
  const p=await plan(admin,'boards',board),id=await post();
  await expect(apply(admin,'boards',board,p.digest)).rejects.toMatchObject({code:'DELETION_PLAN_CHANGED'});
  await db.query(`UPDATE forum_post SET content='"/uploads/fixture"' WHERE id=$1`,[id]);
  expect((await plan(admin,'boards',board)).blockers.length).toBeGreaterThan(0);
  await db.query(`UPDATE forum_post SET content='[]' WHERE id=$1`,[id]);
  await db.query('CREATE TABLE unexpected(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),post_id uuid REFERENCES forum_post(id) ON DELETE CASCADE)');
  try{await db.query('INSERT INTO unexpected(post_id) VALUES($1)',[id]);expect((await plan(admin,'boards',board)).blockers.length).toBeGreaterThan(0);}
  finally{await db.query('DROP TABLE unexpected');}
 });
 it('purges member activity only in community; retains common identity, other membership and foreign posts',async()=>{
  const own=await post(),outside=await post(foreign),surviving=await post(board,other),comment=randomUUID();
  await db.query('INSERT INTO forum_comment(id,"postId",author_id) VALUES($1,$2,$3)',[comment,surviving,member]);
  await db.query('INSERT INTO forum_comment("postId",author_id,"parentId") VALUES($1,$2,$3)',[surviving,other,comment]);
  await db.query('INSERT INTO forum_post_like(post_id,user_id) VALUES($1,$2)',[surviving,member]);
  const parent=randomUUID();
  await db.query('INSERT INTO forum_comment(id,"postId",author_id,"likeCount","replyCount") VALUES($1,$2,$3,2,1)',[parent,surviving,other]);
  await db.query('UPDATE forum_comment SET "parentId"=$1 WHERE id=$2',[parent,comment]);
  await db.query(`INSERT INTO forum_like("targetType","targetId","userId") VALUES('comment',$1,$2),('comment',$1,$3)`,[parent,member,other]);
  await db.query(`INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','active')`,[member]);
  await db.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'community:operator',false)",[member]);
  const p=await plan(admin,'members',member);expect(p.blockers).toEqual([]);expect(p.counts.forum_comment).toBe(2);await apply(admin,'members',member,p.digest);
  expect(await db.query('SELECT id FROM forum_post ORDER BY id')).toEqual([{id:outside},{id:surviving}].sort((a,b)=>a.id.localeCompare(b.id)));
  expect(await db.query('SELECT id FROM users WHERE id=$1',[member])).toEqual([{id:member}]);
  expect(await db.query('SELECT service_key FROM service_memberships WHERE user_id=$1',[member])).toEqual([{service_key:'neture'}]);
  expect(await db.query('SELECT id FROM forum_post WHERE id=$1',[own])).toHaveLength(0);
  expect(await db.query('SELECT "commentCount","likeCount" FROM forum_post WHERE id=$1',[surviving])).toEqual([{commentCount:1,likeCount:0}]);
  expect(await db.query('SELECT "replyCount","likeCount" FROM forum_comment WHERE id=$1',[parent])).toEqual([{replyCount:0,likeCount:1}]);
 });
 it('blocks owned boards and operational accounts from member deletion',async()=>{
  await db.query('UPDATE forum_category_requests SET requester_id=$1 WHERE id=$2',[member,board]);
  expect((await plan(admin,'members',member)).blockers.length).toBeGreaterThan(0);
  await db.query('UPDATE forum_category_requests SET requester_id=$1 WHERE id=$2',[other,board]);
  await db.query("INSERT INTO forum_category_members(forum_category_id,user_id,role) VALUES($1,$2,'owner')",[board,member]);
  expect((await plan(admin,'members',member)).blockers.length).toBeGreaterThan(0);
  expect((await plan(admin,'members',operator)).blockers.length).toBeGreaterThan(0);
 });
 it('rolls back the purge if audit logging fails',async()=>{
  await db.transaction(m=>setCommunityBoardStatus(m,operator,board,'archived'));const id=await post(),p=await plan(admin,'boards',board);
  await db.query(`ALTER TABLE action_logs ADD CONSTRAINT reject_delete CHECK(action_key<>'community:permanent_delete')`);
  try{await expect(apply(admin,'boards',board,p.digest)).rejects.toThrow();}finally{await db.query('ALTER TABLE action_logs DROP CONSTRAINT reject_delete');}
  expect(await db.query('SELECT id FROM forum_post')).toEqual([{id}]);
 });
});
