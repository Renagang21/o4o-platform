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
 *   L3 메인 AI 진입점은 서버 guard 로 Neture 가입 승인을 확인한다 — 요청 body(surface · serviceKey)로 Neture 자격 우회 불가,
 *      예외는 서버가 확인한 platform:super_admin 뿐, 조회 실패는 fail-closed.
 *      병원약국은 이 리팩토링 대상이 아니다 — `/request` 의 병원약국 화면 첫 요청은 가입 조회 없이 기존 병원약국 처리로만 가고
 *      (Neture 가입 여부로 병원약국 동작이 달라지지 않는다), 그 밖의 Neture 경로로는 내려가지 않는다.
 *   L4 세미프랜차이즈 제공 자료는 항목 단위로 판정한다 — 공통 API 전체를 막지 않는다.
 *      공급 상품은 distribution_type 무관(공급처 미지정 PUBLIC 포함) 가입 승인 대상 — 목록 · 신청 · 장바구니 확정 ·
 *      취급매장 모집 신청 모두 같은 판정을 쓴다(직접 호출 우회 차단).
 *
 * DB 접속 없음.
 */
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isHospitalSurfaceRequest,
  requireNetureMainMembership,
} from '../middleware/neture-main-membership.middleware.js';
import { hasServiceSemiFranchiseSupplyAccess } from '../modules/neture-pharmacy/services/supply-access.js';
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

  it('세미프랜차이즈 승인은 약국을 만든 사람이 아니라 그 가입의 실제 신청자(applied_by)를 다시 확인한다', () => {
    const src = read('modules/neture-pharmacy/services/semi-franchise.service.ts');
    expect(src).toContain('SELECT sfm.applied_by AS sf_applicant_user_id FROM semi_franchise_memberships sfm');
    expect(src).toContain(`assertNetureMainMembershipActive(m, basic.sf_applicant_user_id, 'applicant')`);
    expect(src).not.toContain('SELECT npm.applicant_user_id FROM semi_franchise_memberships');
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
    for (const path of ['/home-chat', '/work-agent/run']) {
      expect(ai).toContain(`router.post('${path}', authenticate, requireNetureMember,`);
    }
    // 통합 요청은 같은 guard + 병원약국 화면 옵션
    expect(ai).toContain(
      `const requireNetureMemberOrHospitalSurface = requireNetureMainMembership(AppDataSource, { hospitalSurface: true });`,
    );
    expect(ai).toContain(`router.post('/request', authenticate, requireNetureMemberOrHospitalSurface,`);
    // 병원약국 화면 통과 요청은 기존 병원약국 처리 밖(통합 라우터 · 홈 대화 · Task 작업)으로 내려가지 않는다
    const hospitalBranch = ai.indexOf(`if (!runId && body.surface === 'hospital-drug') {`);
    const surfaceOnlyStop = ai.indexOf('if (res.locals.hospitalSurfaceOnly === true) {');
    const unifiedRouter = ai.indexOf('const decision = classifyUnifiedRequest(text, {');
    expect(hospitalBranch).toBeGreaterThan(0);
    expect(surfaceOnlyStop).toBeGreaterThan(hospitalBranch);
    expect(unifiedRouter).toBeGreaterThan(surfaceOnlyStop);
    // 축소된 공개 경로는 쓰지 않는다 — 병원약국 동작은 main 과 같다
    expect(ai).not.toContain('runHospitalAiRequest');
    expect(ai).not.toContain('hospitalPublicScope');
    expect(read('routes/local-agent.routes.ts')).toContain(
      `router.post('/pairing-grants', authenticate, requireNetureMainMembership(AppDataSource),`,
    );
  });

  const run = async (opts: {
    roles?: string[];
    rows?: unknown[];
    fail?: boolean;
    body?: unknown;
    userId?: string | null;
    hospitalSurface?: boolean;
  }) => {
    const query = opts.fail
      ? jest.fn().mockRejectedValue(new Error('db down'))
      : jest.fn().mockResolvedValue(opts.rows ?? []);
    const req: any = {
      user: opts.userId === null ? undefined : { id: opts.userId ?? 'u1', roles: opts.roles ?? [] },
      body: opts.body ?? {},
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), locals: {} };
    const next = jest.fn();
    const options = opts.hospitalSurface ? { hospitalSurface: true } : undefined;
    await requireNetureMainMembership({ query } as any, options)(req, res, next);
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

  describe('병원약국 화면 기존 호출 (`/request` 전용 옵션 — 기존 동작 보존)', () => {
    it.each([[[]], [[{ status: 'pending' }]], [[{ status: 'active' }]]])(
      'Neture 가입 상태와 무관하게(rows=%j) 병원약국 화면 첫 요청은 가입 조회 없이 통과 (locals 표식)',
      async (rows) => {
        const { next, res, query } = await run({ rows, hospitalSurface: true, body: { surface: 'hospital-drug' } });
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.locals.hospitalSurfaceOnly).toBe(true);
        expect(query).not.toHaveBeenCalled();
      },
    );

    it('가입 조회 장애도 병원약국 화면 요청을 막지 않는다 (main 과 같다)', async () => {
      const { next, res } = await run({ fail: true, hospitalSurface: true, body: { surface: 'hospital-drug' } });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('runId(실행 재개)를 붙이면 병원약국 화면 호출이 아니다 → Neture 판정 · 미승인 403', async () => {
      const { next, res } = await run({
        rows: [],
        hospitalSurface: true,
        body: { surface: 'hospital-drug', runId: 'r1' },
      });
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.locals.hospitalSurfaceOnly).toBeUndefined();
    });

    it.each([{}, { surface: 'home' }, { surface: 'hospital' }, { serviceKey: 'hospital-pharmacy' }])(
      '다른 surface %j → Neture 판정 · 미승인 403',
      async (body) => {
        const { next, res } = await run({ rows: [], hospitalSurface: true, body });
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
      },
    );

    it('옵션이 없는 진입점(홈 대화 · 작업 에이전트 · 로컬 연결)은 병원약국 body 로도 403', async () => {
      const { next, res } = await run({ rows: [], body: { surface: 'hospital-drug' } });
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.locals.hospitalSurfaceOnly).toBeUndefined();
    });

    it('isHospitalSurfaceRequest', () => {
      expect(isHospitalSurfaceRequest({ surface: 'hospital-drug' })).toBe(true);
      expect(isHospitalSurfaceRequest({ surface: 'hospital-drug', runId: '' })).toBe(true);
      expect(isHospitalSurfaceRequest({ surface: 'hospital-drug', runId: 'x' })).toBe(false);
      expect(isHospitalSurfaceRequest(undefined)).toBe(false);
    });
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

  it('공급 상품은 공급처 미지정 PUBLIC 포함 모두 가입 승인 대상 — 미가입이면 공급 항목만 빼고 API 자체는 막지 않는다', () => {
    expect(products).toContain('const NO_SUPPLY_SQL = `AND FALSE`;');
    expect(products).not.toContain('PUBLIC_ONLY_SQL');
    // catalog(목록 + count) · approved 에 같은 필터, orderable 도 같은 판정
    expect(products.match(/\$\{semiFranchiseFilter\}/g)?.length).toBe(3);
    expect(products).toContain(
      `const semiFranchiseOrderableFilter = (await hasMountSemiFranchiseAccess(organizationId)) ? '' : NO_SUPPLY_SQL;`,
    );
    expect(products).toContain('${semiFranchiseOrderableFilter}');
  });

  it('상품 신청은 distribution_type 무관 세미프랜차이즈 가입 승인이 필요하다', () => {
    expect(products).toContain('if (!(await hasMountSemiFranchiseAccess(organizationId))) {');
    expect(products).not.toMatch(/distribution_type !== 'PUBLIC' &&/);
    expect(products).toContain(`'SEMI_FRANCHISE_MEMBERSHIP_REQUIRED'`);
  });

  it('판정은 commerce 공급 이용 판정(supply-access)을 재사용한다', () => {
    expect(products).toContain('hasServiceSemiFranchiseSupplyAccess(');
  });

  describe('hasServiceSemiFranchiseSupplyAccess', () => {
    const exec = (keys: string[]) => ({ query: jest.fn().mockResolvedValue(keys.map((key) => ({ key }))) });

    it('세미프랜차이즈 키가 없는 서비스(k-cosmetics 등)는 판정하지 않는다', async () => {
      const e = exec([]);
      await expect(hasServiceSemiFranchiseSupplyAccess(e as any, 'k-cosmetics', 'o1')).resolves.toBe(true);
      await expect(hasServiceSemiFranchiseSupplyAccess(e as any, null, 'o1')).resolves.toBe(true);
      expect(e.query).not.toHaveBeenCalled();
    });

    it('kpa-society → pharmacy 가입 active 일 때만', async () => {
      await expect(hasServiceSemiFranchiseSupplyAccess(exec(['pharmacy']) as any, 'kpa-society', 'o1')).resolves.toBe(true);
      await expect(hasServiceSemiFranchiseSupplyAccess(exec([]) as any, 'kpa-society', 'o1')).resolves.toBe(false);
      await expect(hasServiceSemiFranchiseSupplyAccess(exec(['other']) as any, 'kpa-society', 'o1')).resolves.toBe(false);
    });

    it('조직이 없으면 거부', async () => {
      const e = exec(['pharmacy']);
      await expect(hasServiceSemiFranchiseSupplyAccess(e as any, 'kpa-society', undefined)).resolves.toBe(false);
      expect(e.query).not.toHaveBeenCalled();
    });
  });

  it('장바구니 확정(공용 B2B)도 같은 판정 — 목록 숨김을 직접 confirm 으로 우회할 수 없다', () => {
    const core = read('services/cart/b2b-checkout-confirm.core.ts');
    expect(core).toContain('await this.adapter.assertSupplyAccess?.(this.dataSource, scope, organizationId);');
    const store = read('services/cart/store-b2b-cart-checkout.service.ts');
    expect(store).toMatch(
      /async assertSupplyAccess\(exec, scope, organizationId\) \{\s+if \(!\(await hasServiceSemiFranchiseSupplyAccess\(exec, scope\.serviceKey, organizationId\)\)\)/,
    );
    expect(store).toContain(`'SEMI_FRANCHISE_MEMBERSHIP_REQUIRED'`);
  });

  it('이벤트 장바구니 확정은 서버가 확정한 구매 약국 조직 기준으로 같은 판정을 쓴다 (동작: event-offer-cart-checkout-purchasing-org.test)', () => {
    const ev = read('services/cart/event-offer-cart-checkout.service.ts');
    expect(ev).toMatch(
      /hasServiceSemiFranchiseSupplyAccess\(\s+this\.dataSource,\s+scope\.serviceKey,\s+await this\.resolvePurchasingOrganization\(scope, input, eligible\),/,
    );
    expect(ev).toContain('resolveBuyerOrganization(this.dataSource, scope.buyerId, scope.serviceKey, requested)');
    // 사용자 단위(아무 약국이나 하나) 판정은 쓰지 않는다
    expect(ev).not.toContain('resolveSemiFranchiseServiceAccess');
    expect(ev).toContain(`reason: 'SEMI_FRANCHISE_MEMBERSHIP_REQUIRED'`);
    // 공용 장바구니 화면은 body 에 조직을 싣지 않는다 — 라우트가 화면 선택 매장 헤더를 넘긴다
    expect(read('routes/cart/store-cart.routes.ts')).toContain(
      'preferredOrganizationId: readPreferredStoreOrganizationId(req),',
    );
  });

  it('취급매장 모집(서비스 제공 자료)은 세미프랜차이즈 미가입이면 빈 목록', () => {
    const browse = read('modules/neture/controllers/store-seller-recruitment-browse.controller.ts');
    expect(browse).toContain('listActiveSemiFranchiseKeys(dataSource, organizationId)');
    expect(browse).toContain(`res.json({ success: true, data: [] });`);
  });

  it('취급매장 모집 신청 POST 도 같은 판정 — 직접 호출로 미가입 신청 불가', () => {
    const svc = read('modules/neture/services/seller-recruitment.service.ts');
    expect(svc).toContain('const semiFranchiseKey = semiFranchiseAccessKeyFor(recruitment.serviceId);');
    expect(svc).toContain(
      'if (semiFranchiseKey && !(await resolveSemiFranchiseServiceAccess(AppDataSource, applicantId, semiFranchiseKey)).allowed) {',
    );
    // 판정은 신청 저장보다 먼저
    const createFn = svc.slice(svc.indexOf('async createApplication('));
    expect(createFn.indexOf(`throw new Error('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED')`)).toBeGreaterThan(0);
    expect(createFn.indexOf(`throw new Error('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED')`)).toBeLessThan(
      createFn.indexOf('this.applicationRepo.save('),
    );
    const ctrl = read('modules/neture/controllers/seller-recruitment.controller.ts');
    expect(ctrl).toMatch(/msg === 'SEMI_FRANCHISE_MEMBERSHIP_REQUIRED'\) \{\s+return res\.status\(403\)/);
  });
});
