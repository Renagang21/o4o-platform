import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';

jest.mock('../../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../auth/demo-account.service.js', () =>
  jest
    .requireActual('../../../__tests__/support/not-demo-account.js')
    .notDemoAccountModule(),
);
const assignRole = jest.fn(
  async (
    input: { userId: string; role: string; assignedBy: string },
    m: EntityManager,
  ) => {
    await m.query(
      `INSERT INTO role_assignments(user_id,role,assigned_by,is_active) VALUES($1,$2,$3,true)
    ON CONFLICT (user_id,role) WHERE is_active DO NOTHING`,
      [input.userId, input.role, input.assignedBy],
    );
  },
);
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    assignRole: (...a: unknown[]) => assignRole(...(a as [any, any])),
  },
}));
import { AccountErasureService } from '../../privacy/account-erasure.service.js';
import { ServiceOperatorInvitationService } from '../service-operator-invitation.service.js';

// Opt-in isolated fixture only. Never inherits DATABASE_URL or a production connection.
const integration =
  process.env.OPERATOR_INVITE_TEST_PORT === '55432' ? describe : describe.skip;
integration(
  'service operator invitations — real isolated PostgreSQL transactions',
  () => {
    let db: DataSource;
    let admin: string;
    let target: string;
    let other: string;
    let now: Date;
    const mails: Array<{ to: string; token: string }> = [];
    let sendOK = true;
    let service: ServiceOperatorInvitationService;
    const query = (sql: string, params?: any[]) => db.query(sql, params);
    async function user(email: string): Promise<string> {
      const id = randomUUID();
      await query(
        `INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,'Synthetic operator','active',true,true)`,
        [id, email],
      );
      return id;
    }
    const token = () => mails[mails.length - 1].token;
    const create = () =>
      service.create({
        targetUserId: target,
        serviceKey: 'lecture',
        role: 'lecture:operator',
        actorId: admin,
      });
    beforeAll(async () => {
      db = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: Number(process.env.OPERATOR_INVITE_TEST_PORT),
        username: 'agent',
        password: () => '',
        database: 'o4o_operator_invitation_fixture',
      });
      await db.initialize();
      expect(
        (
          await query(
            "SELECT current_database() AS db,to_regclass('public.service_operator_invitations') AS t",
          )
        )[0],
      ).toEqual({
        db: 'o4o_operator_invitation_fixture',
        t: 'service_operator_invitations',
      });
      // Populate the disposable erasure writer manifest for newer unrelated fixture tables too.
      for (const t of await query(`SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind='r' AND n.nspname IN ('public','neture','cosmetics')
      AND c.relname NOT IN ('o4o_schema_baselines','typeorm_migrations') AND c.relname NOT LIKE 'account_erasure_%'
      AND NOT EXISTS(SELECT 1 FROM pg_trigger tr WHERE tr.tgrelid=c.oid AND tr.tgname='account_erasure_write_fence')`)) {
        const quote = (v: string) => '"' + v.replace(/"/g, '""') + '"';
        await query(
          `CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON ${quote(t.nspname)}.${quote(t.relname)} FOR EACH ROW EXECUTE FUNCTION account_erasure_write_fence()`,
        );
      }
      // Entity access is adapted to this schema fixture. Business transactions/locks/constraints are real.
      const adapted = {
        query: query,
        transaction: (cb: any) =>
          db.transaction(async (original) => {
            const m: any = {
              query: original.query.bind(original),
              getRepository: (entity: any) => {
                if ((entity?.name ?? entity) === 'User')
                  return {
                    findOne: async ({ where }: any) =>
                      (
                        await m.query(
                          'SELECT * FROM users WHERE id=$1 FOR SHARE',
                          [where.id],
                        )
                      )[0] ?? null,
                  };
                if (entity === 'ServiceMembership')
                  return {
                    findOne: async ({ where }: any) =>
                      (
                        await m.query(
                          'SELECT * FROM service_memberships WHERE user_id=$1 AND service_key=$2',
                          [where.userId, where.serviceKey],
                        )
                      )[0] ?? null,
                    create: (o: any) => o,
                    save: async (o: any) => {
                      await m.query(
                        'INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,$2,$3,$4)',
                        [o.userId, o.serviceKey, o.status, o.role],
                      );
                      return o;
                    },
                  };
                throw new Error('Unexpected fixture entity');
              },
            };
            return cb(m);
          }),
      };
      service = new ServiceOperatorInvitationService(
        adapted as any,
        async (to, url) => {
          mails.push({
            to,
            token: new URLSearchParams(new URL(url).hash.slice(1)).get(
              'token',
            )!,
          });
          return sendOK;
        },
        () => now,
      );
    });
    beforeEach(async () => {
      await query(
        'TRUNCATE users,account_erasure_operations,account_erasure_community_evidence,account_erasure_audit_events CASCADE',
      );
      mails.length = 0;
      sendOK = true;
      assignRole.mockClear();
      now = new Date();
      admin = await user('admin@fixture.invalid');
      target = await user('operator@fixture.invalid');
      other = await user('other@fixture.invalid');
      await query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",
        [admin],
      );
    });
    afterAll(async () => {
      if (db?.isInitialized) {
        await query(
          'TRUNCATE users,account_erasure_operations,account_erasure_community_evidence,account_erasure_audit_events CASCADE',
        );
        await db.destroy();
      }
    });

    it('sends a hashed single-use link and grants nothing until explicit acceptance', async () => {
      const invite = await create();
      expect(invite.status).toBe('pending');
      expect(invite).not.toHaveProperty('token_hash');
      expect(
        (await query('SELECT token_hash FROM service_operator_invitations'))[0]
          .token_hash,
      ).not.toBe(token());
      expect(
        await query('SELECT * FROM service_memberships WHERE user_id=$1', [
          target,
        ]),
      ).toHaveLength(0);
      expect(
        await query('SELECT * FROM role_assignments WHERE user_id=$1', [
          target,
        ]),
      ).toHaveLength(0);
      await expect(service.inspect(token(), target)).resolves.toMatchObject({
        role: 'lecture:operator',
      });
      const result = await service.accept(token(), target);
      expect(result).toMatchObject({ membershipPolicy: 'CREATED' });
      expect(
        await query(
          "SELECT * FROM role_assignments WHERE user_id=$1 AND role='lecture:operator'",
          [target],
        ),
      ).toHaveLength(1);
      expect(
        (
          await query(
            'SELECT status FROM service_memberships WHERE user_id=$1',
            [target],
          )
        )[0].status,
      ).toBe('active');
    });
    it('supports unregistered recipients without creating accounts or privileges', async () => {
      const invite = await service.create({
        email: 'new@fixture.invalid',
        serviceKey: 'lecture',
        role: 'lecture:operator',
        actorId: admin,
      });
      expect(invite.target_user_id).toBeNull();
      expect(
        await query("SELECT * FROM users WHERE email='new@fixture.invalid'"),
      ).toHaveLength(0);
      const id = await user('new@fixture.invalid');
      await service.accept(token(), id);
      expect(
        await query('SELECT * FROM role_assignments WHERE user_id=$1', [id]),
      ).toHaveLength(1);
    });
    it('requires explicit selection for an already registered email', async () => {
      await expect(
        service.create({
          email: 'operator@fixture.invalid',
          serviceKey: 'lecture',
          role: 'lecture:operator',
          actorId: admin,
        }),
      ).rejects.toMatchObject({ code: 'USER_SELECTION_REQUIRED' });
      expect(mails).toHaveLength(0);
    });
    it('binds an existing invite to the selected ID even if another account has the mail link', async () => {
      await create();
      await expect(service.accept(token(), other)).rejects.toMatchObject({
        code: 'INVITATION_ACCOUNT_MISMATCH',
      });
      expect(assignRole).not.toHaveBeenCalled();
      expect((await service.list())[0].status).toBe('pending');
    });
    it('confirms existing operators without changing role or membership', async () => {
      await query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'lecture:operator',true)",
        [target],
      );
      expect((await create()).purpose).toBe('confirmation');
      await service.accept(token(), target);
      expect(assignRole).not.toHaveBeenCalled();
      expect(
        await query('SELECT * FROM service_memberships WHERE user_id=$1', [
          target,
        ]),
      ).toHaveLength(0);
    });
    it('never resurrects a revoked existing role', async () => {
      await query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'lecture:operator',true)",
        [target],
      );
      await create();
      await query(
        'UPDATE role_assignments SET is_active=false WHERE user_id=$1',
        [target],
      );
      await expect(service.accept(token(), target)).rejects.toMatchObject({
        code: 'OPERATOR_ROLE_REVOKED',
      });
      expect(assignRole).not.toHaveBeenCalled();
    });
    it.each(['pending', 'suspended', 'rejected', 'withdrawn', 'active'])(
      'preserves %s membership on acceptance',
      async (status) => {
        await query(
          "INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'lecture',$2,'customer')",
          [target, status],
        );
        await create();
        expect(await service.accept(token(), target)).toMatchObject({
          membershipPolicy: 'KEEP_EXISTING_STATUS',
          membershipStatuses: { lecture: status },
        });
        expect(
          (
            await query(
              'SELECT status,role FROM service_memberships WHERE user_id=$1',
              [target],
            )
          )[0],
        ).toEqual({ status, role: 'customer' });
      },
    );
    it('mail failure rolls back the invitation and leaves no privilege', async () => {
      sendOK = false;
      await expect(create()).rejects.toMatchObject({
        code: 'INVITATION_MAIL_FAILED',
      });
      expect(await service.list()).toHaveLength(0);
      expect(assignRole).not.toHaveBeenCalled();
    });
    it('resending rotates the hash and expiry, invalidating the previous link', async () => {
      const invite = await create();
      const old = token();
      now = new Date(now.getTime() + 61_000);
      await service.manage(invite.id, admin, 'resend');
      await expect(service.accept(old, target)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_INVITATION',
      });
      await expect(service.accept(token(), target)).resolves.toMatchObject({
        role: 'lecture:operator',
      });
    });
    it('failed resend keeps the previous link valid', async () => {
      const invite = await create();
      const old = token();
      now = new Date(now.getTime() + 61_000);
      sendOK = false;
      await expect(
        service.manage(invite.id, admin, 'resend'),
      ).rejects.toMatchObject({ code: 'INVITATION_MAIL_FAILED' });
      await expect(service.accept(old, target)).resolves.toMatchObject({
        role: 'lecture:operator',
      });
    });
    it('an authorized new admin can re-endorse an invitation after the original inviter loses authority', async () => {
      const invite = await create();
      await query(
        'UPDATE role_assignments SET is_active=false WHERE user_id=$1',
        [admin],
      );
      await query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",
        [other],
      );
      now = new Date(now.getTime() + 61_000);
      await service.manage(invite.id, other, 'resend');
      await expect(service.accept(token(), target)).resolves.toMatchObject({
        role: 'lecture:operator',
      });
    });
    it('expires pending links and rejects cancelled links', async () => {
      const invite = await create();
      now = new Date(now.getTime() + 8 * 86400_000);
      await expect(service.accept(token(), target)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_INVITATION',
      });
      await service.manage(invite.id, admin, 'cancel');
      await expect(service.accept(token(), target)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_INVITATION',
      });
    });
    it('blocks duplicate pending mail and early resend', async () => {
      const invite = await create();
      await expect(create()).rejects.toMatchObject({
        code: 'INVITATION_ALREADY_PENDING',
      });
      await expect(
        service.manage(invite.id, admin, 'resend'),
      ).rejects.toMatchObject({ code: 'INVITATION_RESEND_TOO_SOON' });
    });
    it('rechecks inviter authority and target active status when accepting', async () => {
      await create();
      await query(
        'UPDATE role_assignments SET is_active=false WHERE user_id=$1',
        [admin],
      );
      await expect(service.accept(token(), target)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      await query(
        'UPDATE role_assignments SET is_active=true WHERE user_id=$1',
        [admin],
      );
      await query('UPDATE users SET "isActive"=false WHERE id=$1', [target]);
      await expect(service.accept(token(), target)).rejects.toMatchObject({
        code: 'ACCOUNT_INACTIVE',
      });
      expect((await query('SELECT "isActive" FROM users WHERE id=$1', [target]))[0]).toEqual({ isActive: false });
      expect(await query('SELECT id FROM role_assignments WHERE user_id=$1', [target])).toHaveLength(0);
      expect(await query('SELECT id FROM service_memberships WHERE user_id=$1', [target])).toHaveLength(0);
    });
    it('serializes simultaneous acceptances and never regrants a subsequently revoked role', async () => {
      await create();
      const t = token();
      await Promise.all([service.accept(t, target), service.accept(t, target)]);
      expect(assignRole).toHaveBeenCalledTimes(1);
      await query(
        'UPDATE role_assignments SET is_active=false WHERE user_id=$1',
        [target],
      );
      await service.accept(t, target);
      expect(assignRole).toHaveBeenCalledTimes(1);
    });
    it('account erasure removes the target contact/confirmation and preserves a peer invitation', async () => {
      await create();
      await service.create({
        targetUserId: other,
        serviceKey: 'lecture',
        role: 'lecture:operator',
        actorId: admin,
      });
      const erasure = new AccountErasureService(db, {
        enabled: true,
        inventoryReviewed: true,
        systemYears: 1,
        systemBasis: 'synthetic-system',
        personalBuckets: [],
      });
      await query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','suspended')",
        [target],
      );
      const result = await erasure.request(target, admin);
      expect(result).toMatchObject({ state: 'completed', erased: true });
      expect(
        await query(
          'SELECT id FROM service_operator_invitations WHERE target_user_id=$1',
          [target],
        ),
      ).toHaveLength(0);
      expect(
        await query(
          'SELECT id FROM service_operator_invitations WHERE target_user_id=$1',
          [other],
        ),
      ).toHaveLength(1);
    });
    it('erasure also removes an email-only invitation created before signup', async () => {
      await service.create({
        email: 'new@fixture.invalid',
        serviceKey: 'lecture',
        role: 'lecture:operator',
        actorId: admin,
      });
      const id = await user('new@fixture.invalid');
      const erasure = new AccountErasureService(db, {
        enabled: true,
        inventoryReviewed: true,
        systemYears: 1,
        systemBasis: 'synthetic-system',
        personalBuckets: [],
      });
      await query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','suspended')",
        [id],
      );
      expect(await erasure.request(id, admin)).toMatchObject({
        state: 'completed',
        erased: true,
      });
      expect(
        await query(
          "SELECT id FROM service_operator_invitations WHERE invited_email='new@fixture.invalid'",
        ),
      ).toHaveLength(0);
    });
    it('erasing an inviter preserves a peer pending invitation, allowing re-endorsement', async () => {
      await query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",
        [target],
      );
      const invitation = await service.create({
        targetUserId: other,
        serviceKey: 'lecture',
        role: 'lecture:operator',
        actorId: target,
      });
      await query(
        'UPDATE role_assignments SET is_active=false WHERE user_id=$1',
        [target],
      );
      await query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','suspended')",
        [target],
      );
      const erasure = new AccountErasureService(db, {
        enabled: true,
        inventoryReviewed: true,
        systemYears: 1,
        systemBasis: 'synthetic-system',
        personalBuckets: [],
      });
      expect(await erasure.request(target, admin)).toMatchObject({
        state: 'completed',
        erased: true,
      });
      expect(
        (
          await query(
            'SELECT target_user_id,accepted_user_id,invited_by_user_id,status FROM service_operator_invitations WHERE id=$1',
            [invitation.id],
          )
        )[0],
      ).toEqual({
        target_user_id: other,
        accepted_user_id: null,
        invited_by_user_id: null,
        status: 'pending',
      });
      now = new Date(now.getTime() + 61_000);
      await service.manage(invitation.id, admin, 'resend');
      await service.accept(token(), other);
      expect(
        await query(
          "SELECT id FROM role_assignments WHERE user_id=$1 AND role='lecture:operator' AND is_active=true",
          [other],
        ),
      ).toHaveLength(1);
    });
    it('rejects platform roles and cross-service role mismatches', async () => {
      await expect(
        service.create({
          targetUserId: target,
          serviceKey: 'platform',
          role: 'platform:super_admin',
          actorId: admin,
        }),
      ).rejects.toMatchObject({ code: 'ROLE_NOT_ASSIGNABLE' });
      await expect(
        service.create({
          targetUserId: target,
          serviceKey: 'neture',
          role: 'lecture:operator',
          actorId: admin,
        }),
      ).rejects.toMatchObject({ code: 'SERVICE_KEY_MISMATCH' });
      expect(mails).toHaveLength(0);
    });
  },
);
