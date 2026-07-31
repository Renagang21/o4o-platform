/**
 * WO-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1 / 번역·구조화·분류 (read-only).
 *   Track A : 기존 EN 에 기능성 섹션만 최소 삽입
 *   Track B : KO HTML 을 템플릿으로 전체 슬롯 치환 → 신규 EN
 * 근거 없는 슬롯이 하나라도 있으면 HOLD.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { lookup, norm, key, SLOT_RE, dictStats } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-population-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5507', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const ko = new Map(), en = new Map();
const koIds = POP.rows.map((r) => r.koCanonicalId);
for (let i = 0; i < koIds.length; i += 800) {
  for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [koIds.slice(i, i + 800)])).rows) ko.set(r.id, r.content);
}
const enIds = POP.rows.filter((r) => r.enCanonicalId).map((r) => r.enCanonicalId);
for (let i = 0; i < enIds.length; i += 800) {
  for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [enIds.slice(i, i + 800)])).rows) en.set(r.id, r.content);
}
await c.end();

const fnSecOf = (content) => {
  const m = content.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/);
  return m ? { heading: m[1], body: m[2], full: m[0] } : null;
};
// 수치 검증은 **단위가 붙은 값**(용량·함량·규격)만 대상으로 한다.
// `1일 1회` → `Once a day` 처럼 횟수가 영어 수사로 바뀌는 것은 정상 번역이며 드리프트가 아니다.
const UNIT = String.raw`mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|L|CFU|%|억|만|천`;
const numsOf = (s) => (norm(s).match(new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${UNIT})`, 'g')) ?? [])
  .map((x) => x.replace(/[,\s]/g, '').replace(/억/g, 'E8').replace(/만/g, 'E4').replace(/천/g, 'E3'));
const enNumsOf = (s) => (norm(s).match(new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${UNIT}|hundred million|ten thousand|thousand)`, 'g')) ?? [])
  .map((x) => x.replace(/[,\s]/g, '').replace(/hundredmillion/g, 'E8').replace(/tenthousand/g, 'E4').replace(/thousand/g, 'E3'));

/** HTML 조각의 텍스트 슬롯을 사전으로 치환. 근거 없는 슬롯이 있으면 null. */
function translateFragment(html, kindsAllowed) {
  const misses = [];
  let out = html;
  for (const { kind, re } of SLOT_RE) {
    if (kindsAllowed && !kindsAllowed.includes(kind)) continue;
    out = out.replace(re, (whole, open, inner, close) => {
      const t = norm(inner);
      if (!t) return whole;
      const r = lookup(kind, inner);
      if (!r) { misses.push({ kind, text: t }); return whole; }
      // 수치·단위는 원문 그대로 유지되어야 한다
      const a = numsOf(inner).join('|'), b = enNumsOf(r.en).join('|');
      if (a !== b) { misses.push({ kind, text: t, why: 'NUMBER_DRIFT', a, b }); return whole; }
      return open + esc(r.en) + close;
    });
  }
  return { html: out, misses };
}

