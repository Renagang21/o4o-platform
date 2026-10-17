import { assertOrdinaryServiceMember } from '../services/operations/service-relationship-protection.js';
jest.mock('@o4o/forum-core/entities', () => ({ ForumCategoryRequest: class {} }), { virtual: true });
jest.mock('../services/forum/forumHardDelete.js', () => ({ purgeForumAndDependents: jest.fn(async () => ({ posts: 2, comments: 3 })) }));
import { ProductCleanupOperationsService } from '../modules/neture/services/product-cleanup-operations.service.js';
import { changeForumAvailability, hardDeleteForum } from '../services/forum/forum-operation.service.js';
import { purgeForumAndDependents } from '../services/forum/forumHardDelete.js';
import { contactDetail, updateOperatorContact } from '../modules/neture/services/contact-operations.service.js';
import { hardDeleteLectureCourse } from '../modules/lms/services/lecture-course-cleanup.service.js';
import { operationReason } from '../services/operations/operation-audit.js';

const query = jest.fn();
const findOne = jest.fn();
const save = jest.fn(async value => value);
const manager = { query, getRepository: () => ({ findOne, save }) };
const transaction = jest.fn(async run => run(manager));
const db = { transaction } as any;
const events: string[] = [];
beforeEach(() => {
  jest.clearAllMocks(); events.length = 0;
  transaction.mockImplementation(async run => { try { const data = await run(manager); events.push('commit'); return data; } catch (e) { events.push('rollback'); throw e; } });
  query.mockResolvedValue([]);
});

