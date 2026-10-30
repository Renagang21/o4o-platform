jest.mock('../../../../middleware/auth.middleware.js',()=>({requireAuth:(req:any,res:any,next:any)=>{if(!req.headers['x-test-role'])return res.sendStatus(401);req.user={id:'synthetic',roles:[req.headers['x-test-role']]};next();}}));
jest.mock('../../../../middleware/neture-scope.middleware.js',()=>({requireNetureScope:(scope:string)=>(req:any,res:any,next:any)=>{
 const role=req.headers['x-test-role'];if(role==='platform:super_admin'||role==='neture:admin'||(scope==='neture:operator'&&role==='neture:operator'))return next();res.sendStatus(403);
}}));
jest.mock('../../services/product-trash-batch.service.js',()=>({ProductTrashBatchService:jest.fn().mockImplementation(()=>({move:jest.fn().mockResolvedValue({moved:1}),preview:jest.fn().mockResolvedValue({count:1}),empty:jest.fn().mockResolvedValue({deleted:1,blocked:[]})}))}));
import express from 'express';
import request from 'supertest';
import { createOperatorProductCleanupController } from '../operator-product-cleanup.controller.js';
const app=express();app.use(express.json());app.use('/cleanup',createOperatorProductCleanupController({} as any));
it.each(['/batch-soft-delete','/empty-trash/preview','/empty-trash/execute'])('rejects anonymous %s',async path=>{expect((await request(app).post(`/cleanup${path}`).send({})).status).toBe(401);});
it.each(['/empty-trash/preview','/empty-trash/execute'])('keeps %s admin-only even for an operator',async path=>{
 expect((await request(app).post(`/cleanup${path}`).set('x-test-role','neture:operator').send({})).status).toBe(403);
 expect((await request(app).post(`/cleanup${path}`).set('x-test-role','kpa:admin').send({})).status).toBe(403);
 expect((await request(app).post(`/cleanup${path}`).set('x-test-role','neture:admin').send({})).status).toBe(200);
});
it('lets an authorized operator move selected products into trash',async()=>{expect((await request(app).post('/cleanup/batch-soft-delete').set('x-test-role','neture:operator').send({ids:['synthetic']})).status).toBe(200);});
