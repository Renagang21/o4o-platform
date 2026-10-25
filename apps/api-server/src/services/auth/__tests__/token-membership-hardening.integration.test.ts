import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { User } from '../../../entities/User.js';

let db: DataSource;
let failVerificationWrite = false;
let failSecurityRotation = false;
const userRepository = (manager: Pick<EntityManager, 'query'>) => ({
  findOne: async ({ where }: { where: { id: string } }) => {
    const rows = await manager.query('SELECT * FROM users WHERE id=$1', [where.id]);
    return rows[0] ? Object.assign(new User(), rows[0]) : null;
  },
  update: async ({ id }: { id: string }) => {
    if (failVerificationWrite) { failVerificationWrite = false; throw new Error('synthetic verification failure'); }
    return manager.query('UPDATE users SET "isEmailVerified"=true WHERE id=$1', [id]);
  },
});
const adapter = {
  query: (...args: any[]) => (db.query as any)(...args),
  getRepository: () => userRepository({ query: (...args: any[]) => (db.query as any)(...args) }),
  transaction: (callback: (manager: any) => Promise<unknown>) => db.transaction(manager => callback({
    query: manager.query.bind(manager), getRepository: () => userRepository(manager),
  })),
};
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {
  query: (...args: any[]) => adapter.query(...args),
  transaction: (callback: any) => adapter.transaction(callback),
  getRepository: () => adapter.getRepository(),
} }));

import { EmailAuthTokenService } from '../email-auth-token.service.js';
import { EmailAuthService, hashToken } from '../email-auth.service.js';
import { ServiceJoinService } from '../service-join.service.js';
import { passwordCredentialService } from '../password-credential.service.js';

// Dedicated loopback fixture only. No app.env, credential, remote URL or default DB port.
const port = Number(process.env.O4O_AUTH_HARDENING_TEST_PORT);
const integration = Number.isInteger(port) && port > 1024 && ![5432, 5442].includes(port) ? describe : describe.skip;
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};