it.each([undefined, '', ' ', 1, '\0', 'x'.repeat(2001)])('rejects missing or unbounded destructive reason %p before a transaction', async reason => {
  expect(() => operationReason(reason)).toThrow();
  await expect(new ProductCleanupOperationsService(db).remove('offer', 'trash', 'admin', reason)).rejects.toMatchObject({ status: 400 });
  expect(transaction).not.toHaveBeenCalled();
});
it('redacts reason serialization while preserving the exact audit payload for PostgreSQL', async () => {
  query.mockImplementation(async sql => sql.includes('FOR UPDATE') ? [{ id: 'offer', deleted_at: 'date' }] : []);
  await new ProductCleanupOperationsService(db).changeTrash('offer', 'op', true);
  const audit = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO action_logs'))!;
  expect(audit[1].slice(0, 3)).toEqual(['neture', 'op', 'product.operator.restore']);
  expect(audit[1][3].toJSON()).toBe('[redacted]');
  expect(JSON.parse(audit[1][3].toPostgres())).toMatchObject({ offerId: 'offer', isActive: false });
  expect(query.mock.calls.some(([sql]) => sql.includes('is_active=false'))).toBe(true);
});
it('serializes final state and link checks before destructive writes and audit', async () => {
  query.mockImplementation(async sql => sql.includes('FOR UPDATE') ? [{ id: 'offer', approval_status: 'PENDING' }]
    : sql.includes('AS listings') ? [{ listings: 0, products: 0, approvals: 0, carts: 0, order_items: 0, checkout_orders: 0 }] : []);
  expect(await new ProductCleanupOperationsService(db).remove('offer', 'pending', 'admin', 'test cleanup')).toEqual({ deleted: true });
  expect(query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0])).toEqual(['SELECT', 'SELECT', 'DELETE', 'DELETE', 'INSERT']);
  expect(events).toEqual(['commit']);
});
it.each(['listings', 'products', 'order_items', 'checkout_orders', 'carts', 'approvals'])('does not delete an offer with %s links', async key => {
  query.mockImplementation(async sql => sql.includes('FOR UPDATE') ? [{ id: 'offer', approval_status: 'PENDING' }] : [{ [key]: 1 }]);
  await expect(new ProductCleanupOperationsService(db).remove('offer', 'pending', 'admin', 'test')).rejects.toMatchObject({ status: 409 });
  expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
});
it('rejects changed final state before checking links', async () => {
  query.mockResolvedValue([{ approval_status: 'APPROVED' }]);
  await expect(new ProductCleanupOperationsService(db).remove('offer', 'pending', 'admin', 'test')).rejects.toMatchObject({ code: 'NOT_PENDING' });
  expect(query).toHaveBeenCalledTimes(1);
});
it('merges with stable master locks and actual PostgreSQL affected counts', async () => {
  query.mockImplementation(async sql => sql.includes('FOR UPDATE') ? [{ id: 'source' }, { id: 'target' }]
    : sql.startsWith('UPDATE supplier') ? [[{ id: 'o1' }, { id: 'o2' }], 2] : sql.startsWith('UPDATE product_images') ? [[{ id: 'i1' }], 1] : []);
  expect(await new ProductCleanupOperationsService(db).merge('source', 'target', 'admin', 'duplicate')).toEqual({ offersMigrated: 2, imagesMigrated: 1 });
  expect(query.mock.calls[0][0]).toContain('ORDER BY id FOR UPDATE');
  expect(JSON.parse(query.mock.calls.at(-1)![1][3].toPostgres())).toMatchObject({ sourceId: 'source', targetId: 'target', reason: 'duplicate' });
});
it('audit failure rejects the entire merge transaction', async () => {
  query.mockImplementation(async sql => { if (sql.includes('INSERT INTO action_logs')) throw new Error('audit failed'); return sql.includes('FOR UPDATE') ? [{}, {}] : [[], 0]; });
  await expect(new ProductCleanupOperationsService(db).merge('a', 'b', 'admin', 'test')).rejects.toThrow('audit failed');
  expect(events).toEqual(['rollback']);
});
it('pauses only published posts and records their IDs with the forum mutation in one transaction', async () => {
  findOne.mockResolvedValue({ id: 'forum', serviceCode: 'neture', status: 'completed', metadata: {} });
  query.mockImplementation(async sql => sql.startsWith('UPDATE forum_post') ? [[{ id: 'visible-post' }], 1] : []);
  expect(await changeForumAvailability(db, 'forum', 'neture', 'op', false, 'moderation')).toMatchObject({ isActive: false, affectedPosts: 1 });
  expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'forum', serviceCode: 'neture' }, lock: { mode: 'pessimistic_write' } }));
  expect(query.mock.calls[0][0]).toContain("status='publish'");
  const audit = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO action_logs'))!;
  expect(JSON.parse(audit[1][3].toPostgres())).toMatchObject({ pausedPostIds: ['visible-post'], reason: 'moderation' });
});
it('resumes only the last server-audited paused posts and preserves independently archived posts', async () => {
  findOne.mockResolvedValue({ id: 'forum', status: 'archived', metadata: { o4oOperatorPauseId: 'pause' } });
  query.mockImplementation(async sql => sql.startsWith('SELECT meta') ? [{ posts: [{ id: 'paused-post', updatedAt: '2026-01-01 00:00:00' }] }] : sql.startsWith('UPDATE forum_post') ? [[{ id: 'paused-post' }], 1] : []);
  expect(await changeForumAvailability(db, 'forum', 'neture', 'op', true)).toMatchObject({ affectedPosts: 1 });
  expect(query.mock.calls.find(([sql]) => sql.startsWith('UPDATE forum_post'))![1]).toEqual(['forum', JSON.stringify([{ id: 'paused-post', updatedAt: '2026-01-01 00:00:00' }])]);
  expect(query.mock.calls.find(([sql]) => sql.startsWith('UPDATE forum_post'))![0]).toContain("status='archived'");
  expect(query.mock.calls.find(([sql]) => sql.startsWith('UPDATE forum_post'))![0]).toContain('f.updated_at=paused."updatedAt"::timestamp');
});
it.each([{}, { o4oOperatorPauseId: 'expired-or-forged' }])('never guesses recovery for historical or unaudited metadata %p', async metadata => {
  findOne.mockResolvedValue({ id: 'forum', status: 'archived', metadata });
  query.mockResolvedValue([]);
  expect(await changeForumAvailability(db, 'forum', 'neture', 'op', true)).toHaveProperty('warning');
  expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE forum_post'))).toBe(false);
});
it('requires archive and a reason before invoking the forum purge with the transaction manager', async () => {
  findOne.mockResolvedValue({ id: 'forum', status: 'completed' });
  await expect(hardDeleteForum(db, 'forum', 'neture', 'admin', 'test')).rejects.toMatchObject({ status: 409 });
  expect(purgeForumAndDependents).not.toHaveBeenCalled();
  findOne.mockResolvedValue({ id: 'forum', name: 'Fixture', status: 'archived' });
  await hardDeleteForum(db, 'forum', 'neture', 'admin', 'test');
  expect(purgeForumAndDependents).toHaveBeenCalledWith(manager, expect.objectContaining({ id: 'forum' }));
});
it('forum audit failure propagates so no independent commit follows the purge', async () => {
  findOne.mockResolvedValue({ id: 'forum', status: 'archived' });
  query.mockRejectedValue(new Error('audit failed'));
  await expect(hardDeleteForum(db, 'forum', 'neture', 'admin', 'test')).rejects.toThrow('audit failed');
  expect(events).toEqual(['rollback']);
});
function inquiry() { return { id: 'inquiry', subject: 'Fixture', message: 'Body', status: 'resolved', adminNotes: 'note', updatedAt: new Date('2026-01-01'), createdAt: new Date('2026-01-01'), resolvedAt: new Date('2026-01-01'), ipAddress: 'secret', ipHash: 'secret', userAgent: 'secret' } as any; }
it('contact detail whitelists daily fields without security telemetry', () => {
  const detail = contactDetail(inquiry());
  expect(detail).toMatchObject({ message: 'Body', adminNotes: 'note' });
  expect(detail).not.toHaveProperty('ipAddress'); expect(detail).not.toHaveProperty('ipHash'); expect(detail).not.toHaveProperty('userAgent');
});
it('reopening clears resolvedAt and updates with a mandatory transaction audit', async () => {
  findOne.mockResolvedValue(inquiry());
  const result = await updateOperatorContact(db, 'inquiry', 'op', { status: 'in_progress', adminNotes: ' updated ', expectedUpdatedAt: new Date('2026-01-01').toISOString() });
  expect(result).toMatchObject({ status: 'in_progress', adminNotes: 'updated', resolvedAt: null });
  expect(query.mock.calls[0][1].slice(0, 3)).toEqual(['neture', 'op', 'contact.operator.update']);
});
it('preserves the server value when a stale contact draft is submitted', async () => {
  findOne.mockResolvedValue(inquiry());
  await expect(updateOperatorContact(db, 'inquiry', 'op', { status: 'resolved', adminNotes: 'draft', expectedUpdatedAt: 'old' })).rejects.toMatchObject({ status: 409, code: 'CONTACT_CHANGED' });
  expect(save).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled();
});

