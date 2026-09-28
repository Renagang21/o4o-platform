/**
 * 서브도메인 운영자 경계 — **실제 가드 판정** (역할 × 서비스 membership)
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — 배포 2 전 경계 보정.
 * 같은 폴더의 `subdomain-operator-scope.test.ts` 는 배선(어느 경로가 어느 가드를 쓰는가)을 소스로 고정한다.
 * 이 파일은 그 가드들이 **요청을 실제로 통과/거부하는지**를 운영 DB 없이 고정한다
 * (DataSource 미초기화 = JWT 스냅샷 판정 구간 — 가드 코드가 명시한 단위 테스트 동작).
 *
 *   supplier:admin + supplier membership 만   → 공급자 운영 경로 O · 펀딩 · 커뮤니티 · Neture 운영 X
 *   funding:admin  + funding membership 만    → 펀딩 운영 경로 O · 공급자 · 커뮤니티 · Neture 운영 X
 *   community:admin + community membership 만 → 커뮤니티 개설 심사 O · 나머지 X
 *   neture:admin/operator + neture membership → Neture 운영 O · 세 서브도메인 X
 *   역할 O · 그 서비스 membership X          → X (다른 서비스 membership 으로 대신 못 함)
 *   platform:super_admin                      → 전부 O (platformBypass)
 */
import type { RequestHandler } from 'express';
import { requireSupplierScope } from '../supplier-service-scope.middleware.js';
import { requireFundingScope } from '../funding-service-scope.middleware.js';
import { requireCommunityServiceScope } from '../community-service-scope.middleware.js';
import { requireNetureScope } from '../neture-scope.middleware.js';

type Persona = { roles: string[]; memberships: Array<[string, string]> };

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

async function passes(handler: RequestHandler, p: Persona): Promise<boolean> {
  const req: any = {
    user: {
      id: 'u-test',
      roles: p.roles,
      memberships: p.memberships.map(([serviceKey, status]) => ({ serviceKey, status })),
    },
    headers: {},
    params: {},
    query: {},
    method: 'GET',
    path: '/test',
    originalUrl: '/test',
    get: () => undefined,
  };
  const res = makeRes();
  let nextCalled = false;
  await handler(req, res, (err?: unknown) => {
    if (!err) nextCalled = true;
  });
  return nextCalled && res.statusCode < 400;
}

const ROUTES: Record<string, RequestHandler> = {
  supplierAdmin: requireSupplierScope('supplier:admin') as RequestHandler, // /neture/admin/suppliers* 9경로
  fundingOperator: requireFundingScope('funding:operator') as RequestHandler, // /neture/operator/market-trial/*
  communityAdmin: requireCommunityServiceScope('community:admin') as RequestHandler, // /communities/requests*
  netureAdmin: requireNetureScope('neture:admin') as RequestHandler,
  netureOperator: requireNetureScope('neture:operator') as RequestHandler,
};

async function matrix(p: Persona): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  for (const [name, handler] of Object.entries(ROUTES)) out[name] = await passes(handler, p);
  return out;
}

const NONE = { supplierAdmin: false, fundingOperator: false, communityAdmin: false, netureAdmin: false, netureOperator: false };

describe('서브도메인 운영자 경계 — 가드 실제 판정', () => {
  it('supplier:admin + supplier membership 만 → 공급자 운영 경로만', async () => {
    expect(await matrix({ roles: ['supplier:admin'], memberships: [['supplier', 'active']] })).toEqual({ ...NONE, supplierAdmin: true });
  });

  it('funding:admin + funding membership 만 → 펀딩 운영 경로만 (admin ⊃ operator)', async () => {
    expect(await matrix({ roles: ['funding:admin'], memberships: [['funding', 'active']] })).toEqual({ ...NONE, fundingOperator: true });
  });

  it('community:admin + community membership 만 → 커뮤니티 개설 심사만', async () => {
    expect(await matrix({ roles: ['community:admin'], memberships: [['community', 'active']] })).toEqual({ ...NONE, communityAdmin: true });
  });

  it('Neture 관리자·운영자 역할만 → Neture 운영만 · 세 서브도메인 영역 X', async () => {
    expect(
      await matrix({ roles: ['neture:admin', 'neture:operator'], memberships: [['neture', 'active']] }),
    ).toEqual({ ...NONE, netureAdmin: true, netureOperator: true });
  });

  it('supplier:operator 는 supplier:admin 경로에 못 들어간다', async () => {
    expect(await passes(ROUTES.supplierAdmin, { roles: ['supplier:operator'], memberships: [['supplier', 'active']] })).toBe(false);
  });

  it('역할이 있어도 그 서비스 membership 이 없거나 active 가 아니면 거부', async () => {
    expect(await passes(ROUTES.supplierAdmin, { roles: ['supplier:admin'], memberships: [] })).toBe(false);
    expect(await passes(ROUTES.fundingOperator, { roles: ['funding:admin'], memberships: [['funding', 'suspended']] })).toBe(false);
    // 다른 서비스 membership 으로 대신할 수 없다
    expect(await passes(ROUTES.supplierAdmin, { roles: ['supplier:admin'], memberships: [['neture', 'active'], ['funding', 'active']] })).toBe(false);
  });

  it('네 역할을 함께 가진 계정(renagang21 계획) → 각 영역 통과 · 역할 없는 영역은 여전히 경계대로', async () => {
    const planned: Persona = {
      roles: ['community:admin', 'kpa-branch:admin', 'supplier:admin', 'funding:admin', 'neture:admin', 'neture:operator'],
      memberships: [['community', 'active'], ['supplier', 'active'], ['funding', 'active'], ['neture', 'active'], ['kpa-branch', 'active']],
    };
    expect(await matrix(planned)).toEqual({
      supplierAdmin: true,
      fundingOperator: true,
      communityAdmin: true,
      netureAdmin: true,
      netureOperator: true,
    });
  });

  it('platform:super_admin → 서브도메인 세 영역 통과 (platformBypass)', async () => {
    const m = await matrix({ roles: ['platform:super_admin'], memberships: [] });
    expect([m.supplierAdmin, m.fundingOperator, m.communityAdmin]).toEqual([true, true, true]);
  });
});
