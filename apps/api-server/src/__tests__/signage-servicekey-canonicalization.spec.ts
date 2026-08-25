/**
 * WO-O4O-KCOS-SIGNAGE-SERVICEKEY-CANONICALIZATION-V1
 *
 * Signage API 의 `:serviceKey` 는 canonical service key
 * ('kpa-society' · 'k-cosmetics' · 'glycopharm' · 'neture') 를 정본으로 한다.
 * 역할 prefix alias('kpa' · 'cosmetics')는 `@o4o/security-core` canonical SSOT 를
 * 통해 **하나의 내부 key 로 수렴**한다 (둘 다 무조건 허용하는 것이 아니다).
 *
 * 결함: K-Cosmetics 프론트가 보내는 'k-cosmetics' 가 validateServiceKey 허용목록에
 *       없어 400 INVALID_SERVICE_KEY 로 거부됐다 (프로덕션 재현).
 *
 * DB 는 붙이지 않는다 — AppDataSource.query 를 stub 으로 대체한다.
 */

jest.mock('../database/connection.js', () => ({
  AppDataSource: { query: jest.fn() },
}));

import { AppDataSource } from '../database/connection.js';
import {
  validateServiceKey,
  canonicalizeSignageServiceKey,
  getSignageServiceKey,
  toStoreOwnerServiceKey,
  hasSignageOperatorPermission,
  hasSignageCommunityPermission,
  requireSignageStore,
  requireSignageOperator,
} from '../middleware/signage-role.middleware.js';
import { extractScope } from '../routes/signage/controllers/signage-helpers.js';

const q = AppDataSource.query as unknown as jest.Mock;

type Row = Record<string, unknown>;
const OWNED: Row[] = [{ one: 1 }];
const LINKED: Row[] = [{ one: 1 }];

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

const makeReq = (serviceKey?: string, organizationId?: string, user?: any) =>
  ({
    params: serviceKey === undefined ? {} : { serviceKey },
    headers: organizationId ? { 'x-organization-id': organizationId } : {},
    query: {},
    body: {},
    user: user === undefined ? { id: 'u1', roles: ['cosmetics:store_owner'] } : user,
  }) as any;

describe('canonicalizeSignageServiceKey — security-core SSOT 만 사용', () => {
  it('역할 prefix alias 는 canonical service key 로 수렴한다', () => {
    expect(canonicalizeSignageServiceKey('cosmetics')).toBe('k-cosmetics');
    expect(canonicalizeSignageServiceKey('kpa')).toBe('kpa-society');
  });

  it('canonical key 는 그대로 유지된다 (self-map)', () => {
    expect(canonicalizeSignageServiceKey('k-cosmetics')).toBe('k-cosmetics');
    expect(canonicalizeSignageServiceKey('kpa-society')).toBe('kpa-society');
    expect(canonicalizeSignageServiceKey('glycopharm')).toBe('glycopharm');
    expect(canonicalizeSignageServiceKey('neture')).toBe('neture');
    expect(canonicalizeSignageServiceKey('pharmacy')).toBe('pharmacy');
  });

  it('빈 값은 빈 문자열', () => {
    expect(canonicalizeSignageServiceKey(undefined)).toBe('');
    expect(canonicalizeSignageServiceKey('')).toBe('');
  });

  it('getSignageServiceKey 는 요청 param 을 canonical 로 돌려준다', () => {
    expect(getSignageServiceKey(makeReq('cosmetics'))).toBe('k-cosmetics');
    expect(getSignageServiceKey(makeReq('k-cosmetics'))).toBe('k-cosmetics');
    expect(getSignageServiceKey(makeReq())).toBe('');
  });
});

