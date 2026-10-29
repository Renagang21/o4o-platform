import {CreateCentralOperationMenuGrants1793186241009} from '../../../database/migrations/1793186241009-CreateCentralOperationMenuGrants.js';
import { CreateServiceOperatorInvitations1792886400000 } from '../../../database/migrations/1792886400000-CreateServiceOperatorInvitations.js';
import { retainOperatorInvitations } from '../operator-invitation-retention.js';
import 'reflect-metadata';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';

jest.mock('../../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../auth/demo-account.service.js', () =>
  jest
    .requireActual('../../../__tests__/support/not-demo-account.js')
    .notDemoAccountModule(),
);
const assignRole = jest.fn(
  async (
    input: { userId: string; role: string; assignedBy: string; scopeType?: string },
    m: EntityManager,
  ) => {
    await m.query(
      `INSERT INTO role_assignments(user_id,role,assigned_by,is_active,scope_type) VALUES($1,$2,$3,true,$4)
    ON CONFLICT (user_id,role) WHERE is_active DO NOTHING`,
      [input.userId, input.role, input.assignedBy, input.scopeType ?? 'global'],
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
      await query(`INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,'google',$2)`,[id,`fixture-${id}`]);
      return id;
    }
    const token = () => mails[mails.length - 1].token;
    const create = () =>
      service.create({
        targetUserId: target,
        serviceKey: 'lecture',
        role: 'lecture:admin',
        actorId: admin,
      });
    it('keeps selected central menus through proof and acceptance in the role transaction', async () => {
      await service.create({targetUserId:target,serviceKey:'lecture',role:'lecture:operator',actorId:admin,scopeKey:'o4o-direct',menuKeys:['lecture.instructors']});
      const preview = await service.inspect(token(),target);
      expect(preview).toMatchObject({centralDelegation:true,menuKeys:['lecture.instructors']});
      await service.accept(token(),target);
      const rows = await query(`SELECT ra.scope_type,g.menu_keys,g.invitation_id FROM role_assignments ra
        JOIN central_operation_menu_grants g ON g.assignment_id=ra.id WHERE ra.user_id=$1 AND ra.role='lecture:operator'`,[target]);
      expect(rows).toEqual([{scope_type:'o4o-direct',menu_keys:['lecture.instructors'],invitation_id:null}]);
    });
    it('rejects cross-service duties and menu selection on ordinary invitations before persisting an invite',async()=>{
      await expect(service.create({targetUserId:target,serviceKey:'lecture',role:'lecture:operator',actorId:admin,scopeKey:'o4o-direct',menuKeys:['supplier.suppliers']})).rejects.toMatchObject({status:400});
      await expect(service.create({targetUserId:target,serviceKey:'lecture',role:'lecture:admin',actorId:admin,menuKeys:['lecture.instructors']})).rejects.toMatchObject({statusCode:400});
      expect((await query('SELECT 1 FROM service_operator_invitations WHERE target_user_id=$1',[target])).length).toBe(0);
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
              connection: original.connection,
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
          const rawToken = new URLSearchParams(new URL(url).hash.slice(1)).get('token')!;
          expect(await query('SELECT id FROM service_operator_invitations WHERE token_hash=$1', [createHash('sha256').update(rawToken).digest('hex')])).toHaveLength(1);
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
        role: 'lecture:admin',
      });
      const result = await service.accept(token(), target);
      expect(result).toMatchObject({ membershipPolicy: 'CREATED' });
      expect(
        await query(
          "SELECT * FROM role_assignments WHERE user_id=$1 AND role='lecture:admin'",
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
        role: 'lecture:admin',
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
          role: 'lecture:admin',
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
      expect((await service.list(admin))[0].status).toBe('pending');
    });
    it('does not require existing operators to reconfirm or change their membership', async () => {
      await query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'lecture:admin',true)",[target]);
      await expect(create()).rejects.toMatchObject({code:'OPERATOR_ALREADY_ACTIVE'});
      expect(assignRole).not.toHaveBeenCalled();
      expect(await query('SELECT * FROM service_memberships WHERE user_id=$1',[target])).toHaveLength(0);
    });
    it('erases delivery material immediately after acceptance and refuses token replay', async () => {
      await create(); const secret=token();
      await service.accept(secret,target);
      expect((await query('SELECT invited_email,token_hash,target_user_id FROM service_operator_invitations'))[0])
        .toEqual({invited_email:null,token_hash:null,target_user_id:null});
      await expect(service.accept(secret,target)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
      expect(assignRole).toHaveBeenCalledTimes(1);
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
    it('mail failure keeps a durable pending invitation without granting privilege', async () => {
      sendOK = false;
      await expect(create()).rejects.toMatchObject({
        code: 'INVITATION_MAIL_FAILED',
      });
      expect(await service.list(admin)).toEqual([expect.objectContaining({ status: 'pending' })]);
      expect(assignRole).not.toHaveBeenCalled();
    });
    it('resending rotates the hash and invalidates the previous link', async () => {
      const invite = await create();
      const old = token();
      now = new Date(now.getTime() + 61_000);
      await service.manage(invite.id, admin, 'resend');
      await expect(service.accept(old, target)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_INVITATION',
      });
      await expect(service.accept(token(), target)).resolves.toMatchObject({
        role: 'lecture:admin',
      });
    });
    it('failed resend keeps durable state and permits an explicit later retry', async () => {
      const invite = await create();
      const old = token();
      now = new Date(now.getTime() + 61_000);
      sendOK = false;
      await expect(
        service.manage(invite.id, admin, 'resend'),
      ).rejects.toMatchObject({ code: 'INVITATION_MAIL_FAILED' });
      await expect(service.accept(old, target)).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_INVITATION' });
      expect(assignRole).not.toHaveBeenCalled();
      sendOK = true;
      now = new Date(now.getTime() + 61_000);
      await service.manage(invite.id, admin, 'resend');
      await expect(service.accept(token(), target)).resolves.toMatchObject({ role: 'lecture:admin' });
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
        role: 'lecture:admin',
      });
    });
    it('expires pending links and rejects cancelled links', async () => {
      const invite = await create();
      now = new Date(now.getTime() + 8 * 86400_000);
      await expect(service.accept(token(), target)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_INVITATION',
      });
      await expect(service.manage(invite.id,admin,'cancel')).rejects.toMatchObject({code:'INVITATION_NOT_PENDING'});
      const fresh=await create(); await service.manage(fresh.id,admin,'cancel');
      await expect(service.accept(token(), target)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_INVITATION',
      });
    });
    it('blocks early resend even through repeated creation', async () => {
      const invite = await create();
      await expect(create()).rejects.toMatchObject({
        code: 'INVITATION_RESEND_TOO_SOON',
      });
      await expect(
        service.manage(invite.id, admin, 'resend'),
      ).rejects.toMatchObject({ code: 'INVITATION_RESEND_TOO_SOON' });
    });
    it('keeps legacy central Operator invitations cancellable but refuses new acceptance or resend', async () => {
      const oldToken = 'b'.repeat(64);
      const [legacy] = await query(`INSERT INTO service_operator_invitations(invited_email,service_key,role,purpose,target_user_id,invited_by_user_id,token_hash,expires_at,created_at,updated_at)
        SELECT email,'lecture','lecture:operator','assignment',id,$2,$3,$4,$5,$5 FROM users WHERE id=$1 RETURNING id`,
        [target,admin,createHash('sha256').update(oldToken).digest('hex'),new Date(now.getTime()+86400000),new Date(now.getTime()-61000)]);
      await expect(service.accept(oldToken,target)).rejects.toMatchObject({code:'ROLE_NOT_ASSIGNABLE'});
      await expect(service.manage(legacy.id,admin,'resend')).rejects.toMatchObject({code:'ROLE_NOT_ASSIGNABLE'});
      await expect(service.manage(legacy.id,admin,'cancel')).resolves.toMatchObject({status:'cancelled'});
      expect(assignRole).not.toHaveBeenCalled();
    });
    it('resends from repeated creation without acceptance and preserves ID/deadline', async () => {
      const original = await create(), old = token();
      now = new Date(now.getTime() + 61_000);
      const resent = await create();
      expect(resent.id).toBe(original.id);
      expect(new Date(resent.expires_at)).toEqual(new Date(original.expires_at));
      expect(mails).toHaveLength(2);
      await expect(service.accept(old, target)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
      await expect(service.accept(token(), target)).resolves.toMatchObject({role:'lecture:admin'});
    });
    it('retries failed first mail from the original creation screen', async () => {
      sendOK = false;
      await expect(create()).rejects.toMatchObject({code:'INVITATION_MAIL_FAILED'});
      now = new Date(now.getTime() + 61_000); sendOK = true;
      await expect(create()).resolves.toMatchObject({status:'pending'});
      expect(await query('SELECT id FROM service_operator_invitations')).toHaveLength(1);
    });
    it('replaces an expired pending invitation without needing its list position', async () => {
      const old = await create();
      const oldToken = token();
      now = new Date(now.getTime() + 8 * 86400_000);
      const next = await create();
      expect(next.id).not.toBe(old.id);
      expect((await query('SELECT status FROM service_operator_invitations WHERE id=$1', [old.id]))[0].status).toBe('expired');
      await expect(service.accept(oldToken, target)).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_INVITATION' });
      expect(assignRole).not.toHaveBeenCalled();
      await expect(service.accept(token(), target)).resolves.toMatchObject({ role: 'lecture:admin' });
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
      const results=await Promise.allSettled([service.accept(t,target),service.accept(t,target)]);
      expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
      expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
      expect(assignRole).toHaveBeenCalledTimes(1);
      await query(
        'UPDATE role_assignments SET is_active=false WHERE user_id=$1',
        [target],
      );
      await expect(service.accept(t,target)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
      expect(assignRole).toHaveBeenCalledTimes(1);
    });
    it('account erasure removes the target contact/confirmation and preserves a peer invitation', async () => {
      await create();
      await service.create({targetUserId:target,serviceKey:'lecture',role:'lecture:operator',actorId:admin,scopeKey:'o4o-direct',menuKeys:['lecture.instructors']});
      await service.accept(token(),target);
      await service.create({targetUserId:target,serviceKey:'funding',role:'funding:operator',actorId:admin,scopeKey:'o4o-direct',menuKeys:['funding.funding']});
      await service.create({
        targetUserId: other,
        serviceKey: 'lecture',
        role: 'lecture:admin',
        scopeKey:'o4o-direct',menuKeys:['lecture.courses'],
        actorId: admin,
      });
      expect(await query('SELECT id FROM central_operation_menu_grants')).toHaveLength(3);
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
      await expect(erasure.request(target,admin)).rejects.toMatchObject({code:'SERVICE_STOP_REQUIRED'});
      await query("UPDATE service_memberships SET status='suspended' WHERE user_id=$1 AND service_key='lecture'",[target]);
      const result = await erasure.request(target, admin);
      expect(result.reviewCodes).toEqual([]);
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
      expect(await query(`SELECT g.menu_keys FROM central_operation_menu_grants g JOIN service_operator_invitations i ON i.id=g.invitation_id WHERE i.target_user_id=$1`,[other])).toEqual([{menu_keys:['lecture.courses']}]);
      expect(await query('SELECT id FROM central_operation_menu_grants')).toHaveLength(1);
      const evidence=await query("SELECT user_id,meta FROM action_logs WHERE action_key='admin.service_operator_assigned' AND meta->>'subjectKey'=$1",[createHash('sha256').update(target).digest('hex')]);
      expect(evidence).toHaveLength(1);
      expect(evidence[0].user_id).toBe(admin);
      expect(evidence[0].meta.subjectKey).toBe(createHash('sha256').update(target).digest('hex'));
      expect(evidence[0].meta).not.toHaveProperty('targetUserId');
    });
    it('reviews a grant identifier copied into another account instead of silently deleting the peer record', async () => {
      await service.create({targetUserId:target,serviceKey:'lecture',role:'lecture:operator',actorId:admin,scopeKey:'o4o-direct',menuKeys:['lecture.instructors']});
      await service.accept(token(),target);
      const [grant]=await query('SELECT id FROM central_operation_menu_grants');
      await query(`INSERT INTO notifications("userId",type,title,message) VALUES($1,'custom','Synthetic reference',$2)`,[other,grant.id]);
      await query("INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','suspended')",[target]);
      await query("UPDATE service_memberships SET status='suspended' WHERE user_id=$1 AND service_key='lecture'",[target]);
      const erasure=new AccountErasureService(db,{enabled:true,inventoryReviewed:true,systemYears:1,systemBasis:'synthetic-system',personalBuckets:[]});
      const result=await erasure.request(target,admin);
      expect(result).toMatchObject({state:'review_required',erased:false});
      expect(result.reviewCodes).toContain('REVIEW:public.notifications');
      expect(await query('SELECT id FROM central_operation_menu_grants WHERE id=$1',[grant.id])).toHaveLength(1);
      expect(await query('SELECT message FROM notifications WHERE "userId"=$1 AND message=$2',[other,grant.id])).toHaveLength(1);
    });
    it('keeps unknown audit fields subject to review instead of classifying them as menu evidence',async()=>{
      await service.create({targetUserId:target,serviceKey:'lecture',role:'lecture:operator',actorId:admin,scopeKey:'o4o-direct',menuKeys:['lecture.instructors']});
      await service.accept(token(),target);
      const payload={targetUserId:target,role:'lecture:operator',menuKeys:['lecture.instructors'],unexpected:{contact:'synthetic@example.invalid'}};
      const [log]=await query(`INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta) VALUES('lecture',$1,'operator.central_menu_grants_changed','manual','success',$2::jsonb) RETURNING id`,[admin,JSON.stringify(payload)]);
      await query("INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','suspended')",[target]);
      await query("UPDATE service_memberships SET status='suspended' WHERE user_id=$1 AND service_key='lecture'",[target]);
      const erasure=new AccountErasureService(db,{enabled:true,inventoryReviewed:true,systemYears:1,systemBasis:'synthetic-system',personalBuckets:[]});
      const result=await erasure.request(target,admin);
      expect(result).toMatchObject({state:'review_required',erased:false});
      expect(result.reviewCodes).toContain('REVIEW:public.action_logs');
      expect((await query('SELECT meta FROM action_logs WHERE id=$1',[log.id]))[0].meta).toEqual(payload);
    });
    it('supports inviter and recipient erasure in sequence without losing the retained audit event',async()=>{
      await query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",[target]);
      await service.create({targetUserId:other,serviceKey:'lecture',role:'lecture:operator',actorId:target,scopeKey:'o4o-direct',menuKeys:['lecture.instructors']});
      await service.accept(token(),other);
      const [before]=await query("SELECT id,created_at FROM action_logs WHERE user_id=$1 AND action_key='admin.service_operator_assigned'",[target]);
      await query('UPDATE role_assignments SET is_active=false WHERE user_id=$1',[target]);
      await query("INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','suspended'),($2,'neture','suspended')",[target,other]);
      const erasure=new AccountErasureService(db,{enabled:true,inventoryReviewed:true,systemYears:1,systemBasis:'synthetic-system',personalBuckets:[]});
      expect(await erasure.request(target,admin)).toMatchObject({state:'completed',erased:true});
      expect(await query('SELECT id FROM central_operation_menu_grants')).toHaveLength(1);
      await query("UPDATE service_memberships SET status='suspended' WHERE user_id=$1 AND service_key='lecture'",[other]);
      expect(await erasure.request(other,admin)).toMatchObject({state:'completed',erased:true});
      const [after]=await query('SELECT created_at,user_id,meta FROM action_logs WHERE id=$1',[before.id]);
      expect(after.created_at).toEqual(before.created_at);
      expect(after.user_id).toBeNull();
      expect(after.meta.actorKey).toBe(createHash('sha256').update(target).digest('hex'));
      expect(after.meta.subjectKey).toBe(createHash('sha256').update(other).digest('hex'));
      expect(after.meta).not.toHaveProperty('targetUserId');
      expect(await query('SELECT id FROM central_operation_menu_grants')).toHaveLength(0);
    });
    it('erasure also removes an email-only invitation created before signup', async () => {
      await service.create({
        email: 'new@fixture.invalid',
        serviceKey: 'lecture',
        role: 'lecture:admin',
        scopeKey:'o4o-direct',menuKeys:['lecture.courses'],
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
      expect(await query('SELECT id FROM central_operation_menu_grants')).toHaveLength(0);
      expect(
        await query(
          "SELECT id FROM service_operator_invitations WHERE invited_email='new@fixture.invalid'",
        ),
      ).toHaveLength(0);
    });
    it('erasing an inviter cancels delivery and preserves only the minimum peer event', async () => {
      await query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",
        [target],
      );
      const invitation = await service.create({
        targetUserId: other,
        serviceKey: 'lecture',
        role: 'lecture:admin',
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
        status: 'cancelled',
      });
      now = new Date(now.getTime() + 61_000);
      await expect(service.manage(invitation.id,admin,'resend')).rejects.toMatchObject({code:'INVITATION_NOT_PENDING'});
      await expect(service.accept(token(),other)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
      expect(
        await query(
          "SELECT id FROM role_assignments WHERE user_id=$1 AND role='lecture:admin' AND is_active=true",
          [other],
        ),
      ).toHaveLength(0);
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
          role: 'lecture:admin',
          actorId: admin,
        }),
      ).rejects.toMatchObject({ code: 'SERVICE_KEY_MISMATCH' });
      expect(mails).toHaveLength(0);
    });
    it('does not extend the original seven-day personal-data deadline on resend',async()=>{
      const i=await create(), original=token();now=new Date(now.getTime()+61_000);
      const resent=await service.manage(i.id,admin,'resend');expect(new Date(resent.expires_at).getTime()).toBe(new Date(i.expires_at).getTime());
      await expect(service.accept(original,target)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
      await service.accept(token(),target);
    });
    it('expires and erases delivery data exactly at the deadline before any grant',async()=>{
      const i=await create();now=new Date(i.expires_at);
      await expect(service.accept(token(),target)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
      expect((await query('SELECT status,invited_email,token_hash FROM service_operator_invitations WHERE id=$1',[i.id]))[0])
        .toEqual({status:'expired',invited_email:null,token_hash:null});expect(assignRole).not.toHaveBeenCalled();
    });
    it('calendar-year cleanup preserves leap-day events to March 1 and PostgreSQL submillisecond precision',async()=>{
      const i=await create();await service.manage(i.id,admin,'cancel');
      await query("UPDATE service_operator_invitations SET created_at='2024-02-28T15:00:00.123456Z' WHERE id=$1",[i.id]);
      await db.transaction(m=>retainOperatorInvitations(m,new Date('2025-02-28T15:00:00.123Z')));
      expect(await query('SELECT id FROM service_operator_invitations WHERE id=$1',[i.id])).toHaveLength(1);
      await db.transaction(m=>retainOperatorInvitations(m,new Date('2025-02-28T15:00:00.124Z')));
      expect(await query('SELECT id FROM service_operator_invitations WHERE id=$1',[i.id])).toHaveLength(0);
    });
    it('serializes cancellation versus acceptance without a partial role or delivery secret',async()=>{
      const i=await create(), t=token();
      const outcomes=await Promise.allSettled([service.accept(t,target),service.manage(i.id,admin,'cancel')]);
      expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);
      const [row]=await query('SELECT status,invited_email,token_hash FROM service_operator_invitations WHERE id=$1',[i.id]);
      expect(row.invited_email).toBeNull();expect(row.token_hash).toBeNull();
      expect(await query("SELECT id FROM role_assignments WHERE user_id=$1 AND role='lecture:admin' AND is_active=true",[target]))
        .toHaveLength(row.status==='accepted'?1:0);
    });
    it('rechecks a service-admin inviter at acceptance instead of trusting creation-time authority',async()=>{
      const [org]=await query("INSERT INTO organizations(name,code) VALUES('Synthetic independent business',$1) RETURNING id",[randomUUID()]);
      await query("INSERT INTO semi_franchises(key,name,organization_id,status) VALUES('carepharm','Synthetic independent business',$1,'active') ON CONFLICT(key) DO UPDATE SET status='active'",[org.id]);
      await query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'neture:carepharm_admin',true)",[admin]);
      await query("INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'neture','active','customer'),($2,'neture','active','customer')",[admin,target]);
      await service.create({actorId:admin,targetUserId:target,role:'neture:carepharm_operator',serviceKey:'neture',scopeType:'service',scopeKey:'carepharm'});
      await query("UPDATE role_assignments SET is_active=false WHERE user_id=$1 AND role='neture:carepharm_admin'",[admin]);
      await expect(service.accept(token(),target)).rejects.toMatchObject({code:'SERVICE_ADMIN_REQUIRED'});
      expect(assignRole).not.toHaveBeenCalled();
    });
    it('does not resend to a stale email after a selected account changes its address',async()=>{
      const i=await create();await query("UPDATE users SET email='changed@fixture.invalid' WHERE id=$1",[target]);now=new Date(now.getTime()+61_000);
      await expect(service.manage(i.id,admin,'resend')).rejects.toMatchObject({code:'INVITATION_ACCOUNT_MISMATCH'});
      expect(mails).toHaveLength(1);
    });

    it('erases the expired requested secret even behind a cleanup backlog',async()=>{
      const i=await create(),t=token();now=new Date(new Date(i.expires_at).getTime()+1);
      await query(`INSERT INTO service_operator_invitations(invited_email,service_key,role,purpose,status,token_hash,expires_at,created_at)
        SELECT 'backlog-'||n||'@fixture.invalid','lecture','lecture:admin','assignment','pending',lpad(n::text,64,'0'),$1::timestamptz-interval '1 day',$1::timestamptz-interval '8 days' FROM generate_series(1,501) n`,[now]);
      await expect(service.accept(t,target)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
      expect((await query('SELECT invited_email,token_hash,status FROM service_operator_invitations WHERE id=$1',[i.id]))[0]).toEqual({invited_email:null,token_hash:null,status:'expired'});
    });
    it('binds a branch invitation to current branch membership and never grants before acceptance',async()=>{
      const [branch]=await query("INSERT INTO kpa_organizations(name,type,is_active) VALUES('Fixture branch','group',true) RETURNING id");
      await query("INSERT INTO branch_memberships(user_id,organization_id,status) VALUES($1,$2,'active')",[target,branch.id]);
      await query("INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'kpa-branch','active','customer')",[target]);
      await service.create({actorId:admin,targetUserId:target,serviceKey:'kpa-branch',role:'kpa-branch:operator',scopeType:'branch',scopeKey:branch.id});
      expect(assignRole).not.toHaveBeenCalled();
      expect(await service.inspect(token(),target)).toMatchObject({scopeName:'Fixture branch'});
      await service.accept(token(),target);expect(assignRole).toHaveBeenCalledTimes(1);
    });
    it('refuses a branch recipient who moved to another branch after invitation',async()=>{
      const [branch]=await query("INSERT INTO kpa_organizations(name,type,is_active) VALUES('Fixture branch','group',true) RETURNING id");
      await query("INSERT INTO branch_memberships(user_id,organization_id,status) VALUES($1,$2,'active')",[target,branch.id]);
      await query("INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'kpa-branch','active','customer')",[target]);
      await service.create({actorId:admin,targetUserId:target,serviceKey:'kpa-branch',role:'kpa-branch:operator',scopeType:'branch',scopeKey:branch.id});
      await query("UPDATE branch_memberships SET status='left',left_at=NOW() WHERE user_id=$1",[target]);
      await expect(service.accept(token(),target)).rejects.toMatchObject({code:'NOT_BRANCH_MEMBER'});expect(assignRole).not.toHaveBeenCalled();
    });
    it('allows a verified email-only account to inspect and explicitly accept a service operator invitation',async()=>{
      await query('DELETE FROM linked_accounts WHERE "userId"=$1',[target]);
      await service.create({actorId:admin,targetUserId:target,serviceKey:'lecture',role:'lecture:admin'});
      expect(assignRole).not.toHaveBeenCalled();await service.inspect(token(),target);await service.accept(token(),target);
      expect(assignRole).toHaveBeenCalledTimes(1);
    });
    it('lets an invited unregistered recipient sign up with email only and then consent',async()=>{
      await service.create({actorId:admin,email:'new-email-only@fixture.invalid',serviceKey:'lecture',role:'lecture:admin'});
      const recipient=await user('new-email-only@fixture.invalid');await query('DELETE FROM linked_accounts WHERE "userId"=$1',[recipient]);
      await service.inspect(token(),recipient);expect(assignRole).not.toHaveBeenCalled();await service.accept(token(),recipient);
      expect(assignRole).toHaveBeenCalledTimes(1);
    });
    it('still refuses an unverified email-only recipient before granting any privilege',async()=>{
      await service.create({actorId:admin,targetUserId:target,serviceKey:'lecture',role:'lecture:admin'});
      await query('DELETE FROM linked_accounts WHERE "userId"=$1',[target]);await query('UPDATE users SET "isEmailVerified"=false WHERE id=$1',[target]);
      await expect(service.accept(token(),target)).rejects.toMatchObject({code:'ACCOUNT_INACTIVE'});expect(assignRole).not.toHaveBeenCalled();
    });
    it('does not overwrite a role granted by another admin while the invitation was pending',async()=>{
      await service.create({actorId:admin,targetUserId:target,serviceKey:'lecture',role:'lecture:admin'});
      const until=new Date('2099-01-01T00:00:00Z');
      await query("INSERT INTO role_assignments(user_id,role,is_active,assigned_by,valid_until) VALUES($1,'lecture:admin',true,$2,$3)",[target,admin,until]);
      await expect(service.accept(token(),target)).rejects.toMatchObject({code:'OPERATOR_ALREADY_ACTIVE'});
      expect(assignRole).not.toHaveBeenCalled();
      const [row]=await query("SELECT assigned_by,valid_until FROM role_assignments WHERE user_id=$1 AND role='lecture:admin'",[target]);
      expect(row.assigned_by).toBe(admin);expect(new Date(row.valid_until).getTime()).toBe(until.getTime());
    });
    it.each([true,false])('requires schedule review rather than silently changing an active=%s scheduled role',async(active)=>{
      await query("INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'lecture:admin',$2,'2099-01-01')",[target,active]);
      await expect(service.create({actorId:admin,targetUserId:target,serviceKey:'lecture',role:'lecture:admin'})).rejects.toMatchObject({code:'OPERATOR_ROLE_SCHEDULE_REVIEW_REQUIRED'});
      expect(mails).toHaveLength(0);expect(assignRole).not.toHaveBeenCalled();
    });
    it('rollback refuses stored consent evidence and leaves the table intact',async()=>{
      await service.create({actorId:admin,targetUserId:target,serviceKey:'lecture',role:'lecture:admin'});
      const q=db.createQueryRunner();await q.startTransaction();
      try { await expect(new CreateServiceOperatorInvitations1792886400000().down(q)).rejects.toThrow('empty table'); }
      finally { await q.rollbackTransaction();await q.release(); }
      expect(await query('SELECT id FROM service_operator_invitations')).toHaveLength(1);
    });
    it('empty-table rollback is transactional and preserves schema when rolled back',async()=>{
      const q=db.createQueryRunner();await q.startTransaction();
      try { await new CreateCentralOperationMenuGrants1793186241009().down(q); await new CreateServiceOperatorInvitations1792886400000().down(q);expect(await q.query("SELECT to_regclass('service_operator_invitations') AS relation")).toEqual([{relation:null}]); }
      finally { await q.rollbackTransaction();await q.release(); }
      expect(await query("SELECT to_regclass('service_operator_invitations') AS relation")).toEqual([{relation:'service_operator_invitations'}]);
    });
    async function cooperative() {
      const [org]=await query("INSERT INTO organizations(name,code) VALUES('Fixture federation',$1) RETURNING id",[randomUUID()]);
      const [sf]=await query("INSERT INTO semi_franchises(key,name,organization_id,status) VALUES($1,'Fixture federation',$2,'active') RETURNING id",[randomUUID(),org.id]);
      const [c]=await query("INSERT INTO cooperatives(slug,name,semi_franchise_id,status) VALUES($1,'Fixture cooperative',$2,'active') RETURNING id",[randomUUID(),sf.id]);return c.id;
    }
    it('activates a cooperative role only after consent and shows the recipient the cooperative name',async()=>{
      const coop=await cooperative();await query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'neture:pharmcoop_admin',true)",[admin]);
      await service.create({actorId:admin,targetUserId:target,serviceKey:'neture',role:'cooperative:admin',scopeType:'cooperative',scopeKey:coop});
      expect(await query('SELECT * FROM cooperative_roles WHERE user_id=$1',[target])).toHaveLength(0);
      expect(await service.inspect(token(),target)).toMatchObject({scopeName:'Fixture cooperative'});
      await service.accept(token(),target);expect(await query("SELECT * FROM cooperative_roles WHERE user_id=$1 AND role='admin' AND revoked_at IS NULL",[target])).toHaveLength(1);
    });
    it('a cooperative admin can invite its own operator but cannot invite another cooperative or federation admin',async()=>{
      const coop=await cooperative(),foreign=await cooperative();
      await query("INSERT INTO cooperative_roles(cooperative_id,user_id,role) VALUES($1,$2,'admin')",[coop,admin]);
      await expect(service.create({actorId:admin,targetUserId:target,serviceKey:'neture',role:'cooperative:admin',scopeType:'cooperative',scopeKey:coop})).rejects.toMatchObject({code:'COOPERATIVE_FORBIDDEN'});
      await expect(service.create({actorId:admin,targetUserId:target,serviceKey:'neture',role:'cooperative:operator',scopeType:'cooperative',scopeKey:foreign})).rejects.toMatchObject({code:'COOPERATIVE_FORBIDDEN'});
      await service.create({actorId:admin,targetUserId:target,serviceKey:'neture',role:'cooperative:operator',scopeType:'cooperative',scopeKey:coop});
      await service.accept(token(),target);expect(await query("SELECT * FROM cooperative_roles WHERE user_id=$1 AND role='operator' AND cooperative_id=$2",[target,coop])).toHaveLength(1);
    });

  },
);