integration('auth token and membership hardening (isolated PostgreSQL)', () => {
  const schema = `auth_hardening_${randomUUID().replace(/-/g, '')}`;
  let user: User;
  let email: EmailAuthService;
  let tokens: EmailAuthTokenService;
  const oldPassword = 'oldFixture123!';
  const newPassword = 'newFixture123!';
  const live = (table = 'password_reset_tokens') => db.query(`SELECT * FROM ${table} WHERE user_id=$1 AND consumed_at IS NULL`, [user.id]);
  const send = async (kind: 'reset' | 'verification' = 'reset', target = user) => {
    let plain = '';
    expect(await tokens.send(kind, target, 60000, async value => { plain = value; return { success: true }; })).toBe(true);
    return plain;
  };
  beforeAll(async () => {
    db = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'o4o_fixture',
      database: 'o4o_auth_hardening_test', entities: [], synchronize: false,
      extra: { max: 8, options: `-c search_path=${schema},public -c lock_timeout=3000 -c statement_timeout=10000` } });
    await db.initialize();
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`CREATE TABLE users (
      id uuid PRIMARY KEY, email text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'active',
      "isActive" boolean NOT NULL DEFAULT true, "isEmailVerified" boolean NOT NULL DEFAULT false,
      "refreshTokenFamily" text, "businessInfo" jsonb
    )`);
    await db.query('CREATE TABLE demo_accounts (user_id uuid REFERENCES users(id) ON DELETE CASCADE, is_active boolean)');
    await db.query(`CREATE TABLE user_password_credentials (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      password_hash text NOT NULL, algo text, password_changed_at timestamptz, created_at timestamptz, updated_at timestamptz
    )`);
    for (const table of ['email_verification_tokens', 'password_reset_tokens']) {
      await db.query(`CREATE TABLE ${table} (
        user_id uuid REFERENCES users(id) ON DELETE CASCADE, token_hash text PRIMARY KEY,
        ${table === 'email_verification_tokens' ? 'email text NOT NULL,' : ''}
        expires_at timestamptz NOT NULL, consumed_at timestamptz
      )`);
    }
    await db.query(`CREATE TABLE service_memberships (
      id uuid PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
      user_id uuid REFERENCES users(id) ON DELETE CASCADE, service_key text, status text, role text,
      created_at timestamptz, updated_at timestamptz, UNIQUE(user_id,service_key)
    )`);
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      try {
        await db.query(`DROP SCHEMA ${schema} CASCADE`);
        expect((await db.query('SELECT count(*)::int AS count FROM pg_namespace WHERE nspname=$1', [schema]))[0].count).toBe(0);
      } finally { await db.destroy(); }
    }
  });
  beforeEach(async () => {
    failVerificationWrite = false; failSecurityRotation = false;
    user = Object.assign(new User(), (await db.query(
      'INSERT INTO users(id,email,"refreshTokenFamily") VALUES ($1,$2,$3) RETURNING *',
      [randomUUID(), `${randomUUID()}@fixture.invalid`, randomUUID()],
    ))[0]);
    await passwordCredentialService.setPassword(user.id, oldPassword, db.manager);
    tokens = new EmailAuthTokenService(() => db, () => new Date());
    email = new EmailAuthService({ dataSource: adapter as any,
      passwords: {
        hasPassword: (id, manager) => passwordCredentialService.hasPassword(id, manager ?? db.manager),
        verifyPassword: (id, plain, manager) => passwordCredentialService.verifyPassword(id, plain, manager ?? db.manager),
        setPassword: (id, plain, manager) => passwordCredentialService.setPassword(id, plain, manager ?? db.manager),
      }, readRoles: async () => [],
      revokeAllSessions: async (id, manager) => {
        if (failSecurityRotation) throw new Error('synthetic rotation failure');
        await manager!.query('UPDATE users SET "refreshTokenFamily"=$2 WHERE id=$1', [id, randomUUID()]);
      },
    });
  });
  afterEach(async () => { if (user?.id) await db.query('DELETE FROM users WHERE id=$1', [user.id]); });

  it('password change retires old reset links and keeps the changed credential', async () => {
    const oldToken = await send();
    await email.setPasswordForUser(user.id, { currentPassword: oldPassword, newPassword });
    await expect(email.resetPassword(oldToken, oldPassword)).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_TOKEN' });
    expect(await passwordCredentialService.verifyPassword(user.id, newPassword, db.manager)).toBe(true);
    expect(await live()).toHaveLength(0);
  });
  it('reset retires every sibling token and does not touch another user or verification purpose', async () => {
    const other = Object.assign(new User(), (await db.query('INSERT INTO users(id,email) VALUES($1,$2) RETURNING *', [randomUUID(), `${randomUUID()}@fixture.invalid`]))[0]);
    try {
      const reset = await send();
      const verification = await send('verification');
      const otherReset = await send('reset', other);
      const sibling = randomUUID();
      await db.query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval \'1 minute\')', [user.id, hashToken(sibling)]);
      await email.resetPassword(reset, newPassword);
      await expect(email.resetPassword(sibling, oldPassword)).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_TOKEN' });
      expect(await live()).toHaveLength(0);
      expect((await live('email_verification_tokens'))[0].token_hash).toBe(hashToken(verification));
      expect((await db.query('SELECT token_hash FROM password_reset_tokens WHERE user_id=$1 AND consumed_at IS NULL', [other.id]))[0].token_hash).toBe(hashToken(otherReset));
    } finally { await db.query('DELETE FROM users WHERE id=$1', [other.id]); }
  });
  it('failed password rotation rolls back the password and reset-link retirement', async () => {
    const token = await send();
    failSecurityRotation = true;
    await expect(email.resetPassword(token, newPassword)).rejects.toThrow('synthetic rotation failure');
    expect(await passwordCredentialService.verifyPassword(user.id, oldPassword, db.manager)).toBe(true);
    expect(await live()).toHaveLength(1);
    failSecurityRotation = false;
    await expect(email.resetPassword(token, newPassword)).resolves.toBeUndefined();
  });
  it('failed verification write leaves the same link usable for a retry', async () => {
    const token = await send('verification');
    failVerificationWrite = true;
    await expect(email.verifyEmail(token)).rejects.toThrow('synthetic verification failure');
    expect(await live('email_verification_tokens')).toHaveLength(1);
    await expect(email.verifyEmail(token)).resolves.toHaveProperty('maskedEmail');
    await expect(email.verifyEmail(token)).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_TOKEN' });
  });
  it.each([false, true])('SMTP failure (throw=%s) preserves the last delivered link and removes the prepared row', async shouldThrow => {
    const oldToken = await send();
    const count = (await db.query('SELECT count(*)::int AS count FROM password_reset_tokens WHERE user_id=$1', [user.id]))[0].count;
    expect(await tokens.send('reset', user, 60000, async () => {
      if (shouldThrow) throw new Error('synthetic SMTP failure');
      return { success: false };
    })).toBe(false);
    expect((await live())[0].token_hash).toBe(hashToken(oldToken));
    expect((await db.query('SELECT count(*)::int AS count FROM password_reset_tokens WHERE user_id=$1', [user.id]))[0].count).toBe(count);
  });
  it('overlapping deliveries activate only the last confirmed link, without a DB lock during SMTP', async () => {
    const a = deferred(), b = deferred(), enteredA = deferred(), enteredB = deferred();
    let first = '', second = '';
    const taskA = tokens.send('reset', user, 60000, async plain => { first = plain; enteredA.resolve(); await a.promise; return { success: true }; });
    const taskB = tokens.send('reset', user, 60000, async plain => { second = plain; enteredB.resolve(); await b.promise; return { success: true }; });
    try {
      await Promise.all([enteredA.promise, enteredB.promise]);
      await db.transaction(async manager => {
        await manager.query("SET LOCAL lock_timeout='200ms'");
        await manager.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      });
      expect(await live()).toHaveLength(0); // Prepared proofs are not usable.
      b.resolve(); expect(await taskB).toBe(true);
      a.resolve(); expect(await taskA).toBe(true);
      expect((await live()).map(row => row.token_hash)).toEqual([hashToken(first)]);
      await expect(email.resetPassword(second, newPassword)).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_TOKEN' });
    } finally { a.resolve(); b.resolve(); await Promise.allSettled([taskA, taskB]); }
  });
  it('password changes during delivery prevent an old prepared proof from becoming live', async () => {
    const gate = deferred(), entered = deferred();
    const task = tokens.send('reset', user, 60000, async () => { entered.resolve(); await gate.promise; return { success: true }; });
    try {
      await entered.promise;
      await email.setPasswordForUser(user.id, { currentPassword: oldPassword, newPassword });
      gate.resolve(); expect(await task).toBe(false);
      expect(await live()).toHaveLength(0);
    } finally { gate.resolve(); await Promise.allSettled([task]); }
  });
  it.each(['email', 'suspended', 'verified'])('a concurrent %s account change prevents stale verification activation', async change => {
    const gate = deferred(), entered = deferred();
    const task = tokens.send('verification', user, 60000, async () => { entered.resolve(); await gate.promise; return { success: true }; });
    try {
      await entered.promise;
      if (change === 'email') await db.query('UPDATE users SET email=$2 WHERE id=$1', [user.id, `${randomUUID()}@fixture.invalid`]);
      if (change === 'suspended') await db.query("UPDATE users SET status='suspended' WHERE id=$1", [user.id]);
      if (change === 'verified') await db.query('UPDATE users SET "isEmailVerified"=true WHERE id=$1', [user.id]);
      gate.resolve(); expect(await task).toBe(false);
      expect(await live('email_verification_tokens')).toHaveLength(0);
    } finally { gate.resolve(); await Promise.allSettled([task]); }
  });
  it('an activation transaction failure preserves the old proof and cleans only the prepared one', async () => {
    const oldToken = await send();
    await db.query(`CREATE FUNCTION reject_retirement() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF OLD.consumed_at IS NULL AND NEW.consumed_at IS NOT NULL THEN
        RAISE EXCEPTION 'synthetic token retirement failure'; END IF; RETURN NEW; END $$`);
    await db.query('CREATE TRIGGER fail_retirement BEFORE UPDATE ON password_reset_tokens FOR EACH ROW EXECUTE FUNCTION reject_retirement()');
    try {
      await expect(tokens.send('reset', user, 60000, async () => ({ success: true }))).rejects.toThrow('synthetic token retirement failure');
      expect((await live()).map(row => row.token_hash)).toEqual([hashToken(oldToken)]);
      expect((await db.query('SELECT count(*)::int AS count FROM password_reset_tokens WHERE user_id=$1', [user.id]))[0].count).toBe(1);
    } finally {
      await db.query('DROP TRIGGER fail_retirement ON password_reset_tokens');
      await db.query('DROP FUNCTION reject_retirement()');
    }
  });
  it('two consumers of one proof have exactly one committed reset', async () => {
    const token = await send();
    const results = await Promise.allSettled([email.resetPassword(token, newPassword), email.resetPassword(token, oldPassword)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(await live()).toHaveLength(0);
  });
  it('concurrent first applications return created/duplicate rather than a unique violation', async () => {
    const input = { userId: user.id, serviceKey: 'kpa-branch', role: 'member' };
    const results = await Promise.all([ServiceJoinService.apply(input), ServiceJoinService.apply(input)]);
    expect(results.map(result => result.outcome).sort()).toEqual(['created', 'duplicate']);
    expect((await db.query('SELECT status FROM service_memberships WHERE user_id=$1', [user.id]))).toEqual([{ status: 'pending' }]);
  });
  it.each(['active', 'pending', 'withdrawn', 'rejected', 'suspended'])('reapplication preserves the existing %s lifecycle policy and other service', async status => {
    const input = { userId: user.id, serviceKey: 'kpa-branch', role: 'member' };
    await ServiceJoinService.apply(input);
    await db.query('UPDATE service_memberships SET status=$2 WHERE user_id=$1', [user.id, status]);
    await db.query("INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'community','active','operator')", [user.id]);
    const reapply = ['rejected', 'suspended'].includes(status);
    expect(await ServiceJoinService.apply(input)).toEqual({ outcome: reapply ? 'reapplied' : 'duplicate', status: reapply ? 'pending' : status });
    expect((await db.query("SELECT status,role FROM service_memberships WHERE user_id=$1 AND service_key='community'", [user.id]))[0]).toEqual({ status: 'active', role: 'operator' });
  });
  it('an application waiting behind an operator commit preserves the active status and role', async () => {
    const input = { userId: user.id, serviceKey: 'kpa-branch', role: 'member' };
    await ServiceJoinService.apply(input);
    await db.query("UPDATE service_memberships SET status='rejected' WHERE user_id=$1", [user.id]);
    const operator = db.createQueryRunner();
    await operator.connect(); await operator.startTransaction();
    let pending: Promise<unknown> | undefined;
    try {
      await operator.query("UPDATE service_memberships SET status='active', role='operator' WHERE user_id=$1", [user.id]);
      pending = ServiceJoinService.apply(input);
      // Confirm a real lock waiter via PostgreSQL, rather than using a timing sleep.
      for (let attempt = 0; attempt < 100; attempt++) {
        const waiting = await db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%service_memberships%' AND pid<>pg_backend_pid()");
        if (waiting.length) break;
        if (attempt === 99) throw new Error('application did not reach membership lock');
      }
      await operator.commitTransaction();
      expect(await pending).toEqual({ outcome: 'duplicate', status: 'active' });
      expect((await db.query('SELECT status,role FROM service_memberships WHERE user_id=$1', [user.id]))[0]).toEqual({ status: 'active', role: 'operator' });
    } finally {
      if (operator.isTransactionActive) await operator.rollbackTransaction();
      await operator.release(); await Promise.allSettled(pending ? [pending] : []);
    }
  });
});
