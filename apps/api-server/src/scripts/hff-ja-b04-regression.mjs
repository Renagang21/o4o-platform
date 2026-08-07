/**
 * WO-O4O-HFF-JA-REMAINING-16162-PHRASE-AUTHORING-STRUCTURED-COMPRESSION-AND-CONTINUOUS-SHARDS-V1 §1
 *
 * 공용 엔진·자산 변경 회귀검증 — **이미 저장된 JA 27,414 건**(Batch 01 + 02 + 03) 전량.
 *
 * 이 WO 는 공용 엔진에 규칙을 추가했다(규격 수치 문법 · 수치 문맥 `이상`→`以上` 선행 가드).
 * 추가 규칙은 기존 경로가 실패한 뒤에만 동작하도록 두었지만, **선행 가드 하나는 예외**이므로
 * 실제로 기존 산출물이 바뀌지 않았는지 DB read-only 로 확인한다.
 *
 * 판정 축(§5):
 *   - 저장된 기존 canonical 수정 0 : 저장 본문 해시 == 각 배치가 렌더 통과시킨 본문 해시
 *   - 생산 가능성 악화 0           : 현재 엔진으로 다시 build 해도 여전히 전량 생산 가능
 *   - 구조 차이 0                  : 재생산본의 구조 패리티가 저장본과 동일
 *
 * 추가 감사(이번 WO 신설):
 *   - 저장된 27,414 건에 `이상`(하한)이 `異常` 으로 뒤집혀 적재된 사례가 있는지 전수 조사.
 *     발견되더라도 이 WO 는 저장 행을 고치지 않는다 — 사실만 보고한다(§ KO·기존 canonical 불변).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { build, parityBreak, PARITY } from './hff-ja-b01-build.mjs';
import { clearMemo } from './hff-ja-b01-translate.mjs';
import { scanDocument } from './hff-ja-b04-gate.mjs';

const D = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-JA-REMAINING-16162-PHRASE-AUTHORING-STRUCTURED-COMPRESSION-AND-CONTINUOUS-SHARDS-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');

const PRIOR = ['hff-ja-b01-safe-targets-v1.json', 'hff-ja-b02-safe-targets-v1.json', 'hff-ja-b03-safe-targets-v1.json']
  .flatMap((f) => (fs.existsSync(`${D}/${f}`) ? JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8')).targets : []));
const expectHash = new Map(PRIOR.map((t) => [t.productMasterId, t.newContentHash]));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5471', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

/* 저장된 JA 전량 감사는 배치 원장과 무관하게 DB 현재 상태로 센다. */
const abnormal = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND language='ja' AND description_type='STORE'
     AND status='canonical' AND source_type='o4o_hff_generated'
     AND content ~ '[0-9%]異常'`)).rows[0].n;
const abnormalSamples = (await c.query(`
  SELECT master_id, substring(content from '.{0,60}異常.{0,40}') s
    FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND language='ja' AND description_type='STORE'
     AND status='canonical' AND source_type='o4o_hff_generated'
     AND content ~ '[0-9%]異常' LIMIT 10`)).rows;

const masters = PRIOR.map((t) => t.productMasterId);
const stored = new Map();
const SH = 5000;
for (let i = 0; i < masters.length; i += SH) {
  const rows = (await c.query(`
    SELECT master_id, content FROM shared_product_descriptions
     WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND language='ja'
       AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`,
  [masters.slice(i, i + SH)])).rows;
  for (const r of rows) stored.set(r.master_id, r.content);
}
const koRows = [];
for (let i = 0; i < masters.length; i += SH) {
  const rows = (await c.query(`
    SELECT master_id, content FROM shared_product_descriptions
     WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND coalesce(language,'ko')='ko'
       AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`,
  [masters.slice(i, i + SH)])).rows;
  koRows.push(...rows);
}
await c.end();

const cnt = (h, re) => (h.match(re) ?? []).length;
let storedModified = 0, storedMissing = 0, notProducible = 0, structureDiff = 0, parityBroken = 0, gateDefect = 0;
const samples = [];
for (const r of koRows) {
  const s = stored.get(r.master_id);
  if (s === undefined) { storedMissing++; continue; }
  if (sha(s) !== expectHash.get(r.master_id)) {
    storedModified++;
    if (samples.length < 5) samples.push({ m: r.master_id, why: 'STORED_MODIFIED' });
  }
  const b = build(r.content);
  if (b.misses.length || b.hangul || b.simplified) {
    notProducible++;
    if (samples.length < 12) samples.push({ m: r.master_id, why: 'NOT_PRODUCIBLE', miss: b.misses[0]?.text?.slice(0, 60) });
    continue;
  }
  if (parityBreak(r.content, b.html)) { parityBroken++; continue; }
  const g = scanDocument(r.content, b.html);
  if (g) {
    gateDefect++;
    if (samples.length < 18) samples.push({ m: r.master_id, why: 'GATE', defect: g });
  }
  for (const [re, name] of PARITY) {
    if (cnt(s, re) !== cnt(b.html, re)) {
      structureDiff++;
      if (samples.length < 24) samples.push({ m: r.master_id, why: 'STRUCTURE_DIFF', at: name });
      break;
    }
  }
}
clearMemo();

const out = {
  wo: WO, checkedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  scope: 'batch01+batch02+batch03 stored JA canonical', ledgerTargets: PRIOR.length,
  documents: koRows.length, storedFound: stored.size,
  storedModified, storedMissing, notProducible, structureDiff, parityBroken,
  /* 게이트는 이번 WO 에서 신설했다. 기존 산출물에 걸리는 건수는 회귀가 아니라 **기존 결함 실측치**다. */
  gateDefectOnRebuild: gateDefect,
  storedAbnormalMistranslation: abnormal,
  storedAbnormalSamples: abnormalSamples.map((x) => ({ m: x.master_id, s: x.s })),
  samples,
  verdict: (!storedModified && !storedMissing && !notProducible && !structureDiff && !parityBroken
    && koRows.length === PRIOR.length) ? 'PASS' : 'FAIL',
};
fs.writeFileSync(`${D}/hff-ja-b04-regression-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
