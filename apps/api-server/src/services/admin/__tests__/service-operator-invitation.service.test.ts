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
  const query = jest.fn(async () => (row ? [row] : []));
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
    expect(h.query).toHaveBeenCalledTimes(1);
    expect(h.query.mock.calls[0][0]).toContain('FOR UPDATE');
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
      expect(h.query).toHaveBeenCalledTimes(1);
    },
  );
  it('replaying a consumed link returns its result without any write or regrant', async () => {
    const h = harness({
      target_user_id: USER,
      accepted_user_id: USER,
      status: 'accepted',
      service_key: 'lecture',
      role: 'lecture:operator',
      purpose: 'assignment',
    });
    await expect(h.service.accept(TOKEN, USER)).resolves.toMatchObject({
      serviceKey: 'lecture',
      role: 'lecture:operator',
    });
    expect(h.query).toHaveBeenCalledTimes(1);
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
    expect(h.query.mock.calls[0][0]).not.toContain('UPDATE');
  });
});


it('never sends mail when the transaction callback finishes but commit fails', async () => {
  const mail = jest.fn(async () => true);
  const query = jest.fn(async (sql: string) => sql.includes('INSERT INTO service_operator_invitations')
    ? [{ id: OTHER, invited_email: 'fixture@example.test', role: 'lecture:operator', purpose: 'assignment' }] : []);
  const db = { query, transaction: async (callback: any) => { await callback({ query }); throw new Error('Synthetic commit failure'); } };
  const service = new ServiceOperatorInvitationService(db as any, mail, () => NOW);
  jest.spyOn(service as any, 'actor').mockResolvedValue(undefined);
  await expect(service.create({ actorId: USER, email: 'fixture@example.test', serviceKey: 'lecture', role: 'lecture:operator' })).rejects.toThrow('Synthetic commit failure');
  expect(mail).not.toHaveBeenCalled();
});
