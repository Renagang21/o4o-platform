/**
 * WO-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1
 *
 * 외부 판매 채널(네이버·쿠팡 등) 반출 게이트의 보안 회귀 테스트.
 *
 * 고정하는 계약:
 *   1. 판정 기준은 `product_masters.regulatory_type` **하나뿐** — 상품명 등 텍스트 휴리스틱 금지
 *   2. 의약품은 예외 없이 차단 (서비스·매장·역할 분기 없음)
 *   3. `regulatory_type` 결측·미존재·조회 실패는 **보수적 차단** (fail-closed)
 *   4. 등록 · 동기화 **양 경로** 모두 같은 기준으로 막힌다
 */

import {
  assertExternalSalesEligible,
  assertExternalSalesEligibleById,
  assertExternalSalesEligibleOrThrow,
  ExternalSalesBlockedError,
  ExternalSalesErrorCode,
  type ExternalSalesExecutor,
} from '../../modules/external-sales/guards/external-sales-eligibility.guard.js';

// ── 픽스처 ──────────────────────────────────────────────────────────────────
const MASTER_DRUG = '11111111-1111-4111-8111-111111111111';
const MASTER_DRUG_KO = '11111111-1111-4111-8111-111111111112';
const MASTER_HFF = '22222222-2222-4222-8222-222222222222';
const MASTER_QUASI = '22222222-2222-4222-8222-222222222223';
const MASTER_NULL_TYPE = '22222222-2222-4222-8222-222222222225';
const MASTER_MISSING = '99999999-9999-4999-8999-999999999999';

const ROWS: Record<string, { regulatory_type: string | null; name: string | null }> = {
  [MASTER_DRUG]: { regulatory_type: 'DRUG', name: '타이레놀정500mg' },
  [MASTER_DRUG_KO]: { regulatory_type: '의약품', name: '게보린정' },
  [MASTER_HFF]: { regulatory_type: '건강기능식품', name: '비타민D 1000IU' },
  [MASTER_QUASI]: { regulatory_type: 'QUASI_DRUG', name: '마데카솔연고' },
  [MASTER_NULL_TYPE]: { regulatory_type: null, name: '유형 미상 상품' },
};

/** regulatory_type 을 실제 DB 처럼 반환하는 stub executor */
const executor: ExternalSalesExecutor = {
  query: jest.fn(async (_sql: string, params: any[] = []) => {
    const row = ROWS[params[0]];
    return row ? [row] : [];
  }),
} as unknown as ExternalSalesExecutor;

/** 조회 자체가 실패하는 executor (fail-closed 검증용) */
const failingExecutor: ExternalSalesExecutor = {
  query: jest.fn(async () => {
    throw new Error('connection lost');
  }),
} as unknown as ExternalSalesExecutor;

