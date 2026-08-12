/**
 * WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1
 *
 * 공통 운영자 콘솔(`PUT /operator/members/:userId`)의 `users."businessInfo"` write 를 고정한다.
 *
 * 회귀 대상:
 *   W-1  read → 병합 → **전체 재저장**. SELECT 와 UPDATE 사이에 다른 경로가 저장한 키가
 *        이번 요청이 손대지 않았는데도 스냅샷 값으로 덮였다.
 *   W-2  `storeAddress` 를 **통째로 새로 만들어** 넣었다. 상세주소만 수정해도
 *        `baseAddress` 가 '' 로 덮이고 `zipCode` 키가 사라졌다.
 *
 * 판정 계약:
 *   - businessInfo write 는 컬럼 현재값을 참조하는 **부분 갱신 표현식**이다.
 *   - 파라미터에는 이번 요청이 명시한 키만 담긴다 (스냅샷 되쓰기 없음).
 *   - 중첩 `storeAddress` 는 보낸 하위 키만 갱신한다.
 *   - scalar 컬럼과 businessInfo 는 **단일 UPDATE statement** 로 나간다 (원자성).
 */

const mockQuery = jest.fn();

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: false,
    query: (...args: any[]) => mockQuery(...args),
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../services/approval/MembershipApprovalService.js', () => ({
  MembershipApprovalService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { removeRole: jest.fn(), assignRole: jest.fn() },
}));

jest.mock('../../../modules/auth/services/role.service.js', () => ({ roleService: {} }));

jest.mock('../../../utils/auth.utils.js', () => ({
  hashPassword: jest.fn(async (pw: string) => `hashed:${pw}`),
  comparePassword: jest.fn(async () => true),
}));

import { MembershipConsoleController } from '../MembershipConsoleController.js';

const TARGET = '11111111-2222-4333-8444-555555555555';
const CALLER = '99999999-8888-4777-8666-555555555555';

/** 다른 경로가 저장해 둔, 이번 요청이 모르는 키들 */
const SENTINEL = {
  sentinelRoot: 'KEEP-ME',
  metadata: { pharmacy_phone: '02-000-0001', workplace: 'KEEP-META' },
  storeAddress: { zipCode: '01000', baseAddress: 'KEEP-BASE', detailAddress: 'KEEP-DETAIL' },
};

function primeQuery() {
  mockQuery.mockImplementation((sql: string) => {
    const s = String(sql).replace(/\s+/g, ' ').trim();
    if (/^SELECT 1 FROM service_memberships/i.test(s)) return Promise.resolve([{ ok: 1 }]);
    if (/^SELECT "businessInfo" FROM users/i.test(s)) return Promise.resolve([{ businessInfo: SENTINEL }]);
    return Promise.resolve([]);
  });
}

