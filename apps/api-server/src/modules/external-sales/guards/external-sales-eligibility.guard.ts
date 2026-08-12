/**
 * External Sales Eligibility Guard — WO-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1
 *
 * O4O 상품을 **외부 판매 채널(네이버 스마트스토어 · 쿠팡 등)** 에 내보낼 수 있는지 판정하는
 * 공통 게이트. 모든 외부 채널 adapter 의 **앞단**에 위치하며, 채널이 늘어나도 이 지점 하나만
 * 통과하도록 유지한다 (쿠팡이 재사용할 지점).
 *
 * 판정 기준은 **`product_masters.regulatory_type` 하나뿐**이다 — 상품이 의약품인가 아닌가만 본다.
 *   - serviceKey · organizationId · role · 매장별 예외를 **입력받지 않는다**
 *     (입력이 없으면 서비스별로 분기할 표면도, 우회할 표면도 없다).
 *   - 의약품 판정은 재정의하지 않고 `drug-access.guard` 의 `isDrugRegulatoryType()` 을 그대로 쓴다.
 *     의약품 판정 SSOT 는 저장소 전체에서 그 함수 하나다.
 *
 * 기존 의약품 가드와의 관계 (세 축은 목적이 다르다):
 *   - `drug-access.guard`   = **유입** 축 — 약국 대상 서비스면 허용
 *   - `drug-commerce.guard` = **O4O 내부 거래** 축 — 장바구니·주문을 예외 없이 거부
 *   - 본 가드              = **외부 채널 반출** 축 — 외부 마켓 등록·동기화를 예외 없이 거부
 *
 * fail-closed 계약:
 *   - `regulatory_type` 이 없거나 빈 문자열이면 **거부** (비의약품임을 증명하지 못했다)
 *   - masterId 가 UUID 형식이 아니면 거부
 *   - ProductMaster 가 존재하지 않으면 거부
 *   - 조회 자체가 실패하면 거부
 *
 * 적용 지점은 **두 곳 모두**여야 한다. 등록만 막으면 등록 후 상품 유형 변경·재동기화로 샌다.
 *   ① 최초 등록 (`EXTERNAL_PRODUCT_REGISTER`)
 *   ② 이후 동기화 (`EXTERNAL_PRODUCT_SYNC`)
 *
 * 의약품 판매를 외부 채널이 별도 자격으로 허용하더라도 본 가드는 완화하지 않는다 (WO §5).
 */

import type { DataSource, QueryRunner } from 'typeorm';
import { isDrugRegulatoryType } from '../../neture/guards/drug-access.guard.js';

/** DataSource / QueryRunner / EntityManager 어디서든 실행 가능 */
export type ExternalSalesExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

/** 가드가 감시하는 행위 — 등록과 동기화 양쪽에 적용한다 */
export type ExternalSalesAction =
  /** 외부 채널 최초 상품 등록 */
  | 'EXTERNAL_PRODUCT_REGISTER'
  /** 등록 이후 가격·재고·내용 동기화 */
  | 'EXTERNAL_PRODUCT_SYNC';

/** 거부 사유 코드 — 응답/로그에 그대로 쓰는 감사 가능 코드 */
export enum ExternalSalesErrorCode {
  /** 의약품을 외부 채널로 내보내려 함 (예외 없음) */
  EXTERNAL_SALES_DRUG_FORBIDDEN = 'EXTERNAL_SALES_DRUG_FORBIDDEN',
  /** 상품 유형을 확정할 수 없음 — 미존재 / UUID 오류 / regulatory_type 결측 / 조회 실패 */
  EXTERNAL_SALES_PRODUCT_UNRESOLVED = 'EXTERNAL_SALES_PRODUCT_UNRESOLVED',
}

