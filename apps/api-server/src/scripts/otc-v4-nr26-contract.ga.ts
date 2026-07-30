/**
 * WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1
 *   — nasal 14 + rectal 12 (총 26 master) 전용 배치 계약 (에이전트 가)
 *
 * 본 WO 는 **PRE_APPLY READY 까지만** 간다. LIVE apply 는 하지 않는다.
 * DB write 는 rollback-test 내부를 제외하고 최종 0 이어야 한다.
 *
 * route 는 재판정하지 않는다. route 예외 673 판정 원장(45b2f1add) → reconciliation(7bf0b580a) 이
 * 확정한 carry-over 원장의 `classification='REQUIRES_ROUTE_PROFILE'` · `resolvedRoute` 를 그대로 승계한다.
 *
 * 선행 배치와 다른 점은 단 하나: nasal/rectal 은 기존 composer 지원 route(oral·oromucosal·ophthalmic·
 * topical·vaginal) 밖이므로 **배치 전용 route profile** 을 새로 만든다. 공용 composer 파일은 수정하지 않고
 * `profiles` 주입 seam 만 사용한다(선행 LIVE 산출물 재현성 보존).
 *
 * 본 모듈에는 어떤 DB write 도 없다.
 */
import path from 'node:path';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';

export const WO_NR = 'WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1';
export const BATCH_ID_NR = 'otc-v4-nr26';

/** 독립 실행 단위 2개. 각각 별도 dry-run · rollback-test · PRE_APPLY 원장을 갖는다. */
export const UNITS = {
  nasal: { unit: 'nasal-unit-1', route: 'nasal', expected: 14 },
  rectal: { unit: 'rectal-unit-1', route: 'rectal', expected: 12 },
} as const;
export type UnitKey = keyof typeof UNITS;

/** 모집단 SSOT — reconciliation 이 확정한 carry-over 원장. 재판정·재도출 금지. */
export const CARRYOVER_LEDGER = path.join(DATA_DIR, 'otc-v4-route-673-carryover-ledger.ga.json');
export const TARGET_CLASSIFICATION = 'REQUIRES_ROUTE_PROFILE';

/** 오염 대조군 — 교집합 0 을 증명해야 하는 집합들. */
export const REENTRY_QUEUE_535 = path.join(DATA_DIR, 'otc-v4-route-673-final-reentry-queue.ga.json');
export const EXCLUDE_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-remaining-3809-exclude-ledger-v1.json');
export const SOURCE_TERMINAL_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json');
export const WITHDRAW_NONHUMAN_LEDGER = path.join(DATA_DIR, 'otc-v4-route535-withdraw-nonhuman.ga.json');

export const P = (f: string): string => path.join(DATA_DIR, f);

/** LIVE apply 잠금 — 본 WO 로는 열리지 않는다. 별도 승인 WO 가 두 env 를 모두 채워야 한다. */
export const CONFIRM_ENV_NR = 'OTC_V4_APPLY_NR26';
export const APPROVAL_WO_ENV_NR = 'OTC_V4_NR26_APPROVAL_WO';
