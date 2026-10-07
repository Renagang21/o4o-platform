/**
 * CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 — 가입 원장 독립성 회귀 계약
 *
 * Neture 메인 가입(`service_memberships` service_key='neture')과 연결 서비스
 * (공급자 `neture_suppliers` · 내 매장(약국) `neture_pharmacy_memberships` · 세미프랜차이즈
 * `semi_franchise_memberships`)는 각자 신청 · 승인한다.
 *
 *   L1 연결 서비스 처리(신청 · 승인 · 반려 · 재활성화)는 Neture 원장을 쓰지 않는다 — 현재 상태를 읽어 전제조건으로만 쓴다.
 *   L2 Neture 승인 · 반려 · 재활성화는 연결 서비스 원장을 쓰지 않고, 연결 서비스 역할을 부여 · 복구하지 않는다.
 *      (행동 계약은 MembershipApprovalService.bareRoleContract / suspensionLifecycleContract 테스트가 고정)
 *   L3 메인 AI 진입점은 서버 guard 로 Neture 가입 승인을 확인한다 — 요청 body(surface · serviceKey)로 우회 불가,
 *      예외는 서버가 확인한 platform:super_admin 뿐, 조회 실패는 fail-closed.
 *   L4 세미프랜차이즈 제공 자료는 항목 단위로 판정한다 — 공통 API 전체를 막지 않는다.
 *
 * DB 접속 없음.
 */
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireNetureMainMembership } from '../middleware/neture-main-membership.middleware.js';
import {
  assertNetureMainMembershipActive,
  getNetureMainMembershipStatus,
  NetureMainMembershipRequiredError,
} from '../modules/neture/services/neture-main-membership.js';

const SRC = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');
const writesTo = (src: string, table: string) =>
  new RegExp(`(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+${table}\\b`, 'i').test(src);

const CONNECTED_SERVICE_FILES = [
  'modules/neture/services/supplier.service.ts',
  'modules/neture-pharmacy/services/pharmacy-membership.service.ts',
  'modules/neture-pharmacy/services/pharmacy-store-provisioner.ts',
  'modules/neture-pharmacy/services/semi-franchise.service.ts',
  'modules/neture-pharmacy/services/semi-franchise-service-access.ts',
];

describe('L1 연결 서비스 처리는 Neture 원장을 바꾸지 않는다', () => {
  it.each(CONNECTED_SERVICE_FILES)('%s — service_memberships write 0', (rel) => {
    expect(writesTo(read(rel), 'service_memberships')).toBe(false);
  });

  it('공급자 신청 · 승인 · 재활성화는 현재 Neture 가입 상태를 전제조건으로 읽는다', () => {
    const src = read('modules/neture/services/supplier.service.ts');
    expect(src).toContain(`return { success: false, error: 'NETURE_MEMBERSHIP_REQUIRED' }`);
    expect(src.match(/APPLICANT_NETURE_MEMBERSHIP_NOT_ACTIVE/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it.each([
    'modules/neture-pharmacy/services/pharmacy-membership.service.ts',
    'modules/neture-pharmacy/services/semi-franchise.service.ts',
  ])('%s — 신청(본인)과 승인(신청자) 모두 Neture 가입 승인을 확인한다', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/assertNetureMainMembershipActive\(m, userId\)/);
    expect(src).toMatch(/assertNetureMainMembershipActive\(m, [\w.]+applicant_user_id, 'applicant'\)/);
  });

  it('판정 helper 는 service_memberships 를 읽기만 한다', async () => {
    const query = jest.fn().mockResolvedValue([{ status: 'pending' }]);
    await expect(getNetureMainMembershipStatus({ query } as any, 'u1')).resolves.toBe('pending');
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0]).trim()).toMatch(/^SELECT/i);
    expect(query.mock.calls[0][1]).toEqual(['u1', 'neture']);
  });

  it.each([
    [[], 'none'],
    [[{ status: 'rejected' }], 'rejected'],
    [[{ status: 'suspended' }], 'suspended'],
    [[{ status: 'weird' }], 'none'],
  ])('rows=%j → %s', async (rows, expected) => {
    const query = jest.fn().mockResolvedValue(rows);
    await expect(getNetureMainMembershipStatus({ query } as any, 'u1')).resolves.toBe(expected);
  });

  it('신청자 기준 판정은 409, 본인 기준은 403', async () => {
    const query = jest.fn().mockResolvedValue([{ status: 'pending' }]);
    const self = await assertNetureMainMembershipActive({ query } as any, 'u1').catch((e) => e);
    const applicant = await assertNetureMainMembershipActive({ query } as any, 'u1', 'applicant').catch((e) => e);
    expect(self).toBeInstanceOf(NetureMainMembershipRequiredError);
    expect(self.httpStatus).toBe(403);
    expect(applicant.httpStatus).toBe(409);
    expect(applicant.membershipStatus).toBe('pending');
  });
});

