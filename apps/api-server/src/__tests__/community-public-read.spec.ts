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
const app = express().use(express.json()).use('/communities', createCommunityPublicReadRoutes());

const designation = { mode: 'board' as const, postIds: [], designatedBy: actor.id, designatedAt: '2026-10-11T00:00:00.000Z' };
beforeEach(() => {
  process.env.JWT_SECRET = fixtureSecret;
  query.mockReset(); candidateQuery.mockReset().mockResolvedValue([{ id: boardId, designation: signPublicReadDesignation('fixture', boardId, designation, fixtureSecret) }]);
  (resolveCommunityWorkspace as jest.Mock).mockReset().mockResolvedValue(active);
});
afterAll(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });


// 2026-11-14 통합 담당 결정: O4O 는 로그인한 회원만 이용한다 — 비로그인 공개 열람과 공개 지정은 은퇴(410).
// 아래 서비스 단위 검사(지정 값 서명 · 검증)는 저장된 지정 값과 홈 서비스가 여전히 읽으므로 유지한다.
describe('guest public reading is retired', () => {
  it.each([
    ['get', '/communities/fixture/public/posts'],
    ['get', `/communities/fixture/public/posts/${postId}`],
    ['get', '/communities/fixture/public-read-settings'],
    ['put', `/communities/fixture/boards/${boardId}/public-read`],
  ] as const)('%s %s answers 410 and reads nothing', async (method, path) => {
    const r = await request(app)[method](path).send({ mode: 'board' });
    expect(r.status).toBe(410); expect(r.body.code).toBe('COMMUNITY_PUBLIC_READ_RETIRED');
    expect(query).not.toHaveBeenCalled(); expect(candidateQuery).not.toHaveBeenCalled();
    expect(resolveCommunityWorkspace).not.toHaveBeenCalled();
  });
});

describe('operator designation preserves member boundaries', () => {
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


describe('operator provenance of stored public settings', () => {
  it('rejects copied scope and tampering with mode, IDs or actor', async () => {
    const signed = signPublicReadDesignation('fixture', boardId, designation, fixtureSecret);
    expect(hasAuthenticPublicReadDesignation('other', boardId, signed, fixtureSecret)).toBe(false);
    expect(hasAuthenticPublicReadDesignation('fixture', postId, signed, fixtureSecret)).toBe(false);
    for (const changes of [{ mode: 'selected', postIds: [postId] }, { designatedBy: 'other' }, { designatedAt: '2027-01-01' }]) {
      expect(hasAuthenticPublicReadDesignation('fixture', boardId, { ...signed, ...changes }, fixtureSecret)).toBe(false);
    }
    expect(hasAuthenticPublicReadDesignation('fixture', boardId, signed, 'different-fixture-key')).toBe(false);
  });
  it('fails closed without signing material and permits revocation without it (service)', async () => {
    delete process.env.JWT_SECRET;
    query.mockResolvedValueOnce([{ id: boardId, forumType: 'open' }]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'board' })).rejects.toMatchObject({ status: 503 });
    expect(query).toHaveBeenCalledTimes(1);
    query.mockReset().mockResolvedValueOnce([{ id: boardId, forumType: 'open' }]).mockResolvedValueOnce([]);
    await expect(setCommunityPublicRead({ query }, 'fixture', actor, boardId, { mode: 'private' })).resolves.toEqual({ mode: 'private', postIds: [] });
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