it('deletes only an archived lecture and records audit in its owning transaction', async () => {
  query.mockImplementation(async sql => sql.includes('FOR UPDATE') ? [{ id: 'course', title: 'Fixture', status: 'archived' }] : []);
  expect(await hardDeleteLectureCourse(db, 'course', 'admin', 'cleanup')).toMatchObject({ deleted: true, title: 'Fixture' });
  expect(query.mock.calls[0][0]).toContain(`"serviceKey"='lecture'`);
  expect(query.mock.calls.at(-1)![1].slice(0, 3)).toEqual(['lecture', 'admin', 'lecture.course.hard_delete']);
});
it.each([[[]], [[{ status: 'published' }]]])('blocks a missing, foreign or active course before deleting learning data (%p)', async rows => {
  query.mockResolvedValue(rows);
  await expect(hardDeleteLectureCourse(db, 'course', 'admin', 'cleanup')).rejects.toHaveProperty('status');
  expect(query).toHaveBeenCalledTimes(1);
});
it('lecture audit failure rejects the whole purge transaction', async () => {
  query.mockImplementation(async sql => { if (sql.includes('INSERT INTO action_logs')) throw new Error('audit failed'); return sql.includes('FOR UPDATE') ? [{ status: 'archived' }] : []; });
  await expect(hardDeleteLectureCourse(db, 'course', 'admin', 'cleanup')).rejects.toThrow('audit failed');
  expect(events).toEqual(['rollback']);
});

it('relationship cleanup protects the selected service operator tier without blocking other-service admin assignments', async () => {
  query.mockResolvedValue([{ role: 'neture:admin' }]);
  await expect(assertOrdinaryServiceMember(manager as any, 'user', ['neture'])).rejects.toMatchObject({ status: 409, code: 'OPERATIONAL_MEMBER_PROTECTED' });
  expect(query.mock.calls[0][1]).toEqual(['user', ['neture:admin', 'neture:operator']]);
  query.mockResolvedValue([]);
  await expect(assertOrdinaryServiceMember(manager as any, 'user', ['kpa-society'])).resolves.toBeUndefined();
  expect(query.mock.calls.at(-1)![1][1]).toEqual(['kpa:admin', 'kpa:operator']);
});
