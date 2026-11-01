import express from 'express';
import request from 'supertest';
const create=jest.fn(async()=>({id:'synthetic-invite'}));
const list=jest.fn(async()=>[]),change=jest.fn(async()=>({revoked:true}));
jest.mock('../../../database/connection.js',()=>({AppDataSource:{}}));
jest.mock('../../../modules/auth/services/role-assignment.service.js',()=>({roleAssignmentService:{}}));
jest.mock('../../../services/admin/admin-operations-operators.js',()=>({AdminOperationsOperators:jest.fn(()=>({list:(...a:any[])=>list(...a as []),change:(...a:any[])=>change(...a as [])}))}));
jest.mock('../../../services/admin/service-operator-invitation.service.js',()=>({serviceOperatorInvitationService:{create:(...a:any[])=>create(...a as [])}}));
jest.mock('../../../middleware/auth.middleware.js',()=>({
  authenticate:(req:any,res:any,next:any)=>{const role=req.headers['x-fixture-role'];if(!role)return res.sendStatus(401);req.user={id:'00000000-0000-4000-8000-000000000001',roles:[role]};next();},
  requireRole:(roles:string[])=>(req:any,res:any,next:any)=>roles.includes(req.user.roles[0])?next():res.sendStatus(403),
}));
jest.mock('../../../middleware/rateLimiter.js',()=>({apiLimiter:(_req:any,_res:any,next:any)=>next()}));
import { adminOperationsOperatorsRouter } from '../admin-operations-operators.routes.js';
const app=express();app.use(express.json());app.use('/ops',adminOperationsOperatorsRouter);
beforeEach(()=>jest.clearAllMocks());
it.each(['neture:admin','neture:operator','supplier:operator','platform:operator'])('refuses service/retired roles for designation: %s',async role=>{
  expect((await request(app).post('/ops').set('x-fixture-role',role).send({email:'fixture@example.test'})).status).toBe(403);expect(create).not.toHaveBeenCalled();
});
it('requires authentication and lets the current whole-site Admin manage this workspace',async()=>{
  expect((await request(app).get('/ops')).status).toBe(401);
  expect((await request(app).get('/ops').set('x-fixture-role','platform:super_admin')).status).toBe(200);
});
it('derives the fixed Operator transport server-side instead of trusting a requested Admin role',async()=>{
  expect((await request(app).post('/ops').set('x-fixture-role','platform:super_admin').send({targetUserId:'00000000-0000-4000-8000-000000000002',menuKeys:['neture.members'],role:'platform:super_admin',serviceKey:'platform'})).status).toBe(201);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({role:'neture:operator',serviceKey:'neture',scopeKey:'admin-operations',menuKeys:['neture.members']}));
});
it('rejects malformed target identifiers before applying changes',async()=>{
  expect((await request(app).post('/ops/invalid/revoke').set('x-fixture-role','platform:super_admin').send({})).status).toBe(400);expect(change).not.toHaveBeenCalled();
});
