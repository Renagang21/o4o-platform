import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { createCommunitySignageRoutes } from '../community-signage.routes.js';
import { AppDataSource } from '../../database/connection.js';
import { resolveCommunityWorkspace } from '../../services/community/community-workspace.service.js';
import { registerVideo } from '../signage/services/video-registration.service.js';
jest.mock('../../database/connection.js',()=>({AppDataSource:{query:jest.fn()}}));
jest.mock('../../services/community/community-workspace.service.js',()=>({resolveCommunityWorkspace:jest.fn()}));
jest.mock('../signage/services/video-registration.service.js',()=>({registerVideo:jest.fn()}));
jest.mock('../../middleware/rateLimiter.js',()=>({apiLimiter:(_req:any,_res:any,next:any)=>next()}));
const auth=(req:any,_res:any,next:any)=>{req.user={id:'member'};next();};
function app(){const a=express();a.use(express.json());a.use(createCommunitySignageRoutes(auth,auth,async()=>({id:'member'})));return a;}
beforeEach(()=>{jest.clearAllMocks();(resolveCommunityWorkspace as jest.Mock).mockResolvedValue({allowed:true});(AppDataSource.query as jest.Mock).mockResolvedValue([]);});
it('lists all active shared community videos, independent of the uploading member',async()=>{
  (AppDataSource.query as jest.Mock).mockResolvedValue([{id:'one',name:'Shared video'}]);
  const res=await request(app()).get('/community/signage');
  expect(res.status).toBe(200);expect(res.body.data.canRegister).toBe(true);expect(res.body.data.items).toHaveLength(1);
  const sql=(AppDataSource.query as jest.Mock).mock.calls[0][0];
  expect(sql).toContain('"serviceKey"=\'community\'');expect(sql).toContain("scope='global'");expect(sql).not.toContain('createdByUserId');
});
it('creates using the live member and server community scope, without a pharmacy organization',async()=>{
  (registerVideo as jest.Mock).mockResolvedValue({id:'saved',name:'Shared video'});
  const res=await request(app()).post('/community/signage').send({name:'Shared video',organizationId:'forged',actorId:'other'});
  expect(res.status).toBe(201);
  expect(registerVideo).toHaveBeenCalledWith(AppDataSource,{actorId:'member',serviceKey:'community',community:true},expect.any(Object));
});
it('denies a suspended/ineligible member before AI/domain persistence',async()=>{
  (resolveCommunityWorkspace as jest.Mock).mockResolvedValue({allowed:false});
  const res=await request(app()).post('/community/signage').send({name:'denied'});
  expect(res.status).toBe(403);expect(registerVideo).not.toHaveBeenCalled();
});
it('does not expose other services or store media through the detail resolver',async()=>{
  const res=await request(app()).get('/community/signage/90000000-0000-4000-a000-000000000001');
  expect(res.status).toBe(404);
  const sql=(AppDataSource.query as jest.Mock).mock.calls[0][0];
  expect(sql).toContain("source='community'");expect(sql).toContain("status='active'");expect(sql).toContain('"deletedAt" IS NULL');
});