// ── 1. 의약품 차단 ──────────────────────────────────────────────────────────
describe('assertExternalSalesEligible — 의약품 차단', () => {
  it.each([
    ['DRUG', '대문자 표기'],
    ['의약품', '한글 표기 (운영 데이터에 실재)'],
    ['drug', '소문자 표기'],
    ['  DRUG  ', '앞뒤 공백 포함'],
  ])('regulatory_type=%s (%s) 는 차단된다', (regulatoryType) => {
    const result = assertExternalSalesEligible({ regulatoryType });
    expect(result.allowed).toBe(false);
    expect(result.isDrug).toBe(true);
    expect(result.code).toBe(ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN);
  });

  it('상품명이 비의약품처럼 보여도 regulatory_type 이 DRUG 면 차단된다', () => {
    const result = assertExternalSalesEligible({
      name: '비타민C 정성분 건강보조',
      regulatoryType: 'DRUG',
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe(ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN);
  });
});

// ── 2. 비의약품 통과 ────────────────────────────────────────────────────────
describe('assertExternalSalesEligible — 비의약품 통과', () => {
  it.each([
    ['HEALTH_FUNCTIONAL', '건강기능식품(영문)'],
    ['건강기능식품', '건강기능식품(한글)'],
    ['QUASI_DRUG', '의약외품 — 의약품이 아니다'],
    ['MEDICAL_DEVICE', '의료기기'],
    ['COSMETIC', '화장품'],
    ['GENERAL', '일반'],
    ['일반', '일반(한글)'],
  ])('regulatory_type=%s (%s) 는 통과한다', (regulatoryType) => {
    const result = assertExternalSalesEligible({ regulatoryType });
    expect(result.allowed).toBe(true);
    expect(result.isDrug).toBe(false);
    expect(result.code).toBeUndefined();
  });

  it('상품명이 의약품처럼 보여도 regulatory_type 이 비의약품이면 통과한다', () => {
    const result = assertExternalSalesEligible({
      name: '타이레놀 비슷한 이름의 건강기능식품',
      regulatoryType: '건강기능식품',
    });
    expect(result.allowed).toBe(true);
  });
});

// ── 3. 결측 = 보수적 차단 ───────────────────────────────────────────────────
describe('assertExternalSalesEligible — regulatory_type 결측은 보수적 차단', () => {
  it.each([
    [null, 'null'],
    [undefined, 'undefined'],
    ['', '빈 문자열'],
    ['   ', '공백만'],
  ])('regulatory_type=%p (%s) 는 UNRESOLVED 로 차단된다', (regulatoryType) => {
    const result = assertExternalSalesEligible({
      regulatoryType: regulatoryType as string | null | undefined,
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe(ExternalSalesErrorCode.EXTERNAL_SALES_PRODUCT_UNRESOLVED);
    // 의약품으로 확정된 것은 아니다 — 확정 불가일 뿐
    expect(result.isDrug).toBe(false);
  });

  it('빈 객체도 차단된다', () => {
    expect(assertExternalSalesEligible({}).allowed).toBe(false);
  });
});

// ── 4. DB 조회 경로 ─────────────────────────────────────────────────────────
describe('assertExternalSalesEligibleById — 서버가 직접 읽은 값으로 판정', () => {
  it('의약품 master 는 차단된다', async () => {
    const result = await assertExternalSalesEligibleById(executor, MASTER_DRUG);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe(ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN);
  });

  it('한글 표기 의약품 master 도 차단된다', async () => {
    const result = await assertExternalSalesEligibleById(executor, MASTER_DRUG_KO);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe(ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN);
  });

  it('건강기능식품 master 는 통과한다', async () => {
    const result = await assertExternalSalesEligibleById(executor, MASTER_HFF);
    expect(result.allowed).toBe(true);
  });

  it('의약외품 master 는 통과한다', async () => {
    const result = await assertExternalSalesEligibleById(executor, MASTER_QUASI);
    expect(result.allowed).toBe(true);
  });

  it.each([
    [MASTER_NULL_TYPE, 'regulatory_type 이 NULL'],
    [MASTER_MISSING, 'master 미존재'],
    ['not-a-uuid', 'UUID 형식 아님'],
    ['', '빈 문자열'],
    [null, 'null'],
  ])('%s (%s) 는 UNRESOLVED 로 차단된다', async (masterId) => {
    const result = await assertExternalSalesEligibleById(executor, masterId as string | null);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe(ExternalSalesErrorCode.EXTERNAL_SALES_PRODUCT_UNRESOLVED);
  });

  it('조회 자체가 실패하면 차단된다 (fail-closed)', async () => {
    const result = await assertExternalSalesEligibleById(failingExecutor, MASTER_HFF);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe(ExternalSalesErrorCode.EXTERNAL_SALES_PRODUCT_UNRESOLVED);
  });
});

// ── 5. 등록 · 동기화 양 경로 ────────────────────────────────────────────────
describe('assertExternalSalesEligibleOrThrow — 등록과 동기화 양쪽에 같은 기준', () => {
  it.each([
    ['EXTERNAL_PRODUCT_REGISTER' as const, '최초 등록'],
    ['EXTERNAL_PRODUCT_SYNC' as const, '이후 동기화'],
  ])('%s (%s) 경로에서 의약품은 throw 된다', async (action) => {
    await expect(
      assertExternalSalesEligibleOrThrow(executor, MASTER_DRUG, action),
    ).rejects.toBeInstanceOf(ExternalSalesBlockedError);

    // 어느 경로에서 막혔는지 감사 가능해야 한다
    await assertExternalSalesEligibleOrThrow(executor, MASTER_DRUG, action).catch(
      (err: ExternalSalesBlockedError) => {
        expect(err.code).toBe(ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN);
        expect(err.action).toBe(action);
        expect(err.status).toBe(403);
      },
    );
  });

  it.each([
    ['EXTERNAL_PRODUCT_REGISTER' as const],
    ['EXTERNAL_PRODUCT_SYNC' as const],
  ])('%s 경로에서 비의약품은 통과한다', async (action) => {
    await expect(
      assertExternalSalesEligibleOrThrow(executor, MASTER_HFF, action),
    ).resolves.toBeUndefined();
  });

  it('동기화 경로도 결측 master 를 막는다 (등록만 막으면 사후 변경으로 샌다)', async () => {
    await expect(
      assertExternalSalesEligibleOrThrow(
        executor,
        MASTER_NULL_TYPE,
        'EXTERNAL_PRODUCT_SYNC',
      ),
    ).rejects.toMatchObject({
      code: ExternalSalesErrorCode.EXTERNAL_SALES_PRODUCT_UNRESOLVED,
    });
  });
});
