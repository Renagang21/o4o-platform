/**
 * 매장 영상 ↔ 제품 연결 HTTP — 매장 범위는 guard(requireSignageStore)가 확정한 req.signageContext 만 쓴다.
 * guard 는 X-Organization-Id 헤더를 먼저 보고 권한을 확인하므로, 핸들러가 ?organizationId= 를 다시 읽으면
 * 헤더 = 내 매장 A · query = 남의 매장 B 로 B 의 영상을 읽고 바꿀 수 있다(Codex P1 · PR #1058).
 */
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { createMediaProductLinkHandlers } from '../media-product-link.controller';

const SERVICE = 'kpa-society';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res as Response & { status: jest.Mock; json: jest.Mock };
}

function storeReq(extra: Partial<Request>, guardedOrg: string | undefined, foreignOrg: string): Request {
  return {
    params: { serviceKey: SERVICE },
    headers: { 'x-organization-id': guardedOrg },
    query: { organizationId: foreignOrg },
    body: {},
    signageContext: guardedOrg ? { role: 'store', serviceKey: SERVICE, organizationId: guardedOrg, permissions: [] } : undefined,
    ...extra,
  } as unknown as Request;
}

describe('media product link handlers use the guard-resolved store only', () => {
  const own = randomUUID();
  const foreign = randomUUID();
  const db = { query: jest.fn() };
  const handlers = createMediaProductLinkHandlers(db as any);
  beforeEach(() => db.query.mockReset());

  const allParams = () => db.query.mock.calls.flatMap(([, params]) => (params ?? []) as unknown[]);

  it('list: header A + query B reads only A', async () => {
    db.query.mockResolvedValue([]);
    const res = mockRes();
    await handlers.listStore(storeReq({}, own, foreign), res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    expect(allParams()).toContain(own);
    expect(allParams()).not.toContain(foreign);
  });

  it('link: header A + query B never updates B (clear)', async () => {
    db.query.mockResolvedValue([[{ id: 'x' }], 1]);
    const mediaId = randomUUID();
    const res = mockRes();
    await handlers.linkStore(storeReq({ params: { serviceKey: SERVICE, id: mediaId } as any, body: { listingId: null } }, own, foreign), res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(allParams()).toContain(own);
    expect(allParams()).not.toContain(foreign);
  });

  it('link: a body organizationId cannot redirect the update either', async () => {
    db.query.mockResolvedValue([[{ id: 'x' }], 1]);
    const res = mockRes();
    await handlers.linkStore(storeReq({ params: { serviceKey: SERVICE, id: randomUUID() } as any, body: { listingId: null, organizationId: foreign } }, own, foreign), res, jest.fn());
    expect(allParams()).not.toContain(foreign);
  });

  it('without a guard-resolved store nothing is read or written', async () => {
    const res = mockRes();
    await handlers.listStore(storeReq({}, undefined, foreign), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(db.query).not.toHaveBeenCalled();
  });
});
