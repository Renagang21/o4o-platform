/**
 * WO-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1 — 내 매장(약국) 신청 약국의 내 매장 signage
 *
 * Neture 승인 약국은 kpa-society membership 이 없다. 매장 기본 기능(동영상 · 스케줄 · 플레이리스트 · TV 재생)은
 * 내 매장 API 와 같은 기준 `isStoreOwner(ds, userId, 'kpa', org)` 로 연다.
 *   S1 store 계열 3 게이트: 원장 판정이 요청 org 와 같으면 통과 — 소유 · 귀속 검사는 그대로 거친다
 *   S2 다른 org · 원장 미충족 · 판정 오류 → 403 MEMBERSHIP_NOT_ACTIVE (fail-closed)
 *   S3 매장계약 미동의 → 428 STORE_OWNER_AGREEMENT_REQUIRED (내 매장 API 와 같은 응답)
 *   S4 operator 분기 · community 업로드/삭제 · 다른 서비스는 열리지 않는다
 *   S5 kpa-society 회원은 원장 판정을 거치지 않는다(기존 경로 불변)
 *
 * DB 없음 — membership · 원장 · 서비스 귀속 판정은 mock, organization_members 소유 조회만 stub.
 */

const query = jest.fn();
jest.mock('../database/connection.js', () => ({
  AppDataSource: { isInitialized: true, query: (...a: unknown[]) => query(...a) },
}));
const hasActiveServiceMembership = jest.fn();
jest.mock('../utils/service-membership.js', () => ({
  hasActiveServiceMembership: (...a: unknown[]) => hasActiveServiceMembership(...a),
}));
const isStoreOwner = jest.fn();
jest.mock('../utils/store-owner.utils.js', () => ({
  isStoreOwner: (...a: unknown[]) => isStoreOwner(...a),
}));
const isOrganizationLinkedToService = jest.fn();
jest.mock('../utils/store-organization.resolver.js', () => ({
  ...jest.requireActual('../utils/store-organization.resolver.js'),
  isOrganizationLinkedToService: (...a: unknown[]) => isOrganizationLinkedToService(...a),
}));

import {
  allowSignageStoreRead,
  requireSignageCommunity,
  requireSignageOperatorOrStore,
  requireSignageStore,
} from '../middleware/signage-role.middleware.js';

const ORG = 'org-pharmacy';
const PHARMACY_USER = { id: 'u-pharmacy', roles: ['neture:store_owner'] };
const AGREEMENT = { serviceKey: 'kpa-society', documentType: 'store_owner_agreement', policyDocumentId: 'doc-1', version: 1, title: '계약' };

const makeReq = (serviceKey: string, organizationId?: string, user: unknown = PHARMACY_USER) =>
  ({
    params: { serviceKey },
    headers: organizationId ? { 'x-organization-id': organizationId } : {},
    query: {},
    body: {},
    user,
  }) as any;
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const run = async (mw: any, req: any) => {
  const res = makeRes();
  const next = jest.fn();
  await mw(req, res, next);
  return { req, res, next, status: res.status.mock.calls[0]?.[0], code: res.json.mock.calls[0]?.[0]?.code };
};

const ledgerOwner = (organizationId = ORG) =>
  isStoreOwner.mockResolvedValue({ isOwner: true, organizationId, memberRole: 'owner', pendingAgreement: null });

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue([{ one: 1 }]); // organization_members 소유 row
  hasActiveServiceMembership.mockReset();
  hasActiveServiceMembership.mockResolvedValue(false); // kpa-society membership 없음
  isStoreOwner.mockReset();
  isOrganizationLinkedToService.mockReset();
  isOrganizationLinkedToService.mockResolvedValue(true);
});

describe('S1 원장 약국 + 자기 매장 org → store 계열 통과', () => {
  it.each([
    ['requireSignageStore (media 쓰기 · schedules · playlist 쓰기)', requireSignageStore],
    ['requireSignageOperatorOrStore (media · playlists 읽기)', requireSignageOperatorOrStore],
  ])('%s', async (_name, mw) => {
    ledgerOwner();
    const r = await run(mw, makeReq('kpa-society', ORG));
    expect(r.next).toHaveBeenCalled();
    expect(r.req.signageContext).toMatchObject({ role: 'store', serviceKey: 'kpa-society', organizationId: ORG });
    expect(isStoreOwner).toHaveBeenCalledWith(expect.anything(), 'u-pharmacy', 'kpa', ORG);
    // 소유 · 서비스 귀속 검사는 그대로 거친다
    expect(query).toHaveBeenCalled();
    expect(isOrganizationLinkedToService).toHaveBeenCalledWith(expect.anything(), ORG, 'kpa');
  });

  it('allowSignageStoreRead (TV 재생 active-content) — 명시한 자기 매장 org 의 store 읽기 context', async () => {
    ledgerOwner();
    const r = await run(allowSignageStoreRead, makeReq('kpa-society', ORG));
    expect(r.next).toHaveBeenCalled();
    expect(r.req.signageContext).toEqual({ role: 'store', serviceKey: 'kpa-society', organizationId: ORG, permissions: [`signage:store:${ORG}:read`] });
  });

  it('원장 경로에서도 소유 row 가 없으면 기존 SIGNAGE_STORE_REQUIRED', async () => {
    ledgerOwner();
    query.mockResolvedValue([]);
    const r = await run(requireSignageStore, makeReq('kpa-society', ORG));
    expect([r.status, r.code]).toEqual([403, 'SIGNAGE_STORE_REQUIRED']);
  });
});

