/**
 * WO-O4O-EASY-DRUG-EN-HOME-RESUME-STATE-RECONSTRUCTION-V1 — 최종 TM 기반 current validated state reconstruction
 *
 * 과거 done-set 을 쓰지 않는다. 19,360 master 전수를 **현재 최종 TM 만으로** 조립하고
 * master 별 독립검증을 돌려 통과 집합 S 를 새 resume SSOT 로 만든다.
 *
 * 신규 번역 0 / hidden old EN 미사용 / 추정 보완 0 / DB 접속 0.
 * assemble() 은 produce-ingest.mjs 의 것과 동일 계약이다(문자 단위 동일).
 *
 * 게이트 통과 전에는 en-units.jsonl 을 만들지 않는다 — .partial 로 쓰고 통과 시에만 확정한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validate } from './en-validator.mjs';
import { SECTION_TITLE, FIELD_LABEL, BADGE, FOOTER } from './en-frame.mjs';
import { RESULTS, TM_PATH, tmKey, normalizeKo, loadTM, streamKoUnits, bodySentences, blockedMasters } from './tm-lib.mjs';

const EXPECT = { population: 19360, tmDistinct: 11983, historicalProduced: 15889 };

/* ── 5. 최종 TM 재구성 + 무결성 ───────────────────────────────── */
const rawLines = fs.readFileSync(TM_PATH, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const byHash = new Map();
let keyMismatch = 0;
for (const e of rawLines) {
  if (tmKey(e.ko) !== e.hash) keyMismatch++;
  const g = byHash.get(e.hash) ?? { kos: new Set(), ens: new Set(), n: 0 };
  g.kos.add(normalizeKo(e.ko)); g.ens.add(String(e.en).trim()); g.n++;
  byHash.set(e.hash, g);
}
/** 진짜 충돌 = 같은 키에 서로 다른 KO 문장(해시 충돌). 정정(같은 KO·다른 EN)은 last-wins 계약이라 충돌이 아니다. */
const hashCollisions = [...byHash.values()].filter((g) => g.kos.size > 1).length;
const correctionOverrides = [...byHash.values()].filter((g) => g.ens.size > 1).length;
const tm = loadTM(); // last-wins

const tmReport = {
  lines: rawLines.length,
  distinctHash: byHash.size,
  loadedSize: tm.size,
  keyMismatch,
  hashCollisions,
  correctionOverrides,
  repeatedLines: rawLines.length - byHash.size,
};

/* ── 6~7. 전수 assemble + master 별 독립검증 ──────────────────── */
function assemble(ko) {
  const missing = [];
  const segments = ko.segments.map((s) => {
    if (s.kind === 'FIXED_IDENTITY') {
      return s.field === '구분' ? { ...s, text: BADGE[s.text] ?? s.text } : { ...s };
    }
    if (s.kind === 'HEADING') return { ...s, text: SECTION_TITLE[s.text] ?? FIELD_LABEL[s.text] ?? s.text };
    if (FOOTER[s.text]) return { ...s, text: FOOTER[s.text] };
    const hit = tm.get(tmKey(s.text));
    if (!hit) { missing.push(tmKey(s.text)); return { ...s, text: '' }; }
    return { ...s, text: hit.en };
  });
  return { missing, unit: { masterId: ko.masterId, itemSeq: ko.itemSeq, segments } };
}

const PARTIAL = path.join(RESULTS, 'en-units.jsonl.partial');
const outStream = fs.createWriteStream(PARTIAL, 'utf8');
const notReadyStream = fs.createWriteStream(path.join(RESULTS, 'recovery-not-ready.jsonl'), 'utf8');
const failStream = fs.createWriteStream(path.join(RESULTS, 'recovery-validation-failures.jsonl'), 'utf8');

const sMasters = [];
const seen = new Set();
let duplicates = 0, total = 0, notReady = 0, failed = 0;
const missingHashPool = new Set();
const failCodes = {};
const notReadyMissingHist = {};

for (const ko of streamKoUnits()) {
  total++;
  if (seen.has(ko.masterId)) { duplicates++; continue; }
  seen.add(ko.masterId);

  const { missing, unit } = assemble(ko);
  if (missing.length) {
    notReady++;
    for (const h of missing) missingHashPool.add(h);
    const uniq = new Set(missing).size;
    notReadyMissingHist[uniq] = (notReadyMissingHist[uniq] ?? 0) + 1;
    notReadyStream.write(JSON.stringify({ masterId: ko.masterId, itemSeq: ko.itemSeq, missingUnique: uniq, missing: [...new Set(missing)] }) + '\n');
    continue;
  }
  const r = validate(ko, unit);
  if (!r.pass) {
    failed++;
    for (const c of r.codes) failCodes[c] = (failCodes[c] ?? 0) + 1;
    failStream.write(JSON.stringify({ masterId: ko.masterId, itemSeq: ko.itemSeq, codes: r.codes, violations: r.violations.slice(0, 6) }) + '\n');
    continue;
  }
  sMasters.push(ko.masterId);
  outStream.write(JSON.stringify({
    masterId: ko.masterId, itemSeq: ko.itemSeq,
    batch: 'recovery', checkpoint: 'recovery-cp01',
    koHash: ko.generatedContentHash, sentences: bodySentences(ko).length,
    segments: unit.segments,
  }) + '\n');
}
await new Promise((res) => outStream.end(res));
await new Promise((res) => notReadyStream.end(res));
await new Promise((res) => failStream.end(res));

const sSorted = [...sMasters].sort();
const setSha = crypto.createHash('sha256').update(sSorted.join('\n')).digest('hex');

/* ── 8. 게이트 ────────────────────────────────────────────────── */
const gates = {
  'population = 19,360': total === EXPECT.population,
  'TM distinct = 11,983': tm.size === EXPECT.tmDistinct,
  'TM key mismatch = 0': keyMismatch === 0,
  'TM hash collision = 0': hashCollisions === 0,
  '|S| >= 15,889': sMasters.length >= EXPECT.historicalProduced,
  'duplicate master = 0': duplicates === 0,
  'validation failure inside S = 0': true,
  'S + NOT_READY + FAILED = population': sMasters.length + notReady + failed === total,
};
const pass = Object.values(gates).every(Boolean);

const summary = {
  wo: 'WO-O4O-EASY-DRUG-EN-HOME-RESUME-STATE-RECONSTRUCTION-V1',
  step: 'recovery-reconstruct',
  resumeSource: 'reconstructed-from-final-tm',
  historicalLastBatch: 38,
  note: '과거 batch-0003~0038 manifest 를 복원한 것이 아니다. 최종 TM 기준 current validated state 재계산이다.',
  population: total,
  tm: tmReport,
  reconstructed: {
    S: sMasters.length,
    deltaVsHistorical: sMasters.length - EXPECT.historicalProduced,
    notReady,
    validationFailed: failed,
    duplicates,
    setSha256: setSha,
  },
  validationFailureCodes: failCodes,
  notReadyMissingUniqueHistogramTop: Object.fromEntries(
    Object.entries(notReadyMissingHist).sort((a, b) => Number(a[0]) - Number(b[0])).slice(0, 12),
  ),
  tmMissingDistinctSentences: missingHashPool.size,
  candidatesForNextBatch: total - sMasters.length,
  blockedFinal: blockedMasters().size,
  gates,
  verdict: pass ? 'RECONSTRUCTION_PROVEN' : 'RECONSTRUCTION_FAILED',
  dbWrites: 0,
};

if (pass) {
  fs.renameSync(PARTIAL, path.join(RESULTS, 'en-units.jsonl'));
  fs.writeFileSync(path.join(RESULTS, 'recovery-master-set.sha256'), `${setSha}  S=${sMasters.length}\n`, 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'recovery-master-set.txt'), sSorted.join('\n') + '\n', 'utf8');
} else {
  summary.partialKept = PARTIAL;
}
fs.writeFileSync(path.join(RESULTS, 'recovery-summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summary, null, 2));
