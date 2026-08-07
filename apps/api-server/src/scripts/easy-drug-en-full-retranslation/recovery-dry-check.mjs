/**
 * WO-O4O-EASY-DRUG-EN-HOME-RESUME-STATE-RECONSTRUCTION-V1 §12 — 재개 전 dry-check (write 0)
 *
 * produce-emit.mjs 의 선정 계약을 **그대로 모사**하되 아무것도 쓰지 않는다.
 * 목적은 batch-0039 발행 전에 다음을 증명하는 것이다:
 *   - 완료 master 를 다시 고르지 않는다 (pickOverlapWithDone = 0)
 *   - 후보가 전부 NOT_READY 집합에 속한다
 *   - 기존 배치 파일을 덮어쓰지 않는다
 *
 * 채번 주의: 이 저장소의 batches/ 최대 id 는 0002 다(0003~0038 manifest 는 소실).
 * 따라서 tracked emitter 를 그대로 돌리면 nativeNextSeq = 0003 이 된다.
 * 복구 계약상 다음 번호는 0039 이므로 그 격차를 여기서 드러낸다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { BATCHES, loadTM, readJsonl, streamKoUnits, missingHashes, bodySentences, blockedMasters, EN_UNITS_PATH } from './tm-lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SENT_BUDGET = parseInt(arg('--sentences', '400'), 10);
const MAX_MASTERS = parseInt(arg('--max-masters', '400'), 10);
const FORCED_SEQ = parseInt(arg('--seq', '39'), 10);

const tm = loadTM();
const done = new Set(readJsonl(EN_UNITS_PATH).map((u) => u.masterId));
const blocked = blockedMasters();

const cand = [];
const notReadySet = new Set();
let total = 0;
for (const ko of streamKoUnits()) {
  total++;
  if (done.has(ko.masterId) || blocked.has(ko.masterId)) continue;
  const miss = missingHashes(ko, tm);
  if (miss.size) notReadySet.add(ko.masterId);
  cand.push({ masterId: ko.masterId, cost: miss.size, sentences: bodySentences(ko).length });
}
cand.sort((a, b) => a.cost - b.cost || (a.masterId < b.masterId ? -1 : 1));

const pick = [];
let spent = 0;
for (const c of cand) {
  if (c.cost === 0) { pick.push(c); if (pick.length >= MAX_MASTERS) break; continue; }
  if (pick.length >= MAX_MASTERS) break;
  if (spent && spent + c.cost > SENT_BUDGET) break;
  pick.push(c); spent += c.cost;
  if (spent >= SENT_BUDGET) break;
}

const ids = fs.readdirSync(BATCHES).map((f) => /^batch-(\d+)\.json$/.exec(f)).filter(Boolean).map((m) => Number(m[1]));
const nativeNext = (ids.length ? Math.max(...ids) : 0) + 1;
const forcedId = String(FORCED_SEQ).padStart(4, '0');

const pickIds = pick.map((p) => p.masterId);
console.log(JSON.stringify({
  wo: 'WO-O4O-EASY-DRUG-EN-HOME-RESUME-STATE-RECONSTRUCTION-V1',
  step: 'recovery-dry-check',
  population: total,
  doneMasters: done.size,
  blockedMasters: blocked.size,
  candidates: cand.length,
  notReadyMasters: notReadySet.size,
  candidatesAllNotReady: cand.every((c) => notReadySet.has(c.masterId)),
  pick: {
    masters: pick.length,
    newSentences: spent,
    zeroCostMasters: pick.filter((p) => p.cost === 0).length,
    allPicksInNotReady: pickIds.every((m) => notReadySet.has(m)),
  },
  pickOverlapWithDone: pickIds.filter((m) => done.has(m)).length,
  sequence: {
    existingBatchIds: ids.sort((a, b) => a - b),
    nativeNextSeq: String(nativeNext).padStart(4, '0'),
    forcedNextSeq: forcedId,
    renumberRequired: nativeNext !== FORCED_SEQ,
    wouldOverwriteExisting: fs.existsSync(path.join(BATCHES, `batch-${forcedId}.json`)),
  },
  tmSize: tm.size,
  dbWrites: 0,
  fileWrites: 0,
}, null, 2));
