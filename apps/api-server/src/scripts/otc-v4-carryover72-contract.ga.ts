/**
 * WO-O4O-OTC-EASY-DRUG-V4-CARRYOVER72-FINAL-PRODUCTION-V1 — 배치 계약 (에이전트 가)
 *
 * 원장은 carryover 112 최종 판정(commit 796eee02f)의 재투입 원장이다.
 * 순수 함수(섹션 파서·md5·masterRefV4)는 V4 정본 계약을 그대로 재사용한다. DB write 0.
 */
import path from 'node:path';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';

export const WO_500 = 'WO-O4O-OTC-EASY-DRUG-V4-CARRYOVER72-FINAL-PRODUCTION-V1';
export const BATCH_ID_500 = 'otc-v4-carryover72';
/** author 의 loadLedgerForm 이 참조하는 원장 — 본 배치는 prep 산출물이 그 역할을 한다. */
export const PILOT_500_LEDGER = path.join(DATA_DIR, 'otc-v4-carryover72-selection-ledger.ga.json');
export const REENTRY_LEDGER = path.join(DATA_DIR, 'otc-v4-carryover112-agent-ga-reentry.ga.json');
export const TERMINAL_LEDGER = path.join(DATA_DIR, 'otc-v4-carryover112-terminal-ledger.ga.json');
