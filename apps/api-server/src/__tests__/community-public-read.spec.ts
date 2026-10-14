import express from 'express';
import { getMetadataArgsStorage } from 'typeorm';
import { ForumPost } from '../../../../packages/forum-core/src/backend/entities/ForumPost';
import request from 'supertest';
import { resolveCommunityWorkspace } from '../services/community/community-workspace.service.js';
import { createCommunityPublicReadRoutes } from '../routes/community-public-read.routes.js';
import { parsePublicReadInput, setCommunityPublicRead } from '../services/community/community-public-read.service.js';
import { PUBLIC_READ_KEY, withoutPublicReadDesignation, signPublicReadDesignation, hasAuthenticPublicReadDesignation, mergeForumMetadataPatch } from '../services/community/community-public-read-metadata.js';

jest.mock('../services/community/community-workspace.service.js', () => ({ resolveCommunityWorkspace: jest.fn() }));
jest.mock('../database/connection.js', () => ({ AppDataSource: {
  query: (...args: unknown[]) => String(args[0]).includes('AS "designation"') ? candidateQuery(...args) : query(...args), transaction: (run: (m: unknown) => unknown) => run({ query }),
} }));
jest.mock('../middleware/rateLimiter.js', () => ({ apiLimiter: (_req: unknown, _res: unknown, next: () => void) => next() }));
const query = jest.fn();
const candidateQuery = jest.fn();
const fixtureSecret = 'fixture-only-public-read-signing-key';
const previousSecret = process.env.JWT_SECRET;
const boardId = '11111111-1111-4111-8111-111111111111';
const postId = '22222222-2222-4222-8222-222222222222';
const actor = { id: 'fixture-operator' };
const active = { communityKey: 'fixture', name: '공개 테스트', kind: 'independent', communityStatus: 'active',
  forumStorageCodes: ['community:fixture'], allowed: true, canManage: true };
const authenticate: express.RequestHandler = (req, res, next) => req.headers['x-fixture-operator'] ? next() : void res.sendStatus(401);
const app = express().use(express.json()).use('/communities', createCommunityPublicReadRoutes(authenticate, async () => actor));

const designation = { mode: 'board' as const, postIds: [], designatedBy: actor.id, designatedAt: '2026-10-11T00:00:00.000Z' };
beforeEach(() => {
  process.env.JWT_SECRET = fixtureSecret;
  query.mockReset(); candidateQuery.mockReset().mockResolvedValue([{ id: boardId, designation: signPublicReadDesignation('fixture', boardId, designation, fixtureSecret) }]);
  (resolveCommunityWorkspace as jest.Mock).mockReset().mockResolvedValue(active);
});
afterAll(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });

describe('explicit public content read boundary', () => {
  it('guest list and direct detail share the private/draft/closed/org/service boundary and exclude identity/metadata', async () => {
    query.mockResolvedValue([{ id: postId, slug: 'public-fixture', title: '공개 글', content: [], authorId: 'private', author: { email: 'fixture@example.test' }, metadata: { secret: 'private' } }]);
    const list = await request(app).get('/communities/fixture/public/posts');
    expect(list.status).toBe(200);
    expect(list.headers['cache-control']).toBe('no-store');
    expect(list.body.data.items[0]).toEqual({ id: postId, slug: 'public-fixture', title: '공개 글' });
    const detail = await request(app).get(`/communities/fixture/public/posts/${postId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.post).toEqual({ id: postId, slug: 'public-fixture', title: '공개 글', content: [] });
    for (const [sql, params] of query.mock.calls) {
      const columns = new Set(getMetadataArgsStorage().columns.filter(c => c.target === ForumPost).map(c => c.options.name ?? c.propertyName));
      for (const match of sql.matchAll(/\bp\.(?:"([^"]+)"|(\w+))/g)) {
        expect(columns.has(match[1] ?? match[2])).toBe(true);
      }
      expect(sql).toContain('p.created_at AS "createdAt"');
      expect(sql).toContain("b.forum_type = 'open'");
      expect(sql).toContain("b.status = 'completed'");
      expect(sql).toContain("p.status = 'publish'");
      expect(sql).toContain('p.organization_id IS NULL');
      expect(sql).toContain('p.is_organization_exclusive = false');
      expect(sql).toContain(PUBLIC_READ_KEY);
      expect(sql).toContain("= 'selected'");
      expect(sql).toContain('? p.id::text');
      expect(params[0]).toEqual(active.forumStorageCodes);
      expect(params[1]).toEqual([boardId]);
    }
    expect(resolveCommunityWorkspace).toHaveBeenCalledWith(expect.anything(), null, 'fixture');
  });

  it.each([null, { ...active, communityStatus: 'suspended' }, { ...active, kind: 'semi-franchise' }, { ...active, forumStorageCodes: [] }])('unknown, inactive or business scopes never reach content query (%j)', async value => {
    (resolveCommunityWorkspace as jest.Mock).mockResolvedValue(value);
    expect((await request(app).get('/communities/fixture/public/posts')).status).toBe(404);
    expect(query).not.toHaveBeenCalled();
  });

  it('a private/withdrawn designation returns the same not-found detail by UUID or slug', async () => {
    query.mockResolvedValue([]);
    for (const id of [postId, 'private-slug']) {
      expect((await request(app).get(`/communities/fixture/public/posts/${id}`)).status).toBe(404);
    }
  });

  it('bounds pagination and rejects malformed queries without content access', async () => {
    for (const page of ['0', '-1', '1x', '10001']) expect((await request(app).get(`/communities/fixture/public/posts?page=${page}`)).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('returns a next page signal without returning more than twenty posts', async () => {
    query.mockResolvedValue(Array.from({ length: 21 }, (_, n) => ({ id: `${n}`, title: '샘플' })));
    const r = await request(app).get('/communities/fixture/public/posts?page=2');
    expect(r.body.data.items).toHaveLength(20); expect(r.body.data.hasNext).toBe(true);
    expect(query.mock.calls[0][1][2]).toBe(20);
  });

  it('guest reads expose no write/comments/members routes; management requires authentication', async () => {
    expect((await request(app).post('/communities/fixture/public/posts')).status).toBe(404);
    expect((await request(app).get(`/communities/fixture/public/posts/${postId}/comments`)).status).toBe(404);
    expect((await request(app).get('/communities/fixture/public-read-settings')).status).toBe(401);
    expect((await request(app).put(`/communities/fixture/boards/${boardId}/public-read`).send({ mode: 'board' })).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('operator designation preserves member boundaries', () => {
  it('an ordinary member cannot manage public scope', async () => {
    (resolveCommunityWorkspace as jest.Mock).mockResolvedValue({ ...active, canManage: false });
    const r = await request(app).put(`/communities/fixture/boards/${boardId}/public-read`).set('x-fixture-operator', 'true').send({ mode: 'board' });
    expect(r.status).toBe(403); expect(query).not.toHaveBeenCalled();
  });
  it('closed and foreign boards cannot be publicly designated', async () => {
    query.mockResolvedValueOnce([{ id: boardId, forumType: 'closed' }]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'board' })).rejects.toMatchObject({ code: 'CLOSED_BOARD_PRIVATE' });
    expect(query).toHaveBeenCalledTimes(1);
    query.mockReset().mockResolvedValueOnce([]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'board' })).rejects.toMatchObject({ status: 404 });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('rejects unpublished, organization or cross-board selected IDs before changing metadata', async () => {
    query.mockResolvedValueOnce([{ id: boardId, forumType: 'open' }]).mockResolvedValueOnce([]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'selected', postIds: [postId] })).rejects.toMatchObject({ code: 'INVALID_PUBLIC_POST_IDS' });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('forum_id = $2::uuid');
    expect(query.mock.calls[1][0]).toContain("status = 'publish'");
  });
  it('locks the scoped board and modifies only reserved metadata; private mode clears selection', async () => {
    query.mockResolvedValueOnce([{ id: boardId, forumType: 'open' }]).mockResolvedValueOnce([{ id: postId }]).mockResolvedValueOnce([]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'selected', postIds: [postId, postId] })).resolves.toEqual({ mode: 'selected', postIds: [postId] });
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[0][1]).toEqual([boardId, active.forumStorageCodes]);
    expect(query.mock.calls[2][0]).toContain('jsonb_set(COALESCE(metadata');
    expect(JSON.parse(query.mock.calls[2][1][1])).toMatchObject({ mode: 'selected', postIds: [postId], designatedBy: actor.id });
    expect(hasAuthenticPublicReadDesignation('fixture', boardId, JSON.parse(query.mock.calls[2][1][1]), fixtureSecret)).toBe(true);
    query.mockReset().mockResolvedValueOnce([{ id: boardId, forumType: 'closed' }]).mockResolvedValueOnce([]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'private' })).resolves.toEqual({ mode: 'private', postIds: [] });
  });
  it('applicant metadata cannot forge a designation and valid extension metadata is preserved', () => {
    const metadata = { icon: '샘플', [PUBLIC_READ_KEY]: { mode: 'board' } };
    expect(withoutPublicReadDesignation(metadata)).toEqual({ icon: '샘플' });
    expect(metadata[PUBLIC_READ_KEY]).toEqual({ mode: 'board' });
  });
  it.each([{ mode: ['private'] }, { mode: 'unknown' }, { mode: 'selected', postIds: ['bad'] }, { mode: 'board', postIds: [postId] }])('rejects malformed selection %j', input => {
    expect(() => parsePublicReadInput(input)).toThrow();
  });
});

it('operator post chooser uses the physical date column and keeps the response alias', async () => {
  query.mockResolvedValue([]);
  await request(app).get('/communities/fixture/public-read-settings').set('x-fixture-operator', 'yes').expect(200);
  const sql = query.mock.calls.find(([s]) => s.includes('FROM forum_post'))![0];
  const columns = new Set(getMetadataArgsStorage().columns.filter(c => c.target === ForumPost).map(c => c.options.name ?? c.propertyName));
  for (const match of sql.matchAll(/\bp\.(?:"([^"]+)"|(\w+))/g)) expect(columns.has(match[1] ?? match[2])).toBe(true);
  expect(sql).toContain('p.created_at AS "createdAt"');
  expect(sql).toContain('JOIN LATERAL');
  expect(sql).toContain('WHERE forum_id = b.id');
  expect(sql).toContain('ORDER BY created_at DESC, id LIMIT 100');
  expect(sql).toContain("b.forum_type = 'open'");
  expect(sql).not.toContain('LIMIT 1000');
});

describe('operator provenance of stored public settings', () => {
  it.each([{ ...designation }, { ...designation, mode: { toString: 'invalid' }, proofVersion: 'operator-v1', proof: '0'.repeat(64) }, { ...designation, proofVersion: 'operator-v1', proof: '0'.repeat(64) }])('historical applicant-controlled setting never reaches post queries: %j', async setting => {
    candidateQuery.mockResolvedValue([{ id: boardId, designation: setting }]);
    const list = await request(app).get('/communities/fixture/public/posts').expect(200);
    expect(list.body.data.items).toEqual([]);
    await request(app).get(`/communities/fixture/public/posts/${postId}`).expect(404);
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects copied scope and tampering with mode, IDs or actor', async () => {
    const signed = signPublicReadDesignation('fixture', boardId, designation, fixtureSecret);
    expect(hasAuthenticPublicReadDesignation('other', boardId, signed, fixtureSecret)).toBe(false);
    expect(hasAuthenticPublicReadDesignation('fixture', postId, signed, fixtureSecret)).toBe(false);
    for (const changes of [{ mode: 'selected', postIds: [postId] }, { designatedBy: 'other' }, { designatedAt: '2027-01-01' }]) {
      expect(hasAuthenticPublicReadDesignation('fixture', boardId, { ...signed, ...changes }, fixtureSecret)).toBe(false);
    }
    expect(hasAuthenticPublicReadDesignation('fixture', boardId, signed, 'different-fixture-key')).toBe(false);
  });
  it('fails closed without signing material and permits revocation without it', async () => {
    delete process.env.JWT_SECRET;
    expect((await request(app).get('/communities/fixture/public/posts')).body.data.items).toEqual([]);
    expect(query).not.toHaveBeenCalled();
    query.mockResolvedValueOnce([{ id: boardId, forumType: 'open' }]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'board' })).rejects.toMatchObject({ status: 503 });
    expect(query).toHaveBeenCalledTimes(1);
    query.mockReset().mockResolvedValueOnce([{ id: boardId, forumType: 'open' }]).mockResolvedValueOnce([]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'private' })).resolves.toEqual({ mode: 'private', postIds: [] });
  });
  it('operator settings show unsigned historical values as private', async () => {
    query.mockResolvedValueOnce([{ id: boardId, name: '샘플', forumType: 'open', publicRead: designation }]).mockResolvedValueOnce([]);
    const result = await request(app).get('/communities/fixture/public-read-settings').set('x-fixture-operator', 'yes').expect(200);
    expect(result.body.data.boards[0].publicRead).toEqual({ mode: 'private', postIds: [] });
  });
});


describe('ordinary forum lifecycle metadata updates', () => {
  it('merges only a parameterized patch with current metadata and drops a replayed public proof', async () => {
    const oldPublic = signPublicReadDesignation('fixture', boardId, designation, fixtureSecret);
    await mergeForumMetadataPatch({ query }, boardId, 'community:fixture', {
      deleteRequestStatus: 'pending', [PUBLIC_READ_KEY]: oldPublic,
    });
    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain("COALESCE(metadata, '{}'::jsonb) || $3::jsonb");
    expect(sql).toContain('WHERE id = $1::uuid AND service_code = $2');
    expect(sql).not.toContain('status =');
    expect(values).toEqual([boardId, 'community:fixture', JSON.stringify({ deleteRequestStatus: 'pending' })]);
    expect(oldPublic.mode).toBe('board');
  });
  it.each(['archived', 'completed'] as const)('changes status only on the explicit lifecycle transition %s', async status => {
    await mergeForumMetadataPatch({ query }, boardId, 'community:fixture', { reviewedBy: actor.id }, status);
    expect(query.mock.calls[0][0]).toContain('status = $4');
    expect(query.mock.calls[0][1]).toEqual([boardId, 'community:fixture', JSON.stringify({ reviewedBy: actor.id }), status]);
  });
});


describe('withdrawal with stale retained selected posts', () => {
  const other = '33333333-3333-4333-8333-333333333333';
  const added = '44444444-4444-4444-8444-444444444444';
  const current = signPublicReadDesignation('fixture', boardId, { ...designation, mode: 'selected', postIds: [postId, other] }, fixtureSecret);
  it('withdraws one public ID even if the retained ID is now deleted/draft/archived; private read predicates still apply', async () => {
    query.mockResolvedValueOnce([{ id: boardId, forumType: 'open', publicRead: current }]).mockResolvedValueOnce([]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'selected', postIds: [other] }))
      .resolves.toEqual({ mode: 'selected', postIds: [other] });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('UPDATE forum_category_requests');
    const stored = JSON.parse(query.mock.calls[1][1][1]);
    expect(stored.postIds).not.toContain(postId);
    expect(hasAuthenticPublicReadDesignation('fixture', boardId, stored, fixtureSecret)).toBe(true);
  });
  it('rejects an invalid newly added ID even alongside retained valid proof IDs', async () => {
    query.mockResolvedValueOnce([{ id: boardId, forumType: 'open', publicRead: current }]).mockResolvedValueOnce([]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'selected', postIds: [other, added] }))
      .rejects.toMatchObject({ code: 'INVALID_PUBLIC_POST_IDS' });
    expect(query.mock.calls[1][1]).toEqual([[added], boardId]);
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('unsigned historical IDs cannot bypass validation as retained selections', async () => {
    query.mockResolvedValueOnce([{ id: boardId, forumType: 'open', publicRead: { mode: 'selected', postIds: [other] } }]).mockResolvedValueOnce([]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'selected', postIds: [other] }))
      .rejects.toMatchObject({ code: 'INVALID_PUBLIC_POST_IDS' });
    expect(query.mock.calls[1][1]).toEqual([[other], boardId]);
  });
});
