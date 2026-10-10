import Database from 'better-sqlite3';
import type { EntityManager } from 'typeorm';
import { hasCommunityServiceOperator } from '../community-service-operator-access.js';
import { resolveCommunityWorkspace } from '../community-workspace.service.js';
import { CommunityLifecycleService } from '../community-lifecycle.service.js';

const NOW = '2026-10-10 12:00:00';
const BEFORE = '2026-10-10 11:59:59';
const AFTER = '2026-10-10 12:00:01';

/** Execute the actual relational authorization queries, rather than returning a
 * mocked permission. SQLite is already an API dev dependency. These fixtures
 * use fixed-width UTC timestamps; PostgreSQL timestamp/timezone behavior is not
 * under test. Only its COUNT cast and boolean result representation are adapted.
 */
describe('central community roles: SQL-backed validity decisions', () => {
  let db: any;
  let now: string;
  let exec: Pick<EntityManager, 'query'>;

  beforeEach(() => {
    now = NOW;
    db = new Database(':memory:');
    db.function('current_timestamp', () => now);
    db.exec(`
      CREATE TABLE users (id TEXT, status TEXT, "isActive" BOOLEAN, "isEmailVerified" BOOLEAN);
      CREATE TABLE service_memberships (user_id TEXT, service_key TEXT, status TEXT);
      CREATE TABLE role_assignments (user_id TEXT, role TEXT, is_active BOOLEAN, valid_from TEXT, valid_until TEXT);
      CREATE TABLE communities (id TEXT, slug TEXT, name TEXT, status TEXT);
      CREATE TABLE community_memberships (community_id TEXT, user_id TEXT, status TEXT, role TEXT);
      CREATE TABLE semi_franchises (id TEXT, key TEXT, name TEXT, status TEXT, community_key TEXT);
      INSERT INTO users VALUES ('u1', 'active', true, true), ('u2', 'active', true, true);
      INSERT INTO service_memberships VALUES ('u1', 'community', 'active'), ('u2', 'community', 'active');
      INSERT INTO communities VALUES ('c1', 'fixture-one', 'First', 'active'), ('c2', 'fixture-two', 'Second', 'active');
    `);
    exec = {
      async query<T = any>(sql: string, params: unknown[] = []): Promise<T> {
        const bindings = Object.fromEntries(params.map((value, i) => [String(i + 1), typeof value === 'boolean' ? Number(value) : value]));
        return db.prepare(sql.replace(/COUNT\(\*\)::int/g, 'COUNT(*)')).all(bindings).map((row: any) => {
          if ('account_active' in row) row.account_active = !!row.account_active;
          if ('email_verified' in row) row.email_verified = !!row.email_verified;
          return row;
        }) as T;
      },
    };
  });

  afterEach(() => db.close());

  function assign(role: string, from: string, until: string | null, active = true, userId = 'u1') {
    db.prepare('INSERT INTO role_assignments VALUES (?, ?, ?, ?, ?)')
      .run(userId, role, Number(active), from, until);
  }

  describe.each(['community:admin', 'community:operator'])('%s', role => {
    it.each([
      ['future start', AFTER, null],
      ['expired end', BEFORE, BEFORE],
    ])('denies %s without individual membership', async (_label, from, until) => {
      assign(role, from!, until);
      expect(await hasCommunityServiceOperator(exec, 'u1')).toBe(false);
      expect(await resolveCommunityWorkspace(exec, { id: 'u1' }, 'fixture-one'))
        .toMatchObject({ allowed: false, canManage: false });
      const service = new CommunityLifecycleService(exec as never);
      expect(await service.listOperatedCommunities('u1')).toEqual([]);
    });

    it.each([
      ['current interval', BEFORE, AFTER],
      ['unbounded end', BEFORE, null],
      ['inclusive start', NOW, AFTER],
      ['inclusive end', BEFORE, NOW],
    ])('allows %s without individual membership', async (_label, from, until) => {
      assign(role, from!, until);
      expect(await hasCommunityServiceOperator(exec, 'u1')).toBe(true);
      expect(await resolveCommunityWorkspace(exec, { id: 'u1' }, 'fixture-one'))
        .toMatchObject({ allowed: true, canManage: true, canJoin: false, membershipStatus: null });
      const service = new CommunityLifecycleService(exec as never);
      expect((await service.listOperatedCommunities('u1')).map(c => c.id)).toEqual(['c1', 'c2']);
    });

    it('rechecks the same user as the interval starts and expires', async () => {
      assign(role, NOW, AFTER);
      const user = { id: 'u1' };
      now = BEFORE;
      expect(await resolveCommunityWorkspace(exec, user, 'fixture-one')).toMatchObject({ canManage: false });
      now = NOW;
      expect(await resolveCommunityWorkspace(exec, user, 'fixture-one')).toMatchObject({ canManage: true });
      now = '2026-10-10 12:00:02';
      expect(await resolveCommunityWorkspace(exec, user, 'fixture-one')).toMatchObject({ canManage: false });
    });

    it('does not let a future or expired central role remove individual operator access', async () => {
      assign(role, AFTER, null);
      assign(role, BEFORE, BEFORE);
      db.exec("INSERT INTO community_memberships VALUES ('c1', 'u1', 'active', 'operator')");
      expect(await hasCommunityServiceOperator(exec, 'u1')).toBe(false);
      expect(await resolveCommunityWorkspace(exec, { id: 'u1' }, 'fixture-one'))
        .toMatchObject({ allowed: true, canManage: true });
      expect(await resolveCommunityWorkspace(exec, { id: 'u1' }, 'fixture-two'))
        .toMatchObject({ allowed: false, canManage: false });
      const service = new CommunityLifecycleService(exec as never);
      expect((await service.listOperatedCommunities('u1')).map(c => c.id)).toEqual(['c1']);
    });
  });

  it('cannot use another user’s otherwise valid central role', async () => {
    assign('community:admin', BEFORE, null, true, 'u2');
    expect(await hasCommunityServiceOperator(exec, 'u1')).toBe(false);
  });

  it('cannot use an inactive assignment within its validity window', async () => {
    assign('community:operator', BEFORE, null, false);
    expect(await hasCommunityServiceOperator(exec, 'u1')).toBe(false);
  });
});
