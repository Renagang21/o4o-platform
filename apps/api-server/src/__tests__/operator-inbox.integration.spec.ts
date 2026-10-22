import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ContactInquiry } from '../modules/contact-inquiry/entities/ContactInquiry.entity';
let db:DataSource;
jest.mock('../database/connection.js',()=>({AppDataSource:{get isInitialized(){return !!db?.isInitialized;},query:(...args:any[])=>db.query(args[0],args[1]),getRepository:()=>({})}}));
jest.mock('../services/email.service.js',()=>({emailService:{sendEmail:jest.fn().mockResolvedValue({success:true})}}));
jest.mock('../services/NotificationService.js',()=>({notificationService:{createNotification:jest.fn().mockResolvedValue({})}}));
jest.mock('../middleware/auth.middleware.js',()=>({requireAuth:async(req:any,res:any,next:any)=>{
 const id=req.headers['x-test-user'];if(!id)return res.sendStatus(401);
 const [u]=await db.query(`SELECT id FROM users WHERE id=$1 AND status='active' AND "isActive"=true AND "isEmailVerified"=true`,[id]);if(!u)return res.sendStatus(401);
 const roles=await db.query('SELECT role FROM role_assignments WHERE user_id=$1 AND is_active=true AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>=now())',[id]);
 const memberships=await db.query('SELECT service_key AS "serviceKey",status FROM service_memberships WHERE user_id=$1',[id]);
 if(!memberships.some((m:any)=>m.serviceKey==='neture'))memberships.push({serviceKey:'neture',status:'active'});
 req.user={id,roles:roles.map((r:any)=>r.role),memberships};next();
}}));
import { revokeLectureCertificate } from '../modules/lms/services/certificate-operation.service';
import { emailService } from '../services/email.service';
import { ContactReplyService } from '../modules/contact-inquiry/contact-reply.service';
import { createContentResourceCore } from '../routes/common/content-resource/content-resource-core';
import { createKpaContentResourceConfig } from '../routes/kpa/controllers/kpa-content-resource.config';
import { createOperatorInboxRoutes } from '../modules/contact-inquiry/operator-inbox.routes';
import { resolveInboxScope,inboxRecipients,assertInboxWriter } from '../modules/contact-inquiry/inbox-scope';
import { readInboxTasks } from '../modules/contact-inquiry/inbox-tasks';
import { deliverOperatorNotifications } from '../modules/contact-inquiry/operator-delivery';
import { notificationService } from '../services/NotificationService';
import { AddContactInquiryOrganization1792540800000 } from '../database/migrations/1792540800000-AddContactInquiryOrganization';

