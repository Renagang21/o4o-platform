/**
 * WO-...-BATCH-01-HOLD-4209-REPRODUCTION-V1 / 재생산 분류 (read-only).
 *   Track A(33) : 기존 EN 에 기능성 섹션 최소 삽입
 *   Track B(4176): KO HTML 템플릿 전체 슬롯 치환 → 신규 EN
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { lookup, norm, SLOT_RE } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-population-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
// KO canonical 에 남은 손상 조각. 번역 대상이 아니라 KO 측 수정 대상이다.
const DAMAGED = (t) => /[(:：\[]\s*$/.test(t) || /^[*※]\s*\S/.test(t) || /^\(국문\)$|^\(영문\)$/.test(t)
  || /^\s*\(\s*[가나다라마]\s*\)/.test(t) || /[:：]\s*$/.test(t) || t.length < 4
  || /^[A-Za-z][A-Za-z ,.'()\/-]{10,}$/.test(t);
const UNIT = String.raw`mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|L|CFU|%|억|만|천`;
const koNums = (s) => (norm(s).match(new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${UNIT})`, 'g')) ?? [])
  .map((x) => x.replace(/[,\s]/g, '').replace(/억/g, 'E8').replace(/만/g, 'E4').replace(/천/g, 'E3'));
const enNums = (s) => (norm(s).match(new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${UNIT}|hundred million|ten thousand|thousand)`, 'g')) ?? [])
  .map((x) => x.replace(/[,\s]/g, '').replace(/hundredmillion/g, 'E8').replace(/tenthousand/g, 'E4').replace(/thousand/g, 'E3'));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5547', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const ko = new Map(), en = new Map();
const koIds = POP.docs.map((r) => r.koCanonicalId);
for (let i = 0; i < koIds.length; i += 800) for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [koIds.slice(i, i + 800)])).rows) ko.set(r.id, r.content);
const enIds = POP.docs.map((r) => r.enCanonicalId).filter(Boolean);
for (let i = 0; i < enIds.length; i += 800) for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [enIds.slice(i, i + 800)])).rows) en.set(r.id, r.content);
await c.end();

// 번역 대상 슬롯 안에 한국어가 남았는지만 본다.
// 제품명(h1)·제조사명 등 고유명사는 기존 승인 EN canonical 도 한국어를 유지한다.
function hangulInSlots(html) {
  for (const { re } of SLOT_RE) for (const m of html.matchAll(re)) if (HANGUL.test(norm(m[2]))) return true;
  return false;
}
function translate(html) {
  const misses = [];
  let out = html;
  for (const { kind, re } of SLOT_RE) {
    out = out.replace(re, (whole, open, inner, close) => {
      const t = norm(inner);
      if (!t) return whole;
      const r = lookup(kind, inner);
      if (!r) { misses.push({ kind, text: t, why: DAMAGED(t) ? 'KO_DAMAGED' : undefined }); return whole; }
      // 수치 검증: KO 의 단위 수치가 EN 에 **모두 존재**해야 한다(순서·중복은 표현 차이).
      const ka = koNums(inner), eb = new Set(enNums(r.en));
      if (ka.some((x) => !eb.has(x))) { misses.push({ kind, text: t, why: 'NUMBER_DRIFT' }); return whole; }
      return open + esc(r.en) + close;
    });
  }
  return { html: out, misses };
}
const fnSecOf = (s) => (s.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/) ?? [])[0] ?? '';

const results = [], safe = [];
for (const row of POP.docs) {
  const koC = ko.get(row.koCanonicalId) ?? '';
  const base = {
    track: row.track, productMasterId: row.productMasterId, koCanonicalId: row.koCanonicalId,
    enCanonicalId: row.enCanonicalId ?? null, productNameKo: row.productNameKo ?? null, koHash: sha(koC),
  };
  const hold = (status, reason, why, extra = {}) => results.push({ ...base, status, holdReason: reason, why, ...extra });

  if (row.track === 'EXISTING_EN_HOLD') {
    const enC = en.get(row.enCanonicalId) ?? '';
    const fn = fnSecOf(koC);
    if (!fn) { hold('HOLD_SOURCE', 'KO_SOURCE_CONFLICT', 'KO_FN_SECTION_MISSING'); continue; }
    if (/<h2>[^<]*unction[^<]*<\/h2>/.test(enC)) { results.push({ ...base, status: 'RESOLVED_NO_CHANGE', why: 'EN_ALREADY_HAS_FUNCTIONS' }); continue; }
    const t = translate(fn);
    if (t.misses.length) { hold('HOLD_TRANSLATION', t.misses.some((m) => m.why === 'KO_DAMAGED') ? 'HOLD_KO_SOURCE_DAMAGED' : t.misses.some((m) => m.why === 'NUMBER_DRIFT') ? 'HOLD_NUMBER_STRUCTURE_AMBIGUOUS' : 'TRANSLATION_ASSET_MISSING', t.misses.slice(0, 5).map((m) => `${m.kind}:${m.why ?? 'NO_ENTRY'}:${m.text.slice(0, 60)}`), { unresolvedPhrases: t.misses.map((m) => m.text) }); continue; }
    if (hangulInSlots(t.html)) { hold('HOLD_TRANSLATION', 'TRANSLATION_AMBIGUOUS', 'HANGUL_REMAINS'); continue; }
    const h2s = [...enC.matchAll(/<h2>/g)].map((m) => m.index);
    const at = h2s.length >= 2 ? h2s[1] : enC.indexOf('<div class="sd-foot"');
    if (at < 0) { hold('HOLD_STRUCTURE', 'STRUCTURE_UNSAFE', 'NO_INSERT_POINT'); continue; }
    const newContent = enC.slice(0, at) + t.html + enC.slice(at);
    results.push({ ...base, status: 'UPDATED_EXISTING_EN', clauses: (t.html.match(/<li>/g) ?? []).length });
    safe.push({ ...base, op: 'UPDATE', oldContentHash: sha(enC), newContentHash: sha(newContent), newContent });
  } else {
    const t = translate(koC);
    if (t.misses.length) { hold('HOLD_TRANSLATION', t.misses.some((m) => m.why === 'KO_DAMAGED') ? 'HOLD_KO_SOURCE_DAMAGED' : t.misses.some((m) => m.why === 'NUMBER_DRIFT') ? 'HOLD_NUMBER_STRUCTURE_AMBIGUOUS' : 'TRANSLATION_ASSET_MISSING', t.misses.slice(0, 5).map((m) => `${m.kind}:${m.why ?? 'NO_ENTRY'}:${m.text.slice(0, 60)}`), { unresolvedPhrases: [...new Set(t.misses.map((m) => m.text))] }); continue; }
    if (hangulInSlots(t.html)) { hold('HOLD_TRANSLATION', 'TRANSLATION_AMBIGUOUS', 'HANGUL_REMAINS'); continue; }
    // 수치 검증은 슬롯별(번역 쌍 단위)로 이미 수행했다. 문서 전체 비교는 번역 대상이 아닌
    // 영역(sd-spec 등, 원문 그대로 유지)까지 끌어들여 오탐만 만든다 → 중복 검사 제거.
    for (const tag of ['<li>', '<h2>', 'sd-item', 'sd-tag']) {
      if ((t.html.split(tag).length) !== (koC.split(tag).length)) { hold('HOLD_STRUCTURE', 'STRUCTURE_UNSAFE', `SLOT_COUNT_DRIFT:${tag}`); break; }
    }
    if (results.length && results[results.length - 1].koCanonicalId === row.koCanonicalId) continue;
    results.push({ ...base, status: 'CREATED_NEW_EN', clauses: (t.html.match(/<li>/g) ?? []).length });
    safe.push({ ...base, op: 'INSERT', newContentHash: sha(t.html), newContent: t.html });
  }
}

const byStatus = results.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
const byTrack = {};
for (const r of results) ((byTrack[r.track] ??= {})[r.status] = (byTrack[r.track][r.status] ?? 0) + 1);
const checks = {
  total: results.length, sum4209: results.length === 4209, byStatus, byTrack,
  safeTargets: safe.length,
  updates: safe.filter((r) => r.op === 'UPDATE').length,
  inserts: safe.filter((r) => r.op === 'INSERT').length,
  masterDup: safe.length - new Set(safe.map((r) => r.productMasterId)).size,
  koDup: safe.length - new Set(safe.map((r) => r.koCanonicalId)).size,
  clausesTranslated: results.reduce((a, r) => a + (r.clauses ?? 0), 0),
  holdReasons: results.filter((r) => r.status.startsWith('HOLD')).reduce((a, r) => { a[r.holdReason] = (a[r.holdReason] ?? 0) + 1; return a; }, {}),
};
fs.writeFileSync(`${D}/hff-en-batch-01-hold-4209-classification-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0, checks, results }, null, 1));
fs.writeFileSync(`${D}/hff-en-batch-01-hold-4209-safe-targets-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: safe.length, targets: safe }, null, 1));
console.log(JSON.stringify(checks, null, 2));
