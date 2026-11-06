import express from 'express';
import request from 'supertest';
const query = jest.fn();
jest.mock('../../database/connection.js', () => ({ AppDataSource: { query: (...args: unknown[]) => query(...args) } }));
import { operatorMemberTarget } from '../operator-member-target.middleware.js';
import { assertOperatorMemberTarget, protectedMemberSql } from '../../services/operations/protected-member-target.js';
const target = '00000000-0000-4000-8000-000000000001';
const membership = '00000000-0000-4000-8000-000000000002';
let writes: jest.Mock;
function app() {
  const a = express(); a.use(express.json()); writes = jest.fn((_req,res)=>res.json({ok:true}));
  a.patch('/members/:userId/status', operatorMemberTarget, writes);
  a.patch('/memberships/:membershipId/approve', operatorMemberTarget, writes);
  a.post('/batch-status', operatorMemberTarget, writes);
  a.use((_err: unknown,_req: unknown,res: express.Response,_next: unknown)=>res.status(503).json({ok:false}));
  return a;
}
beforeEach(()=>query.mockReset());
it('protects all direct Operator mutations even for a platform Admin actor',async()=>{
 query.mockResolvedValue([{protected:true}]);
 const a=app();const result=await request(a).patch(`/members/${target}/status`).send({status:'suspended'});
 expect(result.status).toBe(403);expect(result.body.code).toBe('ADMIN_ACCOUNT_PROTECTED');expect(writes).not.toHaveBeenCalled();
});
it('resolves membership IDs before approval and performs no write',async()=>{
 query.mockResolvedValueOnce([{user_id:target}]).mockResolvedValueOnce([{protected:true}]);
 const result=await request(app()).patch(`/memberships/${membership}/approve`);
 expect(result.status).toBe(403);expect(query.mock.calls[1][1]).toEqual([target]);expect(writes).not.toHaveBeenCalled();
});
it('rejects a mixed batch before any member is changed',async()=>{
 query.mockResolvedValueOnce([{protected:false}]).mockResolvedValueOnce([{protected:true}]);
 const result=await request(app()).post('/batch-status').send({ids:[membership,target],status:'approved'});
 expect(result.status).toBe(403);expect(writes).not.toHaveBeenCalled();
});
it('allows ordinary members and fails closed on lookup failure',async()=>{
 query.mockResolvedValue([{protected:false}]);
 expect((await request(app()).patch(`/members/${target}/status`).send({status:'suspended'})).status).toBe(200);
 expect(writes).toHaveBeenCalledTimes(1);
 query.mockRejectedValue(new Error('fixture unavailable'));
 expect((await request(app()).patch(`/members/${target}/status`).send({status:'active'})).status).toBe(503);
 expect(writes).not.toHaveBeenCalled();
});
it('uses active, time-valid role assignments rather than email or service role',async()=>{
 expect(protectedMemberSql('u.id')).toContain("role='platform:super_admin'");
 expect(protectedMemberSql('u.id')).toContain('valid_from<=now()');expect(protectedMemberSql('u.id')).toContain('valid_until>=now()');
 query.mockResolvedValue([{protected:true}]);
 await expect(assertOperatorMemberTarget({query} as any,target)).rejects.toMatchObject({status:403,code:'ADMIN_ACCOUNT_PROTECTED'});
});
