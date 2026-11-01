import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { createImprovement, editImprovement, getImprovement, listImprovements, replyImprovement, setupImprovements } from '../community-improvements.js';
import { centralOperationOverview } from '../../admin/central-operation-overview.js';
const fixture = process.env.O4O_IMPROVEMENT_TEST_URL;
(fixture ? describe : describe.skip)('official improvement forum on canonical PostgreSQL schema', () => {
  let db: DataSource;
  let admin: string, member: string, other: string;
  const user = (id: string) => ({ id, roles: [], memberships: [] });
  beforeAll(async () => {
    const url = new URL(fixture!);
    if (url.hostname !== '127.0.0.1' || !/^\/o4o_improvements_(?:[a-f0-9]+|integration)$/.test(url.pathname) || (url.pathname === '/o4o_improvements_integration' && url.port !== '55440')) throw new Error('Dedicated disposable local database required');
    process.env.JWT_SECRET = 'synthetic-improvement-postgres-proof';
    db = new DataSource({ type: 'postgres', url: fixture, entities: [], extra: { max: 4 } }); await db.initialize();
    [admin, member, other] = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of [admin, member, other]) await db.query(`INSERT INTO users(id,email,status,"isActive","isEmailVerified",nickname) VALUES($1,$2,'active',true,true,'Synthetic fixture')`, [id, `${id}@example.invalid`]);
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'platform:super_admin')`, [admin]);
  });
  afterAll(async () => { if (db?.isInitialized) await db.destroy(); });
  it('serializes setup, preserves its owner, and does not create service memberships or roles', async () => {
    const results = await Promise.all([db.transaction(m => setupImprovements(m, user(admin))), db.transaction(m => setupImprovements(m, user(admin)))]);
    expect(results[0].id).toBe(results[1].id); expect(results.filter(r => r.created)).toHaveLength(1);
    expect(await db.query('SELECT requester_id FROM forum_category_requests WHERE id=$1', [results[0].id])).toEqual([{ requester_id: admin }]);
    expect(await db.query('SELECT user_id,role FROM forum_category_members')).toEqual([{ user_id: admin, role: 'owner' }]);
    expect(await db.query('SELECT id FROM service_memberships')).toHaveLength(0);
  });
  it('binds the board, rejects announcements from members, and deduplicates retries', async () => {
    const input = { kind: 'bug', title: 'Canonical SQL issue', body: 'Synthetic reproduction steps', requestId: randomUUID(), state: 'completed', forumId: randomUUID() };
    const a = await db.transaction(m => createImprovement(m, user(member), input));
    const b = await db.transaction(m => createImprovement(m, user(member), input));
    expect(a.id).toBe(b.id);
    const read = await getImprovement(db, null, a.id); expect(read.state).toBe('received'); expect((read as any).authorId).toBeUndefined();
    await expect(db.transaction(m => createImprovement(m, user(member), { ...input, requestId: randomUUID(), kind: 'update' }))).rejects.toMatchObject({ status: 403 });
    const unsafe = await db.transaction(m => createImprovement(m, user(member), { kind: 'bug', title: 'Text-only reproduction', body: '<script>fixture()</script>' }));
    const [stored] = await db.query('SELECT content FROM forum_post WHERE id=$1', [unsafe.id]);
    expect(stored.content[0].content).toBe('&lt;script&gt;fixture()&lt;/script&gt;');
    await expect(listImprovements(db, user(member), 1, '', true)).rejects.toMatchObject({ status: 403 });
  });
  it('keeps unread notifications separate from actual pending work and rejects stale decisions', async () => {
    const update = await db.transaction(m => createImprovement(m, user(admin), { kind: 'update', title: 'Synthetic release', body: 'Synthetic verified release description' }));
    const input = { kind: 'suggestion', title: 'New workflow', body: 'Synthetic member workflow' };
    const post = await db.transaction(m => createImprovement(m, user(member), input));
    const count = async () => (await centralOperationOverview(db, admin, ['platform:super_admin'], ['community.forums'])).tasks.find(t => t.key === 'community-improvements')!.count!;
    const before = await count(); expect(before).toBeGreaterThan(0);
    await db.query('UPDATE notifications SET "isRead"=true WHERE "userId"=$1', [admin]); expect(await count()).toBe(before);
    await expect(db.transaction(m => replyImprovement(m, user(other), post.id, { body: 'Forged official reply', state: 'completed', version: 1 }, true))).rejects.toMatchObject({ status: 403 });
    await expect(db.transaction(m => replyImprovement(m, user(admin), post.id, { body: '', state: 'completed', version: 1 }, true))).rejects.toMatchObject({ status: 400 });
    await expect(db.transaction(m => replyImprovement(m, user(admin), post.id, { body: 'Invalid link', state: 'completed', version: 1, updateUrl: 'https://example.invalid/improvements/' + update.id }, true))).rejects.toMatchObject({ status: 400 });
    await db.transaction(m => replyImprovement(m, user(admin), post.id, { body: 'Applied and verified', state: 'completed', version: 1, updateUrl: 'https://community.neture.co.kr/improvements/' + update.id }, true)); expect(await count()).toBe(before - 1);
    await expect(db.transaction(m => replyImprovement(m, user(admin), post.id, { body: 'Stale result', state: 'reviewing', version: 1 }, true))).rejects.toMatchObject({ status: 409 });
    await db.transaction(m => replyImprovement(m, user(other), post.id, { body: 'Related member experience', version: 2 }, false)); expect(await count()).toBe(before - 1);
    await db.transaction(m => replyImprovement(m, user(member), post.id, { body: 'New reproduction information', version: 3 }, false)); expect(await count()).toBe(before);
    const read = await getImprovement(db, null, post.id); expect(read.replies).toHaveLength(3); expect(read.replies[0].updateId).toBe(update.id); expect(read.state).toBe('received');
    expect(await db.query(`SELECT id FROM notifications WHERE "userId"=$1 AND metadata->>'event'='improvement.replied'`, [member])).not.toHaveLength(0);
  });
  it('requires the author and matching version for edits, retaining official replies', async () => {
    const { id } = await db.transaction(m => createImprovement(m, user(member), { kind: 'bug', title: 'Edit issue', body: 'First description' }));
    await expect(db.transaction(m => editImprovement(m, user(other), id, { title: 'Hijack', body: 'Hijacked text', version: 1 }))).rejects.toMatchObject({ status: 403 });
    await db.transaction(m => replyImprovement(m, user(admin), id, { body: 'More information please', state: 'needs_info', version: 1 }, true));
    await db.transaction(m => editImprovement(m, user(member), id, { title: 'Edited issue', body: 'Updated description', version: 2 }));
    const value = await getImprovement(db, null, id); expect(value.title).toBe('Edited issue'); expect(value.state).toBe('received'); expect(value.replies).toHaveLength(1);
    await expect(db.transaction(m => editImprovement(m, user(member), id, { title: 'Stale', body: 'Stale description', version: 2 }))).rejects.toMatchObject({ status: 409 });
  });
  it('denies suspended accounts and revoked operators and hides signed-public designation tampering', async () => {
    await db.query(`INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'community','suspended')`, [other]);
    await expect(db.transaction(m => createImprovement(m, user(other), { kind: 'bug', title: 'Blocked', body: 'Blocked request' }))).rejects.toMatchObject({ status: 403 });
    await db.query('UPDATE role_assignments SET is_active=false WHERE user_id=$1', [admin]);
    await expect(db.transaction(m => setupImprovements(m, user(admin)))).rejects.toMatchObject({ status: 403 });
    await db.query(`UPDATE forum_category_requests SET metadata=jsonb_set(metadata,'{o4oCommunityPublicReadV1,mode}','"selected"') WHERE slug='o4o-updates-improvements'`);
    expect((await listImprovements(db, null, 1, '')).ready).toBe(false);
  });
});
