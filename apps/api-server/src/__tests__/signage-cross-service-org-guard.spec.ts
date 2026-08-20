/**
 * WO-O4O-SIGNAGE-CROSS-SERVICE-ORGANIZATION-SCOPE-GUARD-V1
 *
 * 공용 Signage store 가드가 URL 의 `:serviceKey` 와 organization 의 실제 서비스 귀속을
 * 대조하는지 검증한다.
 *
 * 결함: 소유(organization_members)만 보고 서비스 귀속을 보지 않아
 *       KPA signage 요청에 K-Cosmetics / GlycoPharm / Neture 매장 org id 가 통과했다.
 *
 * DB 는 붙이지 않는다 — AppDataSource.query 를 stub 으로 대체한다.
 */

import {
  isOrganizationLinkedToService,
  STORE_SERVICE_ORG_LINKAGE,
} from '../utils/store-organization.resolver.js';

jest.mock('../database/connection.js', () => ({
  AppDataSource: { query: jest.fn() },
}));

import { AppDataSource } from '../database/connection.js';
import {
  requireSignageStore,
  requireSignageOperatorOrStore,
  toStoreOwnerServiceKey,
} from '../middleware/signage-role.middleware.js';

const q = AppDataSource.query as unknown as jest.Mock;

type Row = Record<string, unknown>;

/** query 호출을 순서대로 큐에서 꺼내 응답한다. */
function queueResponses(responses: Row[][]) {
  const queue = [...responses];
  q.mockReset();
  q.mockImplementation(async () => queue.shift() ?? []);
}

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const makeReq = (serviceKey: string, organizationId?: string, user?: any) =>
  ({
    params: { serviceKey },
    headers: organizationId ? { 'x-organization-id': organizationId } : {},
    query: {},
    body: {},
    user: user === undefined ? { id: 'u1', roles: ['kpa:store_owner'] } : user,
  }) as any;

const OWNED: Row[] = [{ one: 1 }];
const LINKED: Row[] = [{ one: 1 }];

describe('toStoreOwnerServiceKey — canonical SSOT 만 사용', () => {
  it('kpa-society → kpa, cosmetics → cosmetics, glycopharm → glycopharm', () => {
    expect(toStoreOwnerServiceKey('kpa-society')).toBe('kpa');
    expect(toStoreOwnerServiceKey('cosmetics')).toBe('cosmetics');
    expect(toStoreOwnerServiceKey('glycopharm')).toBe('glycopharm');
  });

  it('귀속 SSOT 가 없는 serviceKey 는 null (추정 차단 금지)', () => {
    expect(toStoreOwnerServiceKey('pharmacy')).toBeNull();
    expect(toStoreOwnerServiceKey('tourism')).toBeNull();
    expect(toStoreOwnerServiceKey('common')).toBeNull();
    expect(toStoreOwnerServiceKey('neture')).toBeNull();
    expect(toStoreOwnerServiceKey(undefined)).toBeNull();
  });
});

describe('isOrganizationLinkedToService — 기존 2계약만 사용', () => {
  it('enrollment / store slug 두 소스를 그대로 조회한다 (새 mapping 없음)', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const ds = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        calls.push({ sql, params });
        return LINKED;
      }),
    } as any;
    await expect(isOrganizationLinkedToService(ds, 'org-1', 'kpa')).resolves.toBe(true);
    expect(calls[0].sql).toContain('organization_service_enrollments');
    expect(calls[0].sql).toContain('platform_store_slugs');
    expect(calls[0].params[0]).toBe('org-1');
    expect(calls[0].params[1]).toEqual(STORE_SERVICE_ORG_LINKAGE.kpa.enrollmentCodes);
    expect(calls[0].params[2]).toEqual(STORE_SERVICE_ORG_LINKAGE.kpa.slugKeys);
  });

  it('귀속 기록 0건 → false', async () => {
    const ds = { query: jest.fn(async () => []) } as any;
    await expect(isOrganizationLinkedToService(ds, 'org-1', 'cosmetics')).resolves.toBe(false);
  });
});

describe('requireSignageStore — 권한 회귀 매트릭스', () => {
  it('A. KPA 매장주 + 자기 KPA org → 통과', async () => {
    queueResponses([OWNED, LINKED]);
    const req = makeReq('kpa-society', 'org-kpa');
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.signageContext.organizationId).toBe('org-kpa');
  });

  it('B. 소유하지 않은 KPA org → 403 (기존 계약 유지)', async () => {
    queueResponses([[]]);
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(makeReq('kpa-society', 'org-other'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('SIGNAGE_STORE_REQUIRED');
    expect(next).not.toHaveBeenCalled();
  });

  it('D/E/F. 소유하지만 타 서비스 매장 org → 403 (본 WO 결함)', async () => {
    for (const sk of ['kpa-society', 'cosmetics', 'glycopharm']) {
      queueResponses([OWNED, []]); // 소유 O / 귀속 X
      const res = makeRes();
      const next = jest.fn();
      await requireSignageStore(makeReq(sk, 'org-foreign'), res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json.mock.calls[0][0].code).toBe('SIGNAGE_STORE_REQUIRED');
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('다중 서비스 조직(합법)은 각 서비스에서 모두 통과한다', async () => {
    for (const sk of ['kpa-society', 'cosmetics']) {
      queueResponses([OWNED, LINKED]);
      const res = makeRes();
      const next = jest.fn();
      await requireSignageStore(makeReq(sk, 'org-multi'), res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('귀속 SSOT 없는 serviceKey(pharmacy) → 기존 동작 유지 (소유만으로 통과)', async () => {
    queueResponses([OWNED]);
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(makeReq('pharmacy', 'org-x'), res, next);
    expect(next).toHaveBeenCalled();
    expect(q).toHaveBeenCalledTimes(1); // 귀속 조회를 하지 않는다
  });

  it('platform super_admin 은 귀속 검사 없이 통과 (기존 우회 유지)', async () => {
    queueResponses([]);
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(
      makeReq('kpa-society', 'org-any', { id: 'admin', roles: ['platform:super_admin'] }),
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
    expect(q).not.toHaveBeenCalled();
  });

  it('G. organization 헤더 없음 → 400 (기존 계약 유지)', async () => {
    queueResponses([]);
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(makeReq('kpa-society'), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].code).toBe('ORGANIZATION_ID_REQUIRED');
  });

  it('H. 미인증 → 401 (기존 계약 유지)', async () => {
    queueResponses([]);
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(makeReq('kpa-society', 'org-kpa', null), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('귀속 조회 DB 오류 → fail-closed 403', async () => {
    q.mockReset();
    q.mockImplementationOnce(async () => OWNED).mockImplementationOnce(async () => {
      throw new Error('db down');
    });
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(makeReq('kpa-society', 'org-kpa'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireSignageOperatorOrStore — store branch 만 동일 검사', () => {
  it('타 서비스 org → 403 SIGNAGE_ACCESS_DENIED', async () => {
    queueResponses([OWNED, []]);
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperatorOrStore(makeReq('kpa-society', 'org-foreign'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('SIGNAGE_ACCESS_DENIED');
  });

  it('자기 서비스 org → 통과', async () => {
    queueResponses([OWNED, LINKED]);
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperatorOrStore(makeReq('kpa-society', 'org-kpa'), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('§11 operator 계약 불변 — operator 는 organization 없이도 통과하고 귀속 조회를 하지 않는다', async () => {
    queueResponses([]);
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperatorOrStore(
      makeReq('kpa-society', undefined, { id: 'op', roles: ['kpa:operator'] }),
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
    expect(q).not.toHaveBeenCalled();
  });
});