const results = [], safe = [];
for (const row of POP.rows) {
  const koC = ko.get(row.koCanonicalId) ?? '';
  const rec = { ...row, slots: undefined, missing: undefined, missingByKind: undefined };
  const fn = fnSecOf(koC);

  if (row.track === 'A') {
    const enC = en.get(row.enCanonicalId) ?? '';
    if (!fn) { results.push({ ...rec, status: 'HOLD_SOURCE', holdReason: 'OFFICIAL_DATA_INCOMPLETE', why: 'KO_FN_SECTION_MISSING' }); continue; }
    if (/<h2>[^<]*unction[^<]*<\/h2>/.test(enC)) { results.push({ ...rec, status: 'RESOLVED_NO_CHANGE', why: 'EN_ALREADY_HAS_FUNCTIONS' }); continue; }
    const t = translateFragment(fn.full);
    if (t.misses.length) { results.push({ ...rec, status: 'HOLD_TRANSLATION', holdReason: 'TRANSLATION_AMBIGUOUS', why: t.misses.slice(0, 3).map((m) => `${m.kind}:${m.why ?? 'NO_ENTRY'}:${m.text.slice(0, 40)}`) }); continue; }
    if (HANGUL.test(norm(t.html))) { results.push({ ...rec, status: 'HOLD_TRANSLATION', holdReason: 'TRANSLATION_AMBIGUOUS', why: 'HANGUL_REMAINS' }); continue; }
    // 삽입 지점: 두 번째 <h2> 앞(없으면 sd-foot 앞) — 기존 섹션은 건드리지 않는다
    const h2s = [...enC.matchAll(/<h2>/g)].map((m) => m.index);
    const at = h2s.length >= 2 ? h2s[1] : enC.indexOf('<div class="sd-foot"');
    if (at < 0) { results.push({ ...rec, status: 'HOLD_STRUCTURE', holdReason: 'STRUCTURE_UNSAFE', why: 'NO_INSERT_POINT' }); continue; }
    const newContent = enC.slice(0, at) + t.html + enC.slice(at);
    results.push({ ...rec, status: 'UPDATED_EXISTING_EN', clausesTranslated: (t.html.match(/<li>/g) ?? []).length });
    safe.push({ ...rec, op: 'UPDATE', enCanonicalId: row.enCanonicalId, oldContentHash: sha(enC), newContentHash: sha(newContent), newContent, insertedFnSection: true });
  } else {
    const t = translateFragment(koC);
    if (t.misses.length) {
      const kinds = [...new Set(t.misses.map((m) => m.kind))];
      results.push({ ...rec, status: 'HOLD_TRANSLATION', holdReason: t.misses.some((m) => m.why === 'NUMBER_DRIFT') ? 'TRANSLATION_AMBIGUOUS' : 'TRANSLATION_AMBIGUOUS',
        why: t.misses.slice(0, 3).map((m) => `${m.kind}:${m.why ?? 'NO_ENTRY'}:${m.text.slice(0, 40)}`), missingKinds: kinds, missingCount: t.misses.length });
      continue;
    }
    if (HANGUL.test(norm(t.html))) { results.push({ ...rec, status: 'HOLD_TRANSLATION', holdReason: 'TRANSLATION_AMBIGUOUS', why: 'HANGUL_REMAINS' }); continue; }
    const koNums = numsOf(koC).join('|'), enNums = enNumsOf(t.html).join('|');
    if (koNums !== enNums) { results.push({ ...rec, status: 'HOLD_TRANSLATION', holdReason: 'TRANSLATION_AMBIGUOUS', why: 'DOC_NUMBER_DRIFT' }); continue; }
    if ((t.html.match(/<li>/g) ?? []).length !== (koC.match(/<li>/g) ?? []).length
      || (t.html.match(/<h2>/g) ?? []).length !== (koC.match(/<h2>/g) ?? []).length) {
      results.push({ ...rec, status: 'HOLD_STRUCTURE', holdReason: 'STRUCTURE_UNSAFE', why: 'SLOT_COUNT_DRIFT' }); continue;
    }
    results.push({ ...rec, status: 'CREATED_NEW_EN', clausesTranslated: (t.html.match(/<li>/g) ?? []).length });
    safe.push({ ...rec, op: 'INSERT', masterId: row.masterId, koCanonicalId: row.koCanonicalId, newContentHash: sha(t.html), newContent: t.html });
  }
}

const byStatus = results.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
const byTrackStatus = {};
for (const r of results) ((byTrackStatus[r.track] ??= {})[r.status] = (byTrackStatus[r.track][r.status] ?? 0) + 1);
const holdKinds = {};
for (const r of results) if (r.missingKinds) for (const k of r.missingKinds) holdKinds[k] = (holdKinds[k] ?? 0) + 1;

const checks = {
  total: results.length, sum5000: results.length === 5000,
  byStatus, byTrackStatus, holdMissingKinds: holdKinds,
  safeTargets: safe.length,
  updates: safe.filter((r) => r.op === 'UPDATE').length,
  inserts: safe.filter((r) => r.op === 'INSERT').length,
  enDup: safe.filter((r) => r.op === 'UPDATE').length - new Set(safe.filter((r) => r.op === 'UPDATE').map((r) => r.enCanonicalId)).size,
  masterDup: safe.length - new Set(safe.map((r) => r.masterId ?? r.koCanonicalId)).size,
  clausesTranslated: results.reduce((a, r) => a + (r.clausesTranslated ?? 0), 0),
  dictStats: dictStats(),
};
fs.writeFileSync(`${D}/hff-en-batch-01-classification-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0, checks, results }, null, 1));
fs.writeFileSync(`${D}/hff-en-batch-01-safe-targets-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: safe.length, targets: safe }, null, 1));
console.log(JSON.stringify(checks, null, 2));
