/**
 * WO-O4O-OTC-EASY-DRUG-V4-REMAINING-NORMAL-ALL-FINAL-PRODUCTION-V1
 *   — 정상 잔여 전량 배치 계약 (에이전트 가)
 *
 * pilot 100 / pilot 500 / next2000 과 동일한 순수 함수(섹션 파서 · md5 · masterRefV4 · route 확정)를
 * 그대로 쓰고 batch 식별자와 원장 경로만 바꾼다. 새 파서·새 산식을 만들지 않는다.
 *
 * 원장은 `otc-v4-finalall-select.ga.ts` 가 LIVE DB 에서 결정론적으로 산출한 선정 원장이다.
 * 본 모듈에는 어떤 DB write 도 없다.
 */
import path from 'node:path';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';

export const WO_500 = 'WO-O4O-OTC-EASY-DRUG-V4-REMAINING-NORMAL-ALL-FINAL-PRODUCTION-V1';
export const BATCH_ID_500 = 'otc-v4-finalall';
/** author 의 loadLedgerForm 이 참조하는 원장 — 본 배치는 선정 원장이 그 역할을 한다. */
export const PILOT_500_LEDGER = path.join(DATA_DIR, 'otc-v4-finalall-selection-ledger.ga.json');
