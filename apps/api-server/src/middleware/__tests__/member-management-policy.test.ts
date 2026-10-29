import express from 'express';
import request from 'supertest';
const query = jest.fn();
jest.mock('../../database/connection.js', () => ({ AppDataSource: { query: (...args: any[]) => query(...args) } }));
import { memberManagementPolicy, requireActiveOperatorScope } from '../member-management-policy.middleware.js';
import * as grants from '../../services/admin/central-operation-menu-grants.js';

function check(method: string, path: string, body: any, roles = ['neture:operator'], keys = ['neture'], queryParams = {}) {
  const req: any = { method, path, body, query: queryParams, user: { roles }, serviceScope: { serviceKeys: keys, rolePrefixes: keys, isPlatformAdmin: roles.includes('platform:super_admin') } };
  const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res);
  const next = jest.fn(); memberManagementPolicy(req, res, next);
  return { req, res, next };
}

it.each([['DELETE', '/u', {}], ['PATCH', '/u/status', { status: 'withdrawn' }]])('operator cannot perform %s %s', (method, path, body) => {
  const { res, next } = check(method, path, body);
  expect(res.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled();
});
it.each([['POST', '/u/reactivate', {}], ['PATCH', '/u/status', { status: 'suspended' }], ['POST', '/batch-status', { status: 'suspended' }], ['PUT', '/u', { membershipRole: 'member' }], ['POST', '/u/roles', { role: 'neture:member' }], ['DELETE', '/u/roles/neture%3Amember', {}], ['PATCH', '/m/approve', {}], ['PATCH', '/m/reject', {}], ['GET', '/u', {}], ['GET', '/roles', {}], ['PUT', '/u', { nickname: 'fixture' }], ['PATCH', '/u/status', { status: 'approved' }]])('operator retains %s %s', (method, path, body) => {
  const { req, next } = check(method, path, body);
  expect(next).toHaveBeenCalledTimes(1); expect(req.memberManagementApprovalOnly).toBe(false);
});
it('admin of another service does not prevent daily work in an operator-owned service', () => {
  const { res, next } = check('PATCH', '/u/status', { status: 'suspended', serviceKey: 'neture' }, ['neture:operator', 'pharmacy-hub:admin'], ['neture', 'pharmacy-hub']);
  expect(res.status).not.toHaveBeenCalled(); expect(next).toHaveBeenCalledTimes(1);
});
it.each(['neture:admin', 'platform:super_admin'])('%s can administer selected membership', role => {
  const { req, next } = check('POST', '/u/reactivate', { serviceKey: 'neture' }, [role]);
  expect(next).toHaveBeenCalledTimes(1); expect(req.memberManagementApprovalOnly).toBe(false);
});

it('active DB membership narrows mixed operator scope despite a stale active token', async () => {
  query.mockImplementation(async (sql:string)=>sql.includes('role_assignments') ? [] : [{service_key:'neture'}]);
  const req: any = { originalUrl:'/api/v1/operator/members',method:'GET',user: { id: 'actor' }, serviceScope: { isPlatformAdmin: false, serviceKeys: ['neture', 'kpa-society'], rolePrefixes: ['neture', 'kpa'] } };
  const next = jest.fn(); const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res);
  await requireActiveOperatorScope(req, res, next);
  expect(req.serviceScope.serviceKeys).toEqual(['neture']); expect(req.serviceScope.rolePrefixes).toEqual(['neture']);
  expect(next).toHaveBeenCalledTimes(1);
});
it.each([false, true])('inactive membership or DB failure is fail-closed (%s)', async fails => {
  query.mockReset(); if (fails) query.mockRejectedValue(new Error('fixture')); else query.mockResolvedValue([]);
  const req: any = { user: { id: 'actor' }, serviceScope: { isPlatformAdmin: false, serviceKeys: ['neture'], rolePrefixes: ['neture'] } };
  const next = jest.fn(); const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res);
  await requireActiveOperatorScope(req, res, next);
  expect(next).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(fails ? 503 : 403);
});

it('checks the separate Admin cleanup duty for hard relationship removal',async()=>{
 query.mockReset().mockResolvedValue([{service_key:'neture'}]);
 const check=jest.spyOn(grants,'assertCentralOperationRequest').mockResolvedValue(undefined);
 try {
  const req:any={originalUrl:'/api/v1/operator/members/fixture?serviceKey=neture&mode=hard',method:'DELETE',authMethod:'google',user:{id:'actor'},serviceScope:{isPlatformAdmin:false,serviceKeys:['neture'],rolePrefixes:['neture']}};
  const res:any={status:jest.fn(),json:jest.fn()};res.status.mockReturnValue(res);const next=jest.fn();
  await requireActiveOperatorScope(req,res,next);
  expect(check).toHaveBeenCalledWith(expect.anything(),'actor','neture',['neture.membership-cleanup'],'google');
  expect(next).toHaveBeenCalledTimes(1);
 } finally {check.mockRestore();}
});

