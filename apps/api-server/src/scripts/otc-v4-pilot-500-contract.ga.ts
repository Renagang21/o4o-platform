/**
 * WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1
 *   — pilot 500 배치 계약 (에이전트 가)
 *
 * 선행: WO-...-PILOT-500-QUEUE-V1 (commit 1e14b8ad7, 에이전트 라, READ-ONLY)
 *
 * ⚠️ 이 모듈은 pilot 100 정본 계약(otc-v4-master-leaflet-contract.ga.ts)의
 *    순수 함수(섹션 파서 · normalize · md5 · masterRefV4 · route 확정 · DB 조회)를
 *    **재구현하지 않고 그대로 재사용**한다. batch 식별자와 원장 로더만 덧붙인다.
 *    → 섹션 파싱/해시/sourceRef 산식이 la census/queue 및 pilot 100 과 byte-identical 로 유지된다.
 *
 * 본 모듈에는 어떤 DB write 도 없다(조회·계산 전용).
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, masterRefV4, type PilotMaster } from './otc-v4-master-leaflet-contract.ga.js';

export const WO_500 = 'WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1';
export const QUEUE_WO_500 = 'WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-QUEUE-V1';
export const BATCH_ID_500 = 'otc-v4-pilot-500';
export const PILOT_500_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-ledger-v1.json');
export const GA_INPUT_500 = path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json');

/** pilot 100 대상 — 교집합 0 및 불변 검증용(읽기 전용). */
export const PILOT_100_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-ledger-v1.json');

export const EXPECTED_TOTAL_500 = 500;

/**
 * pilot 500 원장 로드(masterId 오름차순 고정). 원장 파일은 읽기 전용 — 수정 금지.
 * pilot 500 원장은 pilot 100 PilotMaster 의 상위집합 스키마다.
 */
export function loadPilot500(): PilotMaster[] {
  const j = JSON.parse(fs.readFileSync(PILOT_500_LEDGER, 'utf8'));
  const rows = (j.masters as PilotMaster[]).slice().sort((a, b) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0));
  if (rows.length !== EXPECTED_TOTAL_500) throw new Error(`STOP: pilot 500 원장 ${rows.length} != ${EXPECTED_TOTAL_500}`);
  const uniq = new Set(rows.map((r) => r.masterId));
  if (uniq.size !== EXPECTED_TOTAL_500) throw new Error(`STOP: pilot 500 master 중복 — unique ${uniq.size}`);
  for (const r of rows) {
    if (r.plannedSourceRef !== masterRefV4(r.masterId)) throw new Error(`STOP: ${r.masterId} sourceRef 산식 불일치`);
  }
  // pilot 100 교집합 0 (SYS: 완료 master 재진입 금지)
  const p100 = new Set<string>(
    (JSON.parse(fs.readFileSync(PILOT_100_LEDGER, 'utf8')).masters as PilotMaster[]).map((m) => m.masterId),
  );
  const overlap = rows.filter((r) => p100.has(r.masterId)).map((r) => r.masterId);
  if (overlap.length) throw new Error(`STOP: pilot 100 교집합 ${overlap.length}건 — ${overlap.slice(0, 5).join(',')}`);
  return rows;
}

/** pilot 100 GREEN master 집합(불변 검증 기준). */
export function loadPilot100GreenIds(): string[] {
  const f = path.join(DATA_DIR, 'otc-v4-pilot-100-green-ledger.ga.json');
  if (!fs.existsSync(f)) return [];
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const rows = (j.rows || j.green || j.masters || []) as Array<{ masterId: string }>;
  return rows.map((r) => r.masterId).filter(Boolean);
}
