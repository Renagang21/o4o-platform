import express from 'express';
import request from 'supertest';
import {createTransactionLedgerRouter} from '../../routes/ai-proxy/transaction-ledger.routes.js';
import {PhotoLedgerService} from './ledger.service.js';
jest.mock('../../middleware/auth.middleware.js',()=>({authenticate:(req,res,next)=>{if(!req.headers['x-fixture-user'])return res.status(401).end();req.user={id:req.headers['x-fixture-user']};next();}}));
jest.mock('./ledger.service.js',()=>({PhotoLedgerService:jest.fn()}));
jest.mock('../../modules/external-ai/adapters/store.adapter.js',()=>({StoreAdapter:class{}}));
jest.mock('../work-data/work-data.service.js',()=>({WorkDataService:class{}}));
const confirm=jest.fn(),get=jest.fn();const id='00000000-0000-4000-8000-000000000002',org='00000000-0000-4000-8000-000000000001';
function app(){const server=express();server.use(express.json());server.use(createTransactionLedgerRouter({} as never,new URL('https://neture.example.invalid')));return server;}
beforeEach(()=>{jest.clearAllMocks();jest.mocked(PhotoLedgerService).mockImplementation(()=>({confirm,get}) as never);confirm.mockResolvedValue({id,state:'confirmed'});});
it('requires first-party login before review data is served',async()=>{expect((await request(app()).get('/'+id+'?organizationId='+org)).status).toBe(401);expect(get).not.toHaveBeenCalled();});
it.each([undefined,'https://untrusted.example.invalid'])('rejects confirmation without the canonical browser origin: %s',async origin=>{let call=request(app()).post('/'+id+'/confirm').set('x-fixture-user','actor');if(origin)call=call.set('Origin',origin);expect((await call.send({organizationId:org,confirmation:{}})).status).toBe(403);expect(confirm).not.toHaveBeenCalled();});
it('takes actor identity from authentication and sends only the confirmation payload to the shared service',async()=>{const command={expectedVersion:1};const response=await request(app()).post('/'+id+'/confirm').set('x-fixture-user','authenticated-actor').set('Origin','https://neture.example.invalid').send({organizationId:org,actorId:'forged',confirmation:command});expect(response.status).toBe(200);expect(confirm).toHaveBeenCalledWith('authenticated-actor',org,id,command);});
