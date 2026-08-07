/**
 * 종료 검증(write 0): 전 모집단 19,360 master 를 ingest 결과에 의존하지 않고 다시 독립검증한다.
 *
 * - ko-units 를 스트리밍하며 en-units 에 저장된 EN 단위를 찾아 validate() 를 재실행한다.
 * - 파일/DB write 를 하지 않는다. TM·problem-queue 도 건드리지 않는다.
 * - 추가로 TM 충돌(같은 hash 에 서로 다른 EN 이 최종 상태로 남아있는지)과
 *   en-units 중복 master, 미생산 master 를 함께 센다.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { streamKoUnits, bodySentences, EN_UNITS_PATH, TM_PATH } from './tm-lib.mjs';
import { validate } from './en-validator.mjs';

/* 1. en-units 최종 상태(마지막 항목 우선) — 대용량이므로 스트리밍으로 읽는다. */
const enUnits = new Map();
let enLines = 0, enDup = 0;
{
  const rl = readline.createInterface({ input: fs.createReadStream(EN_UNITS_PATH, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    enLines++;
    const u = JSON.parse(line);
    if (enUnits.has(u.masterId)) enDup++;
    enUnits.set(u.masterId, u);
  }
}

/* 2. TM 최종 상태 — 같은 hash 가 여러 번 나오면 last-wins. 최종본이 서로 다른 경우만 '정정'으로 센다. */
let tmLines = 0, tmCorrections = 0;
const tmLast = new Map();
{
  const rl = readline.createInterface({ input: fs.createReadStream(TM_PATH, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    tmLines++;
    const r = JSON.parse(line);
    const prev = tmLast.get(r.hash);
    if (prev !== undefined && prev !== r.en) tmCorrections++;
    tmLast.set(r.hash, r.en);
  }
}

/* 3. 전 master 재검증 */
let total = 0, verified = 0, missingUnit = 0, failed = 0, emptySegment = 0;
const codeTally = {};
const failSamples = [];
for (const ko of streamKoUnits()) {
  total++;
  const unit = enUnits.get(ko.masterId);
  if (!unit) { missingUnit++; continue; }
  for (const s of unit.segments) if (s.kind === 'BODY' && !String(s.text).trim()) emptySegment++;
  const r = validate(ko, unit);
  if (r.pass) { verified++; continue; }
  failed++;
  for (const c of r.codes) codeTally[c] = (codeTally[c] ?? 0) + 1;
  if (failSamples.length < 10) failSamples.push({ masterId: ko.masterId, itemSeq: ko.itemSeq, codes: r.codes, detail: r.violations?.[0]?.detail });
}

/* 4. 문장 수 합계(참고 지표) */
let bodyTotal = 0;
for (const ko of streamKoUnits()) bodyTotal += bodySentences(ko).length;

console.log(JSON.stringify({
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FINAL-PRODUCTION-TO-CLOSE-V1',
  step: 'final-verify',
  koMasters: total,
  enUnitsLines: enLines,
  enUnitsDistinct: enUnits.size,
  enUnitsDuplicateAppends: enDup,
  missingUnit,
  verified,
  failed,
  emptyBodySegments: emptySegment,
  codeTally,
  failSamples,
  tm: { lines: tmLines, distinct: tmLast.size, corrections: tmCorrections },
  koBodySentencesTotal: bodyTotal,
  fileWrites: 0,
  dbWrites: 0,
}, null, 2));
