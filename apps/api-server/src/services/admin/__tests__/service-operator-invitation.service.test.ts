import 'reflect-metadata';
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { assignRole: jest.fn() },
}));
jest.mock('../../auth/demo-account.service.js', () =>
  jest
    .requireActual('../../../__tests__/support/not-demo-account.js')
    .notDemoAccountModule(),
);
import { ServiceOperatorInvitationService } from '../service-operator-invitation.service.js';
const USER = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const TOKEN = 'a'.repeat(64);
const NOW = new Date('2026-10-15T00:00:00Z');
function harness(row?: any) {
  const query = jest.fn(async (sql:string) => sql.includes('FROM service_operator_invitations WHERE token_hash=$1') && row ? [row] : []);
  const db = { query, transaction: jest.fn(async (cb: any) => cb({ query })) };
  return {
    service: new ServiceOperatorInvitationService(
      db as any,
      jest.fn(async () => true),
      () => NOW,
    ),
    db,
    query,
  };
}
describe('operator invitation fail-closed boundaries', () => {
  it('does not query or accept a malformed token', async () => {
    const h = harness();
    await expect(h.service.accept('invalid', USER)).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_INVITATION',
    });
    expect(h.db.transaction).not.toHaveBeenCalled();
  });
  it('does not create any invitation for platform/global roles', async () => {
    const h = harness();
    await expect(
      h.service.create({
        actorId: USER,
        targetUserId: OTHER,
        serviceKey: 'platform',
        role: 'platform:super_admin',
      }),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_ASSIGNABLE' });
    expect(h.db.transaction).not.toHaveBeenCalled();
  });
  it('rejects a proof bound to a different account before any role or user lookup', async () => {
    const h = harness({
      target_user_id: OTHER,
      status: 'pending',
      expires_at: new Date('2026-10-22'),
    });
    await expect(h.service.accept(TOKEN, USER)).rejects.toMatchObject({
      code: 'INVITATION_ACCOUNT_MISMATCH',
    });
    expect(h.query.mock.calls.filter(([sql])=>sql.startsWith('SELECT') && sql.includes('WHERE token_hash=$1'))).toHaveLength(1);
    expect(h.query.mock.calls.some(([sql])=>sql.includes('FROM users'))).toBe(false);
  });
  it.each(['cancelled', 'expired'])(
    'does not accept a %s link',
    async (status) => {
      const h = harness({
        target_user_id: USER,
        status: status === 'cancelled' ? 'cancelled' : 'pending',
        expires_at: new Date('2026-10-14'),
      });
      await expect(h.service.accept(TOKEN, USER)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_INVITATION',
      });
      expect(h.query.mock.calls.filter(([sql])=>sql.startsWith('SELECT') && sql.includes('WHERE token_hash=$1'))).toHaveLength(1);
    },
  );
  it('a consumed token cannot be reused after its secret has been erased', async () => {
    const h=harness({status:'accepted',accepted_user_id:USER});
    await expect(h.service.accept(TOKEN,USER)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
  });
  it('only an authenticated selected account may preview a bound invitation', async () => {
    const h = harness({
      target_user_id: OTHER,
      status: 'pending',
      expires_at: new Date('2026-10-22'),
    });
    await expect(h.service.inspect(TOKEN, USER)).rejects.toMatchObject({
      code: 'INVITATION_ACCOUNT_MISMATCH',
    });
    expect(h.query.mock.calls.some(([sql])=>sql.includes('FROM users'))).toBe(false);
  });
});


it('never sends mail when invitation creation commits unsuccessfully', async () => {
  const mail=jest.fn(async()=>true), query=jest.fn(async()=>[]);let calls=0;
  const db={query,transaction:async(callback:any)=>{calls++;const value=await callback({query});if(calls===2)throw new Error('Synthetic commit failure');return value;}};
  const service=new ServiceOperatorInvitationService(db as any,mail,()=>NOW);
  jest.spyOn(service,'prepare').mockResolvedValue({invite:{id:OTHER,invited_email:'fixture@example.test',role:'lecture:operator'} as any,url:'https://neture.co.kr/operator-invite#token=fixture'});
  await expect(service.create({actorId:USER,email:'fixture@example.test',serviceKey:'lecture',role:'lecture:operator'})).rejects.toThrow('Synthetic commit failure');
  expect(service.prepare).toHaveBeenCalledTimes(1);expect(mail).not.toHaveBeenCalled();
});