describe('S2 차단 (fail-closed)', () => {
  it.each([requireSignageStore, requireSignageOperatorOrStore, allowSignageStoreRead])('다른 org 지정 → 403 MEMBERSHIP_NOT_ACTIVE', async (mw) => {
    ledgerOwner(ORG); // 판정 매장은 ORG — 요청은 다른 org
    const r = await run(mw, makeReq('kpa-society', 'org-other'));
    expect([r.status, r.code]).toEqual([403, 'MEMBERSHIP_NOT_ACTIVE']);
    expect(r.next).not.toHaveBeenCalled();
  });

  it.each([requireSignageStore, requireSignageOperatorOrStore, allowSignageStoreRead])('원장 미충족(정지 · 미승인) → 403', async (mw) => {
    isStoreOwner.mockResolvedValue({ isOwner: false, organizationId: null, memberRole: '', pendingAgreement: null });
    const r = await run(mw, makeReq('kpa-society', ORG));
    expect([r.status, r.code]).toEqual([403, 'MEMBERSHIP_NOT_ACTIVE']);
  });

  it('원장 판정 오류 → 403', async () => {
    isStoreOwner.mockRejectedValue(new Error('db down'));
    const r = await run(requireSignageStore, makeReq('kpa-society', ORG));
    expect([r.status, r.code]).toEqual([403, 'MEMBERSHIP_NOT_ACTIVE']);
  });

  it('org 미지정 → 원장 판정 없이 403 (기존 응답 유지)', async () => {
    const r = await run(requireSignageStore, makeReq('kpa-society'));
    expect([r.status, r.code]).toEqual([403, 'MEMBERSHIP_NOT_ACTIVE']);
    expect(isStoreOwner).not.toHaveBeenCalled();
  });
});

describe('S3 매장계약 미동의', () => {
  it.each([requireSignageStore, requireSignageOperatorOrStore, allowSignageStoreRead])('428 STORE_OWNER_AGREEMENT_REQUIRED + pending 문서', async (mw) => {
    isStoreOwner.mockResolvedValue({ isOwner: false, organizationId: ORG, memberRole: 'owner', pendingAgreement: AGREEMENT });
    const r = await run(mw, makeReq('kpa-society', ORG));
    expect([r.status, r.code]).toEqual([428, 'STORE_OWNER_AGREEMENT_REQUIRED']);
    expect(r.res.json.mock.calls[0][0].pendingPolicyAcceptances).toEqual([AGREEMENT]);
  });
});

describe('S4 열지 않는 경로', () => {
  it('operator role 이 있어도 membership 이 없으면 operator 분기로 가지 않는다(store context 만)', async () => {
    ledgerOwner();
    const r = await run(requireSignageOperatorOrStore, makeReq('kpa-society', ORG, { id: 'u-pharmacy', roles: ['neture:store_owner', 'kpa:operator'] }));
    expect(r.next).toHaveBeenCalled();
    expect(r.req.signageContext.role).toBe('store');
  });

  it('community 업로드 · 삭제는 원장 약국에게 열리지 않는다', async () => {
    ledgerOwner();
    const r = await run(requireSignageCommunity, makeReq('kpa-society', ORG));
    expect(r.status).toBe(403);
    expect(r.next).not.toHaveBeenCalled();
  });

  it('kpa-society 외 서비스(k-cosmetics)는 원장 판정을 하지 않는다', async () => {
    ledgerOwner();
    const r = await run(requireSignageStore, makeReq('k-cosmetics', ORG, { id: 'u1', roles: ['cosmetics:store_owner'] }));
    expect([r.status, r.code]).toEqual([403, 'MEMBERSHIP_NOT_ACTIVE']);
    expect(isStoreOwner).not.toHaveBeenCalled();
  });
});

describe('S5 kpa-society 회원은 기존 경로', () => {
  it('membership active → 원장 판정 0', async () => {
    hasActiveServiceMembership.mockResolvedValue(true);
    const r = await run(requireSignageStore, makeReq('kpa-society', ORG, { id: 'u-kpa', roles: ['kpa:store_owner'] }));
    expect(r.next).toHaveBeenCalled();
    expect(isStoreOwner).not.toHaveBeenCalled();
  });
});
