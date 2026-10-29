import express, {type RequestHandler} from 'express';
import request from 'supertest';
const query=jest.fn();
jest.mock('../../database/connection.js',()=>({AppDataSource:{query:(...args:unknown[])=>query(...args),transaction:async(...args:any[])=>args.at(-1)({query:(...params:unknown[])=>query(...params)})}}));
import { createCommunityManagementRoutes } from '../community-management.routes.js';
const id='11111111-1111-4111-8111-111111111111';
const authenticate:RequestHandler=(req,res,next)=>{if(!req.headers['x-test-user']){res.status(401).json({code:'AUTH_REQUIRED'});return;}(req as any).user={id};next();};
function app(){const a=express();a.use(express.json());a.use('/communities',createCommunityManagementRoutes(authenticate));return a;}
beforeEach(()=>{
 query.mockReset().mockImplementation(async(sql:string,args:unknown[])=>{
  if(sql.includes('AS verified FROM users'))return[{status:'active',active:true,verified:true}];
  if(sql.startsWith('SELECT id, status FROM service_memberships'))return[{id,status:'active'}];
  if(sql.includes('FROM role_assignments ra'))return args[1]?[]:[{id}];
  if(sql.includes('SELECT id,name,status'))return[{id,name:'게시판',status:'completed'}];
  return[];
 });
});
it.each(['get','patch','delete'] as const)('requires a session for direct %s management calls',async method=>{
 const suffix=method==='get'?'':method==='patch'?`/${id}/status`:`/${id}`;
 expect((await request(app())[method]('/communities/community/management/boards'+suffix)).status).toBe(401);
 expect(query).not.toHaveBeenCalled();
});
it('operator can list boards, but cannot preview or execute admin deletion',async()=>{
 expect((await request(app()).get('/communities/community/management/boards').set('x-test-user','yes')).status).toBe(200);
 for(const path of [`/${id}/deletion-plan`,`/${id}`]){
  const req=path.endsWith('deletion-plan')?request(app()).get('/communities/community/management/boards'+path):request(app()).delete('/communities/community/management/boards'+path).send({expectedDigest:'a'.repeat(64)});
  const res=await req.set('x-test-user','yes');expect(res.status).toBe(403);expect(res.body.code).toBe('COMMUNITY_ADMIN_REQUIRED');
 }
 expect(query.mock.calls.some(([sql])=>/^DELETE|^UPDATE/.test(sql))).toBe(false);
});
it('cannot select business/retired service management through path or body',async()=>{
 for(const key of ['business:fixture','pharmacy','cosmetics','o4o-general'])expect((await request(app()).delete(`/communities/${key}/management/boards/${id}`).set('x-test-user','yes').send({serviceCode:'community'})).status).toBe(404);
 expect(query).not.toHaveBeenCalled();
});
it('rejects malformed resource identifiers without business data reads or writes',async()=>{
 expect((await request(app()).delete('/communities/community/management/members/invalid').set('x-test-user','yes')).status).toBe(400);
 expect(query).toHaveBeenCalledTimes(1);
 expect(query.mock.calls[0][0]).toContain('SELECT 1 FROM role_assignments WHERE user_id=$1 AND scope_type=$2');
});