describe('validateServiceKey — canonical 허용 + alias 수렴', () => {
  const run = (serviceKey?: string) => {
    const req = makeReq(serviceKey);
    const res = makeRes();
    const next = jest.fn();
    validateServiceKey(req, res, next);
    return { req, res, next };
  };

  it("K-Cosmetics canonical key 'k-cosmetics' 통과 (본 WO 결함)", () => {
    const { res, next } = run('k-cosmetics');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('KPA / GlycoPharm / Neture canonical key 회귀 없음', () => {
    for (const sk of ['kpa-society', 'glycopharm', 'neture']) {
      const { res, next } = run(sk);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it('역할 prefix alias 도 canonical 로 수렴해 통과한다', () => {
    for (const sk of ['cosmetics', 'kpa']) {
      const { res, next } = run(sk);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it('범위 밖 legacy key(pharmacy/tourism/common/test)는 기존 동작 유지', () => {
    for (const sk of ['pharmacy', 'tourism', 'common', 'test']) {
      const { res, next } = run(sk);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it('미등록 serviceKey 는 계속 400 INVALID_SERVICE_KEY', () => {
    for (const sk of ['bogus-key', 'k-cosmetics-x', 'admin']) {
      const { res, next } = run(sk);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].code).toBe('INVALID_SERVICE_KEY');
    }
  });

  it('400 메시지는 클라이언트가 보낸 원본 key 를 그대로 보여준다', () => {
    const { res } = run('bogus-key');
    expect(res.json.mock.calls[0][0].message).toContain('bogus-key');
  });

  it('serviceKey 없음 → 400 SERVICE_KEY_REQUIRED (기존 계약 유지)', () => {
    const { res, next } = run(undefined);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].code).toBe('SERVICE_KEY_REQUIRED');
  });
});

describe('canonical key → 역할 스코프 / 귀속 축 변환', () => {
  it('role scope: k-cosmetics 는 cosmetics: 역할로 판정된다', () => {
    const operator = { id: 'op', roles: ['cosmetics:operator'] };
    expect(hasSignageOperatorPermission(operator, 'k-cosmetics')).toBe(true);
    expect(hasSignageOperatorPermission(operator, 'cosmetics')).toBe(true);
  });

  it('role scope: kpa-society 는 kpa: 역할로 판정된다 (회귀 없음)', () => {
    expect(hasSignageOperatorPermission({ id: 'op', roles: ['kpa:operator'] }, 'kpa-society')).toBe(true);
    expect(hasSignageOperatorPermission({ id: 'op', roles: ['glycopharm:admin'] }, 'glycopharm')).toBe(true);
  });

  it('타 서비스 역할로는 통과하지 못한다', () => {
    expect(hasSignageOperatorPermission({ id: 'op', roles: ['kpa:operator'] }, 'k-cosmetics')).toBe(false);
    expect(hasSignageOperatorPermission({ id: 'op', roles: ['cosmetics:operator'] }, 'kpa-society')).toBe(false);
  });

  it('community 판정도 canonical → 역할 prefix 변환을 쓴다', () => {
    expect(hasSignageCommunityPermission({ id: 'u', roles: ['cosmetics:member'] }, 'k-cosmetics')).toBe(true);
    expect(hasSignageCommunityPermission({ id: 'u', roles: ['kpa:member'] }, 'kpa-society')).toBe(true);
    expect(hasSignageCommunityPermission({ id: 'u', roles: ['kpa:member'] }, 'k-cosmetics')).toBe(false);
  });

  it('귀속 축: k-cosmetics → cosmetics linkage (k-cosmetics enrollment 인식)', () => {
    expect(toStoreOwnerServiceKey('k-cosmetics')).toBe('cosmetics');
    expect(toStoreOwnerServiceKey('cosmetics')).toBe('cosmetics');
    expect(toStoreOwnerServiceKey('kpa-society')).toBe('kpa');
  });

  it('데이터 scope: extractScope 는 canonical serviceKey 를 반환한다', () => {
    expect(extractScope(makeReq('cosmetics', 'org-kcos')).serviceKey).toBe('k-cosmetics');
    expect(extractScope(makeReq('k-cosmetics', 'org-kcos')).serviceKey).toBe('k-cosmetics');
    expect(extractScope(makeReq('kpa-society', 'org-kpa')).serviceKey).toBe('kpa-society');
  });
});

describe('cross-service 권한 회귀 (§8) — canonical key 로도 그대로 유지', () => {
  it('KCos 매장주 + 자기 KCos org → 통과', async () => {
    queueResponses([OWNED, LINKED]);
    const req = makeReq('k-cosmetics', 'org-kcos');
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.signageContext.serviceKey).toBe('k-cosmetics');
  });

  it('소유하지 않은 org → 403 SIGNAGE_STORE_REQUIRED', async () => {
    queueResponses([[]]);
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(makeReq('k-cosmetics', 'org-other'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('SIGNAGE_STORE_REQUIRED');
  });

  it('소유하지만 KPA-only / GP-only org → 403 (귀속 검사 유지)', async () => {
    for (const org of ['org-kpa-only', 'org-gp-only']) {
      queueResponses([OWNED, []]);
      const res = makeRes();
      const next = jest.fn();
      await requireSignageStore(makeReq('k-cosmetics', org), res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('alias(cosmetics) 로 들어와도 같은 판정 + context 는 canonical', async () => {
    queueResponses([OWNED, LINKED]);
    const req = makeReq('cosmetics', 'org-kcos');
    const res = makeRes();
    const next = jest.fn();
    await requireSignageStore(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.signageContext.serviceKey).toBe('k-cosmetics');
  });

  // WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1:
  //   signage 게이트가 membership 을 DB 로 확인하면서 async 가 되었다. 판정 계약은 그대로이고
  //   호출을 await 로 맞춘다 (DataSource 미초기화 구간에서는 membership 검사를 건너뛴다).
  it('operator 계약 회귀 없음 — KCos operator 는 canonical key 로 통과', async () => {
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperator(makeReq('k-cosmetics', undefined, { id: 'op', roles: ['cosmetics:operator'] }), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('operator 아님 → 403 SIGNAGE_OPERATOR_REQUIRED', async () => {
    const res = makeRes();
    const next = jest.fn();
    await requireSignageOperator(makeReq('k-cosmetics', undefined, { id: 'u', roles: ['kpa:operator'] }), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('SIGNAGE_OPERATOR_REQUIRED');
  });
});