describe('L2 Neture 승인은 연결 서비스 원장 · 역할을 바꾸지 않는다', () => {
  const src = read('services/approval/MembershipApprovalService.ts');

  it.each(['neture_suppliers', 'neture_pharmacy_memberships', 'semi_franchise_memberships'])(
    'MembershipApprovalService — %s write 0',
    (table) => {
      expect(writesTo(src, table)).toBe(false);
    },
  );

  it('연결 서비스 역할 집합이 공급자 · 내 매장 역할을 모두 포함한다', () => {
    expect(src).toContain(
      `const NETURE_CONNECTED_SERVICE_ROLES = new Set(['supplier', 'neture:supplier', 'store_owner', 'neture:store_owner']);`,
    );
  });
});

describe('L3 메인 AI 진입점 서버 guard', () => {
  it('통합 요청 · 홈 대화 · 작업 에이전트 · 로컬 에이전트 연결에 guard 가 붙어 있다', () => {
    const ai = read('routes/ai-proxy.routes.ts');
    for (const path of ['/request', '/home-chat', '/work-agent/run']) {
      expect(ai).toContain(`router.post('${path}', authenticate, requireNetureMember,`);
    }
    expect(read('routes/local-agent.routes.ts')).toContain(
      `router.post('/pairing-grants', authenticate, requireNetureMainMembership(AppDataSource),`,
    );
  });

  const run = async (opts: { roles?: string[]; rows?: unknown[]; fail?: boolean; body?: unknown; userId?: string | null }) => {
    const query = opts.fail
      ? jest.fn().mockRejectedValue(new Error('db down'))
      : jest.fn().mockResolvedValue(opts.rows ?? []);
    const req: any = {
      user: opts.userId === null ? undefined : { id: opts.userId ?? 'u1', roles: opts.roles ?? [] },
      body: opts.body ?? {},
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const next = jest.fn();
    await requireNetureMainMembership({ query } as any)(req, res, next);
    return { query, res, next };
  };

  it('active → 통과', async () => {
    const { next, res } = await run({ rows: [{ status: 'active' }] });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each(['pending', 'rejected', 'suspended', 'withdrawn'])('%s → 403 NETURE_MEMBERSHIP_REQUIRED', async (status) => {
    const { next, res } = await run({ rows: [{ status }] });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      code: 'NETURE_MEMBERSHIP_REQUIRED',
      details: { netureMembershipStatus: status },
    });
  });

  it('병원약국 화면 · 다른 serviceKey 를 body 로 보내도 우회되지 않는다', async () => {
    const { next, res, query } = await run({ rows: [], body: { surface: 'hospital-drug', serviceKey: 'hospital-pharmacy' } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(query.mock.calls[0][1]).toEqual(['u1', 'neture']);
  });

  it('서버가 확인한 platform:super_admin 만 예외 — DB 조회 없이 통과', async () => {
    const { next, query } = await run({ roles: ['platform:super_admin'] });
    expect(next).toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it.each([['neture:admin'], ['hospital-pharmacy:member'], ['admin']])('%s 는 예외가 아니다', async (role) => {
    const { next } = await run({ roles: [role], rows: [] });
    expect(next).not.toHaveBeenCalled();
  });

  it('조회 실패는 통과가 아니다 (503 fail-closed)', async () => {
    const { next, res } = await run({ fail: true });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('미인증은 401', async () => {
    const { next, res } = await run({ userId: null });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('L4 세미프랜차이즈 제공 자료는 항목 단위로 판정한다', () => {
  const products = read('routes/o4o-store/controllers/pharmacy-products.controller.ts');

  it('PUBLIC 공급은 내 매장 기능 — 미가입이면 PUBLIC 만 남기고 API 자체는 막지 않는다', () => {
    expect(products).toContain(`const PUBLIC_ONLY_SQL = \`AND spo.distribution_type = 'PUBLIC'\`;`);
    // catalog(목록 + count) · approved 에 같은 필터
    expect(products.match(/\$\{semiFranchiseFilter\}/g)?.length).toBe(3);
    expect(products).toContain('${semiFranchiseOrderableFilter}');
  });

  it('SERVICE/PRIVATE 상품 신청은 세미프랜차이즈 가입 승인이 필요하다', () => {
    expect(products).toMatch(
      /offer\.distribution_type !== 'PUBLIC' && !\(await hasMountSemiFranchiseAccess\(organizationId\)\)/,
    );
    expect(products).toContain(`'SEMI_FRANCHISE_MEMBERSHIP_REQUIRED'`);
  });

  it('세미프랜차이즈 키가 없는 마운트(cosmetics 등)는 판정하지 않는다', () => {
    expect(products).toMatch(/if \(!mountSemiFranchiseKey\) return true;/);
  });

  it('취급매장 모집(서비스 제공 자료)은 세미프랜차이즈 미가입이면 빈 목록', () => {
    const browse = read('modules/neture/controllers/store-seller-recruitment-browse.controller.ts');
    expect(browse).toContain('listActiveSemiFranchiseKeys(dataSource, organizationId)');
    expect(browse).toContain(`res.json({ success: true, data: [] });`);
  });
});
