/**
 * WO-O4O-OTC-EASY-DRUG-V4-ROUTE-RECOVERABLE-535-FINAL-PRODUCTION-V1
 *   — route 예외 회수분(RECOVERABLE 535) 최종 생산 배치 계약 (에이전트 가)
 *
 * pilot 100 / pilot 500 / next2000 / finalall 과 동일한 순수 함수(섹션 파서 · md5 · masterRefV4)를
 * 그대로 쓰고 batch 식별자와 원장 경로만 바꾼다. 새 파서·새 산식을 만들지 않는다.
 *
 * 선행 배치와 유일하게 다른 점: **route 를 재판정하지 않는다.**
 * route 는 reconciliation 이 확정한 재투입 큐(otc-v4-route-673-final-reentry-queue.ga.json)의
 * `resolvedRoute`(= 45b2f1add 나 에이전트 판정) 를 그대로 승계한다.
 *
 * 본 모듈에는 어떤 DB write 도 없다.
 */
import path from 'node:path';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';

export const WO_500 = 'WO-O4O-OTC-EASY-DRUG-V4-ROUTE-RECOVERABLE-535-FINAL-PRODUCTION-V1';
export const BATCH_ID_500 = 'otc-v4-route535';
/** author 의 loadLedgerForm 이 참조하는 원장 — 본 배치는 선정 원장이 그 역할을 한다. */
export const PILOT_500_LEDGER = path.join(DATA_DIR, 'otc-v4-route535-selection-ledger.ga.json');
/** route SSOT — reconciliation 이 확정한 재투입 큐. 재판정 금지. */
export const REENTRY_QUEUE = path.join(DATA_DIR, 'otc-v4-route-673-final-reentry-queue.ga.json');