/** 사용자 노출 메시지 (한국어) */
export const EXTERNAL_SALES_MESSAGES: Record<ExternalSalesErrorCode, string> = {
  [ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN]:
    '의약품은 외부 판매 채널에 등록하거나 판매할 수 없습니다.',
  [ExternalSalesErrorCode.EXTERNAL_SALES_PRODUCT_UNRESOLVED]:
    '상품의 규제 유형을 확인할 수 없어 외부 판매 채널 작업을 진행할 수 없습니다.',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 판정 입력 — ProductMaster-like.
 *
 * `regulatoryType` 만 판정에 쓴다. 나머지 필드는 로그/보고용이며 판정에 관여하지 않는다.
 */
export interface ExternalSalesProduct {
  /** 로그/보고용 상품 식별자 */
  masterId?: string | null;
  /** 로그/보고용 상품명. 판정에 쓰지 않는다 (텍스트 휴리스틱 금지). */
  name?: string | null;
  /** 판정 기준 — 이 값 하나로만 판단한다 */
  regulatoryType?: string | null;
}

export interface ExternalSalesResult {
  allowed: boolean;
  code?: ExternalSalesErrorCode;
  message?: string;
  /** 대상이 의약품으로 확정됐는지 (unresolved 는 false) */
  isDrug: boolean;
}

/** throw 계약이 필요한 호출부용 오류 */
export class ExternalSalesBlockedError extends Error {
  readonly code: ExternalSalesErrorCode;
  readonly status = 403;
  readonly action: ExternalSalesAction;

  constructor(result: ExternalSalesResult, action: ExternalSalesAction) {
    super(
      result.message ??
        EXTERNAL_SALES_MESSAGES[ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN],
    );
    this.name = 'ExternalSalesBlockedError';
    this.code = result.code ?? ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN;
    this.action = action;
  }
}

function deny(code: ExternalSalesErrorCode, isDrug: boolean): ExternalSalesResult {
  return { allowed: false, code, message: EXTERNAL_SALES_MESSAGES[code], isDrug };
}

/**
 * ① 동기 판정 — regulatoryType 을 이미 들고 있을 때.
 *
 * 판정 순서:
 *   1. `regulatory_type` 결측(null/undefined/공백) → 보수적 **거부** (UNRESOLVED)
 *   2. 의약품 → **거부** (FORBIDDEN)
 *   3. 그 외 전부 허용 — 의약외품 · 건강기능식품 · 의료기기 · 화장품 · 일반은 통과한다
 *      (본 가드는 의약품 여부만 본다. 채널별 카테고리 제약은 adapter 책임)
 */
export function assertExternalSalesEligible(
  product: ExternalSalesProduct,
): ExternalSalesResult {
  const raw = (product?.regulatoryType ?? '').toString().trim();

  // 1. 결측 → 비의약품임을 증명할 수 없다 → fail-closed
  if (raw.length === 0) {
    return deny(ExternalSalesErrorCode.EXTERNAL_SALES_PRODUCT_UNRESOLVED, false);
  }

  // 2. 의약품 → 예외 없이 거부 (판정 SSOT 재사용)
  if (isDrugRegulatoryType(raw)) {
    return deny(ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN, true);
  }

  // 3. 비의약품 → 허용
  return { allowed: true, isDrug: false };
}

/**
 * ② 비동기 판정 — masterId 만 있을 때 DB 에서 `regulatory_type` 을 읽어 판정한다.
 *
 * 요청이 자기 신고한 regulatoryType 을 신뢰하지 않아야 하는 경로(외부 입력에서 온 등록 요청 등)
 * 에서는 반드시 이쪽을 쓴다.
 */
export async function assertExternalSalesEligibleById(
  executor: ExternalSalesExecutor,
  masterId?: string | null,
): Promise<ExternalSalesResult> {
  const id = (masterId ?? '').toString().trim();
  if (!id || !UUID_RE.test(id)) {
    return deny(ExternalSalesErrorCode.EXTERNAL_SALES_PRODUCT_UNRESOLVED, false);
  }

  let rows: Array<{ regulatory_type: string | null; name: string | null }>;
  try {
    rows = await executor.query(
      `SELECT regulatory_type, name FROM product_masters WHERE id = $1 LIMIT 1`,
      [id],
    );
  } catch {
    // 조회 실패 → 확정 불가 → fail-closed
    return deny(ExternalSalesErrorCode.EXTERNAL_SALES_PRODUCT_UNRESOLVED, false);
  }

  if (!rows || rows.length === 0) {
    return deny(ExternalSalesErrorCode.EXTERNAL_SALES_PRODUCT_UNRESOLVED, false);
  }

  return assertExternalSalesEligible({
    masterId: id,
    name: rows[0].name,
    regulatoryType: rows[0].regulatory_type,
  });
}

/**
 * ③ throw 계약 — adapter 진입점에서 쓴다.
 *
 * `action` 은 거부를 **등록에서 막았는지 동기화에서 막았는지** 감사 로그에 남기기 위한 것이며
 * 판정에는 영향을 주지 않는다 (행위별로 기준이 달라지면 그 자체가 우회 표면이 된다).
 */
export async function assertExternalSalesEligibleOrThrow(
  executor: ExternalSalesExecutor,
  masterId: string | null | undefined,
  action: ExternalSalesAction,
): Promise<void> {
  const result = await assertExternalSalesEligibleById(executor, masterId);
  if (!result.allowed) throw new ExternalSalesBlockedError(result, action);
}
