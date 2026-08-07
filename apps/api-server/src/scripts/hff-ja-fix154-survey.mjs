/**
 * WO-O4O-HFF-JA-NUMERIC-IZYOU-MISTRANSLATION-154-CORRECTION-V1 §2 대상 재현
 *
 * 수치 범위 문맥의 한국어 `이상`(하한)이 일본어 `異常`(이상반응)으로 뒤집혀 저장된
 * JA canonical 을 **전수** 찾는다. DB read-only.
 *
 * 판별 축(문자열 일괄치환 금지 — §2):
 *   ① JA 저장문에 **숫자·% 가 바로 붙은** `異常` 이 있을 것 (`80異常`).
 *      항목 번호(`(2) 異常が生じた…`)나 안전 문맥의 `異常事例` 는 숫자가 즉시 인접하지 않는다.
 *   ② 같은 제품의 KO canonical 에 대응하는 **수치 범위 `이상`** 이 있을 것
 *      (`숫자[%] 이상` 형태). KO 에 근거가 없으면 대상이 아니다.
 *   ③ 재생성본에서 그 자리가 `以上` 으로 바뀔 것 — 즉 현재 엔진이 실제로 교정한다는 것.
 *
 * 세 조건을 모두 만족하는 행만 교정 대상이다. 정상 문맥의 `異常` 은 건드리지 않는다.
 *
 * 산출(기본): data/hff-ja-fix154-survey-v1.json · data/hff-ja-fix154-targets-v1.json
 *   — 이 두 파일은 **승인된 교정 원장(immutable baseline)** 이다.
 *   재판정 목적으로 다시 돌릴 때는 반드시 `FIX154_OUT_SUFFIX` 를 지정해 별도 파일로 저장한다.
 *   (원장을 덮어쓰면 회귀검증이 승인된 교정을 `storedModified` 로 잡아 실제 회귀를 가린다.)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { build, parityBreak, PARITY } from './hff-ja-b01-build.mjs';
import { clearMemo } from './hff-ja-b01-translate.mjs';
import { scanDocument } from './hff-ja-b04-gate.mjs';

const D = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-JA-NUMERIC-IZYOU-MISTRANSLATION-154-CORRECTION-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');

/* 수치가 즉시 인접한 異常 — 하한 `以上` 이 뒤집힌 형태만 잡는다. */
const NUM_ABNORMAL = /[\d%]異常/;
/* KO 근거 — 수치 뒤의 `이상`. `이상사례`·`이상반응` 은 뒤에 한글이 이어지므로 제외한다. */
const KO_NUM_IZYOU = /[\d%]\s*이상(?![가-힣])/;

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5481', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

/* ① JA 쪽 후보 — 수치 즉시 인접 異常 */
const ja = (await c.query(`
  SELECT id, master_id, content FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND language='ja' AND description_type='STORE'
     AND status='canonical' AND source_type='o4o_hff_generated'
     AND content ~ '[0-9%]異常'
   ORDER BY master_id`)).rows;

/* 참고 지표 — 안전 문맥 포함 전체 異常 보유 문서 수(치환 금지 근거) */
const anyAbnormal = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND language='ja' AND description_type='STORE'
     AND status='canonical' AND source_type='o4o_hff_generated'
     AND content LIKE '%異常%'`)).rows[0].n;

const masters = ja.map((r) => r.master_id);
const ko = new Map();
const SH = 2000;
for (let i = 0; i < masters.length; i += SH) {
  const rows = (await c.query(`
    SELECT master_id, id, content FROM shared_product_descriptions
     WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND coalesce(language,'ko')='ko'
       AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`,
  [masters.slice(i, i + SH)])).rows;
  for (const r of rows) ko.set(r.master_id, r);
}
await c.end();

const cnt = (h, re) => (h.match(re) ?? []).length;
const targets = [], rejected = [];
for (const r of ja) {
  const k = ko.get(r.master_id);
  if (!k) { rejected.push({ m: r.master_id, why: 'NO_KO_CANONICAL' }); continue; }
  /* ② KO 근거 확인 */
  if (!KO_NUM_IZYOU.test(k.content)) { rejected.push({ m: r.master_id, why: 'NO_KO_NUMERIC_IZYOU' }); continue; }
  /* ③ 현재 엔진이 실제로 교정하는지 */
  const b = build(k.content);
  if (b.misses.length || b.hangul || b.simplified) { rejected.push({ m: r.master_id, why: 'NOT_PRODUCIBLE_NOW' }); continue; }
  if (NUM_ABNORMAL.test(b.html)) { rejected.push({ m: r.master_id, why: 'STILL_MISTRANSLATED' }); continue; }
  if (parityBreak(k.content, b.html)) { rejected.push({ m: r.master_id, why: 'PARITY_BREAK' }); continue; }
  const gate = scanDocument(k.content, b.html);
  if (gate) { rejected.push({ m: r.master_id, why: `GATE_${gate}` }); continue; }
  /* 구조는 저장본과 동일해야 한다 — 교정은 표기만 바꾼다. */
  let structDiff = null;
  for (const [re, name] of PARITY) if (cnt(r.content, re) !== cnt(b.html, re)) { structDiff = name; break; }
  if (structDiff) { rejected.push({ m: r.master_id, why: `STRUCTURE_DIFF_${structDiff}` }); continue; }
  targets.push({
    op: 'UPDATE', rowId: r.id, productMasterId: r.master_id,
    koCanonicalId: k.id, koHash: sha(k.content),
    oldContent: r.content, oldContentHash: sha(r.content),
    newContent: b.html, newContentHash: sha(b.html),
    oldNumAbnormal: cnt(r.content, /[\d%]異常/g),
    newIjou: cnt(b.html, /以上/g), oldIjou: cnt(r.content, /以上/g),
  });
}
clearMemo();

const out = {
  wo: WO, surveyedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  jaWithNumericAbnormal: ja.length,
  jaWithAnyAbnormal: anyAbnormal,
  targets: targets.length,
  productMasterDup: targets.length - new Set(targets.map((t) => t.productMasterId)).size,
  rejected: rejected.length,
  rejectedByWhy: rejected.reduce((a, b) => { a[b.why] = (a[b.why] ?? 0) + 1; return a; }, {}),
  totalNumericAbnormalOccurrences: targets.reduce((a, t) => a + t.oldNumAbnormal, 0),
  sample: targets.slice(0, 5).map((t) => ({
    m: t.productMasterId,
    before: (t.oldContent.match(/.{0,45}[\d%]異常.{0,35}/) ?? [''])[0],
    after: (t.newContent.match(/.{0,45}以上.{0,35}/) ?? [''])[0],
  })),
};
const SUF = process.env.FIX154_OUT_SUFFIX ?? '';
if (SUF && fs.existsSync(`${D}/hff-ja-fix154-targets-v1.json`)) console.error(`[ledger-protect] writing to *${SUF}.json — baseline preserved`);
fs.writeFileSync(`${D}/hff-ja-fix154-survey${SUF || '-v1'}.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${D}/hff-ja-fix154-targets${SUF || '-v1'}.json`, JSON.stringify({ wo: WO, generatedAt: out.surveyedAt, count: targets.length, targets }, null, 1));
console.log(JSON.stringify(out, null, 2));