it.each([['neture', 'neture'], ['kpa-society', 'kpa'], ['k-cosmetics', 'cosmetics'], ['pharmacy-hub', 'pharmacy-hub'], ['kpa-branch', 'kpa-branch'], ['community', 'community'], ['lecture', 'lecture'], ['supplier', 'supplier'], ['funding', 'funding']])('%s lifecycle privilege follows the correct %s role namespace', (serviceKey, prefix) => {
  expect(check('PATCH', '/u/status', { status: 'suspended', serviceKey }, [`${prefix}:operator`], [serviceKey]).next).toHaveBeenCalledTimes(1);
  expect(check('PATCH', '/u/status', { status: 'suspended', serviceKey }, [`${prefix}:admin`], [serviceKey]).next).toHaveBeenCalledTimes(1);
});


it.each(['pharmacy-hub:member'])('a forged serviceKey cannot authorize role assignment in an operator-only service (%s)', role => {
  const { res, next } = check('POST', '/u/roles', { role, serviceKey: 'neture' }, ['neture:admin'], ['neture']);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});

it('community operator keeps daily suspension and cannot delete; admin uses the scoped activity deletion route', () => {
 expect(check('PATCH','/u/status',{status:'suspended',serviceKey:'community'},['community:operator'],['community']).next).toHaveBeenCalledTimes(1);
 expect(check('DELETE','/u',{serviceKey:'community'},['community:operator'],['community']).res.status).toHaveBeenCalledWith(403);
 const admin=check('DELETE','/u',{serviceKey:'community'},['community:admin'],['community']);
 expect(admin.res.status).toHaveBeenCalledWith(409);
 expect(admin.res.json).toHaveBeenCalledWith(expect.objectContaining({code:'COMMUNITY_DELETION_ROUTE_REQUIRED'}));
 expect(admin.next).not.toHaveBeenCalled();
 expect(check('DELETE','/u',{serviceKey:'neture'},['neture:admin'],['neture']).next).toHaveBeenCalledTimes(1);
});


it.each([' community ','\tcommunity\n','community'])('normalizes community deletion query scope before the platform bypass (%j)',serviceKey=>{
 const result=check('DELETE','/u',{},['platform:super_admin'],[],{serviceKey,mode:'hard'});
 expect(result.res.status).toHaveBeenCalledWith(409);expect(result.next).not.toHaveBeenCalled();
});
it('uses actual DELETE target instead of an unrelated membershipServiceKey',()=>{
 const mixed=['neture:admin','community:operator'];
 const denied=check('DELETE','/u',{membershipServiceKey:'neture',serviceKey:' community '},mixed,['neture','community']);
 expect(denied.res.status).toHaveBeenCalledWith(403);expect(denied.next).not.toHaveBeenCalled();
 const platform=check('DELETE','/u',{membershipServiceKey:'neture',serviceKey:' community '},['platform:super_admin'],[]);
 expect(platform.res.status).toHaveBeenCalledWith(409);expect(platform.next).not.toHaveBeenCalled();
 expect(check('DELETE','/u',{membershipServiceKey:'community',serviceKey:'neture'},mixed,['neture','community']).next).toHaveBeenCalledTimes(1);
});
it('PUT ordinary membership role edits still authorize the membershipServiceKey',()=>{
 expect(check('PUT','/u',{membershipRole:'member',membershipServiceKey:'community',serviceKey:'neture'},['community:operator'],['community']).next).toHaveBeenCalledTimes(1);
});
it.each([false,true])('HTTP encoded padded community key never reaches the legacy delete handler (body=%s)',async inBody=>{
 const handler=jest.fn((_req,res)=>res.json({deleted:true}));const a=express();a.use(express.json());
 a.use((req,_res,next)=>{(req as any).user={roles:['platform:super_admin']};(req as any).serviceScope={isPlatformAdmin:true,serviceKeys:[],rolePrefixes:[]};next();});
 a.delete('/members/:id',memberManagementPolicy,handler);
 const call=request(a).delete('/members/fixture').query(inBody?{mode:'hard',serviceKey:'neture'}:{mode:'hard',serviceKey:' community '});
 if(inBody)call.send({membershipServiceKey:'neture',serviceKey:' community '});
 const response=await call;expect(response.status).toBe(409);expect(response.body.code).toBe('COMMUNITY_DELETION_ROUTE_REQUIRED');expect(handler).not.toHaveBeenCalled();
});