const integration=process.env.O4O_OPERATOR_INBOX_PG_TEST==='1'?describe:describe.skip;
integration('operator contact/inbox actual SQL, scope and failure recovery',()=>{
 const central=randomUUID(),local=randomUUID(),other=randomUUID(),fed=randomUUID(),supplier=randomUUID(),funding=randomUUID(),businessOp=randomUUID(),expired=randomUUID();
 const org=randomUUID(),otherOrg=randomUUID(),businessOrg=randomUUID(),coop=randomUUID(),otherCoop=randomUUID(),sf=randomUUID(),otherSf=randomUUID(),business=randomUUID();
 let app:express.Express,contactId:string;
 const base='/api/v1/operator-inbox';
 const payload={name:'Synthetic requester',email:'synthetic@example.invalid',subject:'Synthetic scoped request',message:'Synthetic contact body for isolated verification',privacyConsent:true};
 beforeAll(async()=>{
  db=new DataSource({type:'postgres',host:'127.0.0.1',port:55439,username:'operator_inbox_fixture',database:'o4o_operator_inbox_fixture',entities:[ContactInquiry],synchronize:false});await db.initialize();
  for(const id of [central,local,other,fed,supplier,funding,businessOp,expired])await db.query(`INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,'Synthetic operator','active',true,true)`,[id,`${id}@example.invalid`]);
  for(const [id,code]of [[org,'inbox-coop'],[otherOrg,'inbox-other'],[businessOrg,'inbox-business']])await db.query("INSERT INTO organizations(id,name,code,type) VALUES($1,'Synthetic organization',$2,'supplier')",[id,code]);
  for(const [id,key,organizationId]of [[sf,'cooperative-inbox-a',org],[otherSf,'cooperative-inbox-b',otherOrg],[business,'carepharm',businessOrg]])await db.query("INSERT INTO semi_franchises(id,key,name,organization_id) VALUES($1,$2,'Synthetic business',$3)",[id,key,organizationId]);
  for(const [id,slug,businessId]of [[coop,'inbox-a',sf],[otherCoop,'inbox-b',otherSf]])await db.query("INSERT INTO cooperatives(id,slug,name,semi_franchise_id,status) VALUES($1,$2,'Synthetic cooperative',$3,'active')",[id,slug,businessId]);
  for(const [id,cooperativeId]of [[local,coop],[other,otherCoop]])await db.query("INSERT INTO cooperative_roles(cooperative_id,user_id,role) VALUES($1,$2,'operator')",[cooperativeId,id]);
  for(const [id,role,key]of [[central,'neture:operator','neture'],[fed,'neture:pharmcoop_operator','neture'],[supplier,'supplier:operator','supplier'],[funding,'funding:operator','funding'],[businessOp,'neture:carepharm_operator','neture'],[expired,'supplier:operator','supplier']]){
   await db.query('INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,$2,true)',[id,role]);
   await db.query("INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,$2,'member','active')",[id,key]);
  }
  await db.query("UPDATE role_assignments SET valid_until=now()-interval '1 day' WHERE user_id=$1",[expired]);
  await db.query("DELETE FROM service_memberships WHERE user_id=ANY($1::uuid[]) AND service_key='neture'",[[fed,businessOp]]);
  app=express();app.use(express.json());app.use(base,createOperatorInboxRoutes(db));app.use((e:any,_req:any,res:any,next:any)=>{void next;return res.status(e.httpStatus??500).json({error:e.code??e.message});});
 },60000);
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();});
 it('unauthed manage requests are 401; missing/inactive scopes are 404',async()=>{
  await request(app).get(`${base}/cooperative/inbox-a/manage`).expect(401);
  await request(app).post(`${base}/service/unknown/contact`).send(payload).expect(404);
  await request(app).post(`${base}/cooperative/unknown/contact`).send(payload).expect(404);
 });
 it('rejects invalid/oversized input and honeypot without storing',async()=>{
  const [{count:before}]=await db.query('SELECT COUNT(*)::int AS count FROM contact_inquiries');
  await request(app).post(`${base}/cooperative/inbox-a/contact`).send({...payload,privacyConsent:false}).expect(400);
  await request(app).post(`${base}/cooperative/inbox-a/contact`).send({...payload,name:'x'.repeat(101)}).expect(400);
  await request(app).post(`${base}/cooperative/inbox-a/contact`).send({...payload,company_website:'bot'}).expect(201);
  const [{count:after}]=await db.query('SELECT COUNT(*)::int AS count FROM contact_inquiries');expect(after).toBe(before);
 });
 it('derives organization on server; notifies only local operators',async()=>{
  (notificationService.createNotification as jest.Mock).mockClear();
  const r=await request(app).post(`${base}/cooperative/inbox-a/contact`).send({...payload,organizationId:otherOrg,serviceKey:'funding',sourcePath:'/forged'}).expect(201);contactId=r.body.data.id;
  const [row]=await db.query('SELECT * FROM contact_inquiries WHERE id=$1',[contactId]);expect(row.organization_id).toBe(org);expect(row.service_key).toBe('neture');expect(row.source_path).toBe('/inbox-a/contact');expect(row.notification_status).toBe('inapp:sent');
  expect(notificationService.createNotification).toHaveBeenCalledTimes(1);expect(notificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({userId:local,serviceKey:'pharmcoop',organizationId:org,metadata:expect.objectContaining({targetUrl:'/inbox-a/operator/inbox'})}));
 });
 it('federation and another cooperative operator cannot see local contacts',async()=>{
  await request(app).get(`${base}/cooperative/inbox-a/manage/contacts`).set('x-test-user',fed).expect(403);
  await request(app).get(`${base}/cooperative/inbox-a/manage/contacts/${contactId}`).set('x-test-user',other).expect(403);
  const r=await request(app).get(`${base}/cooperative/inbox-b/manage/contacts`).set('x-test-user',other).expect(200);expect(r.body.data.items).toEqual([]);
  await request(app).get(`${base}/cooperative/inbox-b/manage/contacts/${contactId}`).set('x-test-user',other).expect(404);
 });
 it('updates status and note atomically, records history, rejects stale writes',async()=>{
  const detail=await request(app).get(`${base}/cooperative/inbox-a/manage/contacts/${contactId}`).set('x-test-user',local).expect(200);
  const body={status:'in_review',internalNote:'Synthetic internal note',expectedUpdatedAt:detail.body.data.version};
  await request(app).patch(`${base}/cooperative/inbox-a/manage/contacts/${contactId}`).set('x-test-user',local).send(body).expect(200);
  await request(app).patch(`${base}/cooperative/inbox-a/manage/contacts/${contactId}`).set('x-test-user',local).send({...body,internalNote:'stale'}).expect(409);
  const after=await request(app).get(`${base}/cooperative/inbox-a/manage/contacts/${contactId}`).set('x-test-user',local).expect(200);expect(after.body.data.internalNote).toBe(body.internalNote);expect(after.body.data.history).toHaveLength(1);
 });
 it('actual scoped business roles reach only their own inquiry scope',async()=>{
  const scope=await resolveInboxScope(db,'business','carepharm');expect((await inboxRecipients(db,scope)).map(r=>r.userId)).toEqual([businessOp]);
  await request(app).get(`${base}/business/carepharm/manage`).set('x-test-user',businessOp).expect(200);
  await request(app).get(`${base}/business/carepharm/manage`).set('x-test-user',fed).expect(403);
  await request(app).post(`${base}/business/cooperative-inbox-a/contact`).send(payload).expect(404);
 });
 it('delivers each business inquiry into its host bell scope and an owned inbox route',async()=>{
  for(const [key,serviceKey]of [['carepharm','carepharm'],['pharmacy','kpa-society'],['megapharm','megapharm']]){
   if(key!=='carepharm'){
    const organizationId=randomUUID(),businessId=randomUUID();
    await db.query("INSERT INTO organizations(id,name,code,type) VALUES($1,'Synthetic business',$2,'supplier')",[organizationId,`inbox-${key}`]);
    await db.query("INSERT INTO semi_franchises(id,key,name,organization_id) VALUES($1,$2,'Synthetic business',$3) ON CONFLICT(key) DO UPDATE SET organization_id=EXCLUDED.organization_id,status='active'",[businessId,key,organizationId]);
    await db.query('INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,$2,true)',[businessOp,`neture:${key}_operator`]);
   }
   (notificationService.createNotification as jest.Mock).mockClear();
   const response=await request(app).post(`${base}/business/${key}/contact`).send(payload).expect(201);
   expect(notificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({userId:businessOp,serviceKey,metadata:expect.objectContaining({targetUrl:`/operator/inbox/business/${key}`})}));
   const [row]=await db.query('SELECT service_key,organization_id,notification_status FROM contact_inquiries WHERE id=$1',[response.body.data.id]);
   expect(row.service_key).toBe('neture');expect(row.organization_id).toBeTruthy();expect(row.notification_status).toBe('inapp:sent');
  }
 });
 it('service roles and active membership are isolated, including expired roles',async()=>{
  await request(app).get(`${base}/service/supplier/manage`).set('x-test-user',supplier).expect(200);
  await request(app).get(`${base}/service/supplier/manage`).set('x-test-user',funding).expect(403);
  await request(app).get(`${base}/service/supplier/manage`).set('x-test-user',expired).expect(403);
  expect((await inboxRecipients(db,await resolveInboxScope(db,'service','supplier'))).map(r=>r.userId)).toEqual([supplier]);
  await db.query("UPDATE service_memberships SET status='suspended' WHERE user_id=$1 AND service_key='supplier'",[supplier]);
  await request(app).get(`${base}/service/supplier/manage`).set('x-test-user',supplier).expect(403);
  await db.query("UPDATE service_memberships SET status='active' WHERE user_id=$1 AND service_key='supplier'",[supplier]);
 });
 it('delivery failure preserves contact and exposes an attention count',async()=>{
  (notificationService.createNotification as jest.Mock).mockRejectedValueOnce(new Error('synthetic transport failure'));
  const r=await request(app).post(`${base}/cooperative/inbox-a/contact`).send(payload).expect(201);
  const [row]=await db.query('SELECT notification_status FROM contact_inquiries WHERE id=$1',[r.body.data.id]);expect(row.notification_status).toBe('inapp:fail');
  const summary=await request(app).get(`${base}/cooperative/inbox-a/manage`).set('x-test-user',local).expect(200);expect(summary.body.data.contact.deliveryAttention).toBe(1);
 });
 it('all service/business/cooperative task SQL works on actual canonical schema',async()=>{
  for(const key of ['neture','supplier','funding','community','lecture','store','pharmcoop']){
   const scope=await resolveInboxScope(db,'service',key);const tasks=await readInboxTasks(db,scope);expect(tasks.filter(t=>!t.available).map(t=>`${key}:${t.key}`)).toEqual([]);
  }
  for(const [kind,key]of [['business','carepharm'],['cooperative','inbox-a']])expect((await readInboxTasks(db,await resolveInboxScope(db,kind,key))).filter(t=>!t.available)).toEqual([]);
 });
 it('pending membership and withdrawal tasks disappear after actual resolution',async()=>{
  await db.query("INSERT INTO cooperative_memberships(cooperative_id,user_id,status) VALUES($1,$2,'pending')",[coop,supplier]);
  let tasks=await readInboxTasks(db,await resolveInboxScope(db,'cooperative','inbox-a'));expect(tasks.find(t=>t.key==='cooperative-members')?.count).toBe(1);
  await db.query("UPDATE cooperative_memberships SET status='active' WHERE cooperative_id=$1 AND user_id=$2",[coop,supplier]);
  await db.query("INSERT INTO cooperative_management_events(cooperative_id,actor_id,subject_id,action,reason) VALUES($1,$2,$2,'member_request_withdraw','Synthetic withdrawal')",[coop,supplier]);
  tasks=await readInboxTasks(db,await resolveInboxScope(db,'cooperative','inbox-a'));expect(tasks.find(t=>t.key==='withdrawals')?.count).toBe(1);
  await db.query("UPDATE cooperative_memberships SET status='withdrawn' WHERE cooperative_id=$1 AND user_id=$2",[coop,supplier]);
  tasks=await readInboxTasks(db,await resolveInboxScope(db,'cooperative','inbox-a'));expect(tasks.find(t=>t.key==='withdrawals')?.count).toBe(0);
 });
 it('write recheck rejects a revoked local role after resolving a valid scope',async()=>{
  const scope=await resolveInboxScope(db,'cooperative','inbox-a');
  await db.query('UPDATE cooperative_roles SET revoked_at=now() WHERE cooperative_id=$1 AND user_id=$2',[coop,local]);
  try{await expect(db.transaction(m=>assertInboxWriter(m,scope,local))).rejects.toThrow('권한');}
  finally{await db.query('UPDATE cooperative_roles SET revoked_at=NULL WHERE cooperative_id=$1 AND user_id=$2',[coop,local]);}
 });
 it('alerts central operations without exposing an unassigned inquiry',async()=>{
  (notificationService.createNotification as jest.Mock).mockClear();
  await request(app).post(`${base}/service/store/contact`).send(payload).expect(308).expect('Location','/api/v1/public/services/store/contact-inquiries');
  await db.query('UPDATE cooperative_roles SET revoked_at=now() WHERE cooperative_id=$1 AND user_id=$2',[otherCoop,other]);
  const r=await request(app).post(`${base}/cooperative/inbox-b/contact`).send(payload).expect(201);
  await db.query('UPDATE cooperative_roles SET revoked_at=NULL WHERE cooperative_id=$1 AND user_id=$2',[otherCoop,other]);
  const [row]=await db.query('SELECT notification_status FROM contact_inquiries WHERE id=$1',[r.body.data.id]);expect(row.notification_status).toBe('inapp:none;assignment:sent');
  const alerts=(notificationService.createNotification as jest.Mock).mock.calls.map(args=>args[0]);
  expect(alerts).toHaveLength(1);expect(alerts[0]).toMatchObject({userId:central,serviceKey:'neture',metadata:{assignmentRequired:true,targetUrl:'/operator',scopeKind:'cooperative',scopeKey:'inbox-b'}});
  for(const privateValue of [r.body.data.id,payload.subject,payload.message,payload.email])expect(JSON.stringify(alerts[0])).not.toContain(privateValue);
  await request(app).get(`${base}/cooperative/inbox-b/manage/contacts/${r.body.data.id}`).set('x-test-user',central).expect(403);
 });
 it('preserves receipt and exposes central assignment notification failure',async()=>{
  await db.query('UPDATE cooperative_roles SET revoked_at=now() WHERE cooperative_id=$1 AND user_id=$2',[otherCoop,other]);
  (notificationService.createNotification as jest.Mock).mockRejectedValueOnce(Error('synthetic central delivery failure'));
  const r=await request(app).post(`${base}/cooperative/inbox-b/contact`).send(payload).expect(201);
  const [row]=await db.query('SELECT notification_status FROM contact_inquiries WHERE id=$1',[r.body.data.id]);expect(row.notification_status).toBe('inapp:none;assignment:fail');
  await db.query('UPDATE cooperative_roles SET revoked_at=NULL WHERE cooperative_id=$1 AND user_id=$2',[otherCoop,other]);
  const s=await request(app).get(`${base}/cooperative/inbox-b/manage`).set('x-test-user',other).expect(200);expect(s.body.data.contact.deliveryAttention).toBeGreaterThan(0);
 });
 it('contact processing history includes the scoped actor and note after reload',async()=>{
  const receipt=await request(app).post(`${base}/cooperative/inbox-a/contact`).send(payload).expect(201);
  const url=`${base}/cooperative/inbox-a/manage/contacts/${receipt.body.data.id}`;
  const before=await request(app).get(url).set('x-test-user',local).expect(200);
  await request(app).patch(url).set('x-test-user',local).send({status:'in_review',internalNote:'Synthetic processing reason',expectedUpdatedAt:before.body.data.version}).expect(200);
  const after=await request(app).get(url).set('x-test-user',local).expect(200);
  expect(after.body.data.history[0]).toMatchObject({actorId:local,beforeStatus:'received',afterStatus:'in_review',afterNote:'Synthetic processing reason'});
 });
 it('scoped replies preserve organization privacy, idempotency, failed status and visible history',async()=>{
  const receipt=await request(app).post(`${base}/cooperative/inbox-a/contact`).send(payload).expect(201);
  const id=receipt.body.data.id, body={requestId:randomUUID(),message:'Synthetic answer <script>'};
  const url=`${base}/cooperative/inbox-a/manage/contacts/${id}/replies`;
  (emailService.sendEmail as jest.Mock).mockClear();
  await request(app).post(url).set('x-test-user',fed).send(body).expect(403);
  await request(app).post(`${base}/cooperative/inbox-b/manage/contacts/${id}/replies`).set('x-test-user',other).send(body).expect(404);
  await request(app).post(url).set('x-test-user',local).send(body).expect(200);
  await request(app).post(url).set('x-test-user',local).send(body).expect(200);
  expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  expect((emailService.sendEmail as jest.Mock).mock.calls[0][0].html).toContain('&lt;script&gt;');
  const detail=await request(app).get(url.replace('/replies','')).set('x-test-user',local).expect(200);
  expect(detail.body.data.status).toBe('answered');expect(detail.body.data.replies[0]).toMatchObject({status:'sent',message:body.message});
  expect(await new ContactReplyService(db).history('neture',id)).toEqual([]);
  (emailService.sendEmail as jest.Mock).mockResolvedValueOnce({success:false});
  const failed=await request(app).post(`${base}/cooperative/inbox-a/contact`).send(payload).expect(201);
  const failure=await request(app).post(`${base}/cooperative/inbox-a/manage/contacts/${failed.body.data.id}/replies`).set('x-test-user',local).send({...body,requestId:randomUUID()}).expect(200);
  expect(failure.body.data.status).toBe('failed');
  expect((await db.query('SELECT status FROM contact_inquiries WHERE id=$1',[failed.body.data.id]))[0].status).toBe('received');
 });
 it('concurrent repair deduplicates durable notifications and assigned recipients receive old undelivered receipts',async()=>{
  const receipt=await request(app).post(`${base}/cooperative/inbox-b/contact`).send(payload).expect(201);
  const id=receipt.body.data.id,url=`${base}/cooperative/inbox-b/manage/contacts/${id}/retry-notification`;
  await request(app).post(url).set('x-test-user',local).expect(403);
  const responses=await Promise.all([1,2].map(()=>request(app).post(url).set('x-test-user',other).send({})));
  expect(responses.map(r=>r.status)).toEqual([200,200]);expect(responses.reduce((n,r)=>n+r.body.data.created,0)).toBe(1);
  expect((await db.query(`SELECT COUNT(*)::int AS n FROM notifications WHERE metadata->>'contactInquiryId'=$1`,[id]))[0].n).toBe(1);
  await db.query("UPDATE contact_inquiries SET notification_status='inapp:fail' WHERE id=$1",[id]);
  const filter=await request(app).get(`${base}/cooperative/inbox-b/manage/contacts?status=delivery`).set('x-test-user',other).expect(200);
  expect(filter.body.data.items.some((r:any)=>r.id===id)).toBe(true);
  await request(app).post(url).set('x-test-user',other).expect(200);
  await db.query('UPDATE cooperative_roles SET revoked_at=now() WHERE cooperative_id=$1 AND user_id=$2',[otherCoop,other]);
  await request(app).post(url).set('x-test-user',other).expect(403);
  await db.query('UPDATE cooperative_roles SET revoked_at=NULL WHERE cooperative_id=$1 AND user_id=$2',[otherCoop,other]);
 });
 it('required resource audit failure rolls back the actual resource state',async()=>{
  await db.query('CREATE TABLE operator_daily_resources(id uuid PRIMARY KEY,title text,status text,is_deleted boolean DEFAULT false,updated_at timestamp DEFAULT now())');
  const id=randomUUID();await db.query("INSERT INTO operator_daily_resources(id,title,status) VALUES($1,'Synthetic resource','draft')",[id]);
  let failAudit=true;
  const config={...createKpaContentResourceConfig({mapCmsStatus:s=>s,audit:async()=>{throw Error('legacy hook must not run');},atomicAudit:async(manager)=>{if(failAudit)throw Error('Synthetic required audit failure');await manager.query("INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta) VALUES('kpa-society',$1,'resource-test','manual','success','{}')",[local]);}}),tableName:'operator_daily_resources'};
  const core=createContentResourceCore(db,config);
  const response=()=>{const res:any={status:jest.fn(()=>res),json:jest.fn(()=>res)};return res;};
  const req:any={params:{id},body:{status:'published'},user:{id:local,roles:['kpa:operator']}};
  const res=response();await core.operatorUpdateStatus(req,res);expect(res.status).toHaveBeenCalledWith(500);
  expect((await db.query('SELECT status FROM operator_daily_resources WHERE id=$1',[id]))[0].status).toBe('draft');
  failAudit=false;await core.operatorUpdateStatus(req,response());expect((await db.query('SELECT status FROM operator_daily_resources WHERE id=$1',[id]))[0].status).toBe('published');
  failAudit=true;await core.operatorRemove(req,response());expect((await db.query('SELECT is_deleted FROM operator_daily_resources WHERE id=$1',[id]))[0].is_deleted).toBe(false);
 });
 it('service notification repair respects disabled settings, preserves email receipts and rejects unresolved claims',async()=>{
  const [receipt]=await db.query(`INSERT INTO contact_inquiries(service_key,inquiry_type,name,email,subject,message,privacy_consent,notification_status)
    VALUES('supplier','other','Synthetic requester','synthetic@example.invalid','Synthetic question','Synthetic inquiry body',true,'inapp:fail;email:sent;autoreply:sent') RETURNING id`);
  await db.query("INSERT INTO service_contact_settings(service_key,in_app_notification_enabled) VALUES('supplier',false) ON CONFLICT(service_key) DO UPDATE SET in_app_notification_enabled=false");
  const url=`${base}/service/supplier/manage/contacts/${receipt.id}/retry-notification`;
  expect((await request(app).post(url).set('x-test-user',supplier).expect(200)).body.data.status).toBe('off');
  await db.query("UPDATE service_contact_settings SET in_app_notification_enabled=true WHERE service_key='supplier'");
  const repaired=await request(app).post(url).set('x-test-user',supplier).expect(200);expect(repaired.body.data.created).toBe(1);
  expect((await db.query('SELECT notification_status FROM contact_inquiries WHERE id=$1',[receipt.id]))[0].notification_status).toBe('inapp:sent;email:sent;autoreply:sent');
  await db.query("UPDATE contact_inquiries SET notification_status='sending:synthetic;email:sent' WHERE id=$1",[receipt.id]);
  await request(app).post(url).set('x-test-user',supplier).expect(409);
 });
 it('certificate reason is private and atomic; concurrent repeat records one revocation, wrong service and revoked roles fail',async()=>{
  const actor=randomUUID(),course=randomUUID(),foreign=randomUUID(),certificate=randomUUID(),foreignCert=randomUUID();
  await db.query(`INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,'Synthetic lecture operator','active',true,true)`,[actor,`${actor}@example.invalid`]);
  await db.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'lecture:operator',true)",[actor]);
  await db.query("INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'lecture','member','active')",[actor]);
  for(const [id,key]of [[course,'lecture'],[foreign,'kpa-society']])await db.query("INSERT INTO lms_courses(id,title,service_key) VALUES($1,'Synthetic course',$2)",[id,key]);
  for(const [id,courseId]of [[certificate,course],[foreignCert,foreign]])await db.query(`INSERT INTO lms_certificates(id,"userId","courseId","certificateNumber","completedAt") VALUES($1::uuid,$2,$3,$4,now())`,[id,actor,courseId,id]);
  await expect(revokeLectureCertificate(db,foreignCert,actor,'Synthetic reason')).rejects.toMatchObject({status:404});
  await db.query(`CREATE FUNCTION reject_synthetic_certificate_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_key='lecture.certificate_revoke' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$`);
  await db.query('CREATE TRIGGER reject_synthetic_certificate_audit BEFORE INSERT ON action_logs FOR EACH ROW EXECUTE FUNCTION reject_synthetic_certificate_audit()');
  await expect(revokeLectureCertificate(db,certificate,actor,'Synthetic reason')).rejects.toThrow('Synthetic audit failure');
  expect((await db.query('SELECT "isValid" FROM lms_certificates WHERE id=$1',[certificate]))[0].isValid).toBe(true);
  await db.query('DROP TRIGGER reject_synthetic_certificate_audit ON action_logs');await db.query('DROP FUNCTION reject_synthetic_certificate_audit()');
  await Promise.all([1,2].map(()=>revokeLectureCertificate(db,certificate,actor,'Synthetic reason')));
  const logs=await db.query("SELECT meta FROM action_logs WHERE action_key='lecture.certificate_revoke' AND meta->>'certificateId'=$1",[certificate]);
  expect(logs).toHaveLength(1);expect(logs[0].meta.reason).toBe('Synthetic reason');
  expect((await db.query('SELECT metadata FROM lms_certificates WHERE id=$1',[certificate]))[0].metadata).toBeNull();
  await db.query("UPDATE role_assignments SET is_active=false WHERE user_id=$1 AND role='lecture:operator'",[actor]);
  await expect(revokeLectureCertificate(db,certificate,actor,'Other reason')).rejects.toMatchObject({httpStatus:403});
 });
 it('migration refuses a down that would expose scoped contacts',async()=>{
  const q=db.createQueryRunner();try{await expect(new AddContactInquiryOrganization1792540800000().down(q)).rejects.toThrow('SCOPED_CONTACT_INQUIRIES_EXIST');}finally{await q.release();}
 });
});
describe('operator notification delivery',()=>{
 it('reports none, fail, partial and sent without truncating recipients',async()=>{
  expect(await deliverOperatorNotifications([],async()=>{})).toBe('none');
  expect(await deliverOperatorNotifications([1],async()=>{throw Error('fixture');})).toBe('fail');
  expect(await deliverOperatorNotifications([1,2],async n=>{if(n===2)throw Error('fixture');})).toBe('partial');
  const send=jest.fn().mockResolvedValue({});expect(await deliverOperatorNotifications(Array.from({length:75},(_,i)=>i),send)).toBe('sent');expect(send).toHaveBeenCalledTimes(75);
 });
 it('query failure remains visible instead of an empty queue',async()=>{
  const ds={query:jest.fn().mockRejectedValue(Error('fixture'))};const scope={kind:'service' as const,key:'supplier',serviceKey:'supplier',name:'supplier',organizationId:null,publicPath:'/contact',managePath:'/operator/inbox/supplier',taskPath:'/operator/inbox/supplier'};
  expect((await readInboxTasks(ds,scope)).every(t=>!t.available&&t.count===null)).toBe(true);
 });
});