function makeReq(body: Record<string, any>) {
  return {
    params: { userId: TARGET },
    body,
    user: { id: CALLER, roles: ['glycopharm:operator'] },
    serviceScope: { isPlatformAdmin: false, serviceKeys: ['glycopharm'], rolePrefixes: [] },
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const userUpdates = () =>
  mockQuery.mock.calls
    .map(([sql, params]) => ({ sql: String(sql).replace(/\s+/g, ' ').trim(), params: params ?? [] }))
    .filter((c) => /^UPDATE users SET/i.test(c.sql));

/** UPDATE 문에서 businessInfo 로 나간 JSON 파라미터들 */
function bizPayloads(call: { sql: string; params: any[] }): Record<string, any>[] {
  return call.params
    .filter((p) => typeof p === 'string' && p.startsWith('{'))
    .map((p) => JSON.parse(p as string));
}

describe('updateMember — businessInfo 부분 갱신', () => {
  let controller: MembershipConsoleController;

  beforeEach(() => {
    jest.clearAllMocks();
    primeQuery();
    controller = new MembershipConsoleController();
  });

  it('W-1 회귀: 스냅샷을 되쓰지 않는다 — SELECT 후 전체 재저장이 사라졌다', async () => {
    await controller.updateMember(makeReq({ address1: 'NEW-ADDR' }), makeRes());

    // 병합용 사전 SELECT 자체가 없어졌다
    const selects = mockQuery.mock.calls
      .map(([sql]) => String(sql).replace(/\s+/g, ' ').trim())
      .filter((s) => /^SELECT "businessInfo" FROM users/i.test(s));
    expect(selects).toEqual([]);

    const [update] = userUpdates();
    expect(update.sql).toContain('"businessInfo"::jsonb');
    // 이번 요청이 명시한 키만 파라미터로 나간다
    for (const payload of bizPayloads(update)) {
      expect(payload).not.toHaveProperty('sentinelRoot');
      expect(payload).not.toHaveProperty('businessNumber');
    }
  });

  it('W-2 회귀: 상세주소만 수정해도 storeAddress 형제 키를 덮지 않는다', async () => {
    await controller.updateMember(makeReq({ address2: 'NEW-DETAIL' }), makeRes());

    const [update] = userUpdates();
    const payloads = bizPayloads(update);

    // storeAddress 는 중첩 부분 갱신 — 보낸 하위 키만 나간다
    expect(update.sql).toContain("'{storeAddress}'");
    const storeAddressPatch = payloads.find((p) => 'detailAddress' in p || 'baseAddress' in p || 'zipCode' in p);
    expect(storeAddressPatch).toEqual({ detailAddress: 'NEW-DETAIL' });
    // 이전 구현이 만들던 baseAddress:'' 전체 교체가 사라졌다
    expect(storeAddressPatch).not.toHaveProperty('baseAddress');
    expect(storeAddressPatch).not.toHaveProperty('zipCode');
  });

  it('보낸 하위 키만 정확히 담는다 (우편번호+기본주소만 수정)', async () => {
    await controller.updateMember(makeReq({ zipCode: '02000', address1: 'NEW-BASE' }), makeRes());

    const payloads = bizPayloads(userUpdates()[0]);
    const storeAddressPatch = payloads.find((p) => 'baseAddress' in p);
    expect(storeAddressPatch).toEqual({ zipCode: '02000', baseAddress: 'NEW-BASE' });
  });

  it('상세주소 지우기는 계속 동작한다 (빈 문자열이 그대로 저장된다)', async () => {
    await controller.updateMember(makeReq({ address2: '' }), makeRes());

    const payloads = bizPayloads(userUpdates()[0]);
    expect(payloads.find((p) => 'detailAddress' in p)).toEqual({ detailAddress: '' });
    expect(payloads.find((p) => 'address2' in p)).toMatchObject({ address2: '' });
  });

  it('주소 payload 가 없으면 storeAddress 를 건드리지 않는다', async () => {
    await controller.updateMember(makeReq({ businessName: 'NEW-NAME' }), makeRes());

    const [update] = userUpdates();
    expect(update.sql).not.toContain("'{storeAddress}'");
    expect(bizPayloads(update)).toEqual([{ businessName: 'NEW-NAME' }]);
  });

  it('scalar 컬럼과 businessInfo 는 단일 UPDATE statement 로 나간다 (부분 성공 없음)', async () => {
    await controller.updateMember(makeReq({ nickname: '길동', address1: 'NEW-ADDR' }), makeRes());

    const updates = userUpdates();
    expect(updates).toHaveLength(1);
    expect(updates[0].sql).toContain('nickname = $1');
    expect(updates[0].sql).toContain('"businessInfo" =');
  });

  it('businessInfo 수정 대상이 없으면 businessInfo 를 SET 하지 않는다', async () => {
    await controller.updateMember(makeReq({ nickname: '길동' }), makeRes());

    const [update] = userUpdates();
    expect(update.sql).not.toContain('"businessInfo"');
  });

  it('legacy alias 는 기존대로 canonical 키로만 저장한다 (회귀)', async () => {
    await controller.updateMember(
      makeReq({ representativeName: '대표', taxEmail: 'tax@example.com' }),
      makeRes(),
    );

    const payloads = bizPayloads(userUpdates()[0]);
    expect(payloads[0]).toEqual({ ceoName: '대표', taxInvoiceEmail: 'tax@example.com' });
  });
});
