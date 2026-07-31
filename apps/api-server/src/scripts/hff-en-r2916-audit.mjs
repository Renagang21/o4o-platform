/**
 * WO-O4O-HFF-EN-BATCH-01-REMAINING-2916-GATE-AUDIT-... / 차단 원인 전수 분해 (read-only).
 *
 * 재실행 전 항상 분포를 다시 산출한다(직전 라운드 교훈).
 *   NO_ENTRY     번역 자산 부족 — 정당
 *   NUMBER_ONLY  수치·단위 불일치 — 번역 결함 또는 정당한 차단
 *   STRUCTURE    슬롯 수 변동
 *   FALSE_GATE   막을 이유가 없는데 막힌 것 (= 게이트 결함)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { lookup, norm, key, SLOT_RE } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-classification-v1.json`, 'utf8'));
const FREQ = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-issue-frequency-v1.json`, 'utf8'));
const CAT = new Map(FREQ.phrases.map((p) => [`${p.kind} ${p.normalizedKoText}`, p.category]));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const HANGUL = /[가-힣]/;
const UNIT = String.raw`mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|L|CFU|%|억|만|천`;
const koNums = (s) => (norm(s).match(new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${UNIT})`, 'g')) ?? [])
  .map((x) => x.replace(/[,\s]/g, '').replace(/억/g, 'E8').replace(/만/g, 'E4').replace(/천/g, 'E3'));
const enNums = (s) => (norm(s).match(new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${UNIT}|hundred million|ten thousand|thousand)`, 'g')) ?? [])
  .map((x) => x.replace(/[,\s]/g, '').replace(/hundredmillion/g, 'E8').replace(/tenthousand/g, 'E4').replace(/thousand/g, 'E3'));

const HOLD = CLS.results.filter((r) => r.status.startsWith('HOLD'));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5523', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const ko = new Map(), en = new Map();
const koIds = HOLD.map((r) => r.koCanonicalId);
for (let i = 0; i < koIds.length; i += 800) for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [koIds.slice(i, i + 800)])).rows) ko.set(r.id, r.content);
const enIds = HOLD.map((r) => r.enCanonicalId).filter(Boolean);
for (let i = 0; i < enIds.length; i += 800) for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [enIds.slice(i, i + 800)])).rows) en.set(r.id, r.content);
await c.end();

const fnSecOf = (s) => (s.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/) ?? [])[0] ?? '';

const reasons = {}, docs = [], phrase = new Map(), numSamples = [], structSamples = [];
const docMiss = new Map();
for (const r of HOLD) {
  const full = ko.get(r.koCanonicalId) ?? '';
  const scope = r.track === 'EXISTING_EN_HOLD' ? fnSecOf(full) : full;
  const miss = new Set(); const nums = []; let noEntry = 0;
  for (const { kind, re } of SLOT_RE) {
    for (const m of scope.matchAll(re)) {
      const t = norm(m[2]);
      if (!t) continue;
      const hit = lookup(kind, m[2]);
      if (!hit) {
        noEntry++;
        const id = `${kind} ${key(t)}`;
        miss.add(id);
        if (!phrase.has(id)) phrase.set(id, { uniquePhraseId: sha(id).slice(0, 16), kind, koText: t, normalizedKoText: key(t), category: CAT.get(id) ?? 'OTHER', documentCount: 0, documentsWithOneMissingPhrase: 0 });
        continue;
      }
      const ka = koNums(m[2]), eb = new Set(enNums(hit.en));
      const bad = ka.filter((x) => !eb.has(x));
      if (bad.length) nums.push({ kind, how: hit.how, ko: t.slice(0, 70), en: hit.en.slice(0, 70), bad });
    }
  }
  docMiss.set(r.koCanonicalId, miss);
  for (const id of miss) phrase.get(id).documentCount++;

  let reason;
  if (noEntry > 0) reason = 'NO_ENTRY';
  else if (nums.length) { reason = 'NUMBER_ONLY'; if (numSamples.length < 12) numSamples.push(nums[0]); }
  else {
    // 자산·수치는 통과. 구조/한글 게이트를 실제로 다시 돌려본다.
    let out = scope;
    for (const { kind, re } of SLOT_RE) out = out.replace(re, (w, o, i2, cl) => { const h = lookup(kind, i2); return h ? o + h.en.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + cl : w; });
    let slotHangul = false;
    for (const { re } of SLOT_RE) for (const m of out.matchAll(re)) if (HANGUL.test(norm(m[2]))) slotHangul = true;
    const structBad = ['<li>', '<h2>', 'sd-item', 'sd-tag'].find((tag) => out.split(tag).length !== scope.split(tag).length);
    if (slotHangul) reason = 'STRUCTURE';
    else if (structBad) { reason = 'STRUCTURE'; if (structSamples.length < 8) structSamples.push({ tag: structBad, ko: r.productNameKo }); }
    else reason = 'FALSE_GATE';
  }
  reasons[reason] = (reasons[reason] ?? 0) + 1;
  docs.push({ ...r, blocker: reason, missingCount: miss.size });
}
for (const [, s] of docMiss) if (s.size === 1) phrase.get([...s][0]).documentsWithOneMissingPhrase++;

const dist = {};
for (const d of docs) { const n = d.missingCount; const b = n === 0 ? '0' : n <= 3 ? String(n) : n <= 5 ? '4-5' : n <= 10 ? '6-10' : '11+'; dist[b] = (dist[b] ?? 0) + 1; }
const target = [...phrase.values()].filter((p) => p.documentCount > 0)
  .sort((a, b) => b.documentsWithOneMissingPhrase - a.documentsWithOneMissingPhrase || b.documentCount - a.documentCount
    || (a.uniquePhraseId < b.uniquePhraseId ? -1 : 1));

const out = {
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  total: HOLD.length, expected: 2916, matches: HOLD.length === 2916,
  blockers: reasons,
  documentsByMissingCount: dist,
  singleMissDocuments: [...docMiss.values()].filter((s) => s.size === 1).length,
  lastMissingPhrases: target.filter((p) => p.documentsWithOneMissingPhrase > 0).length,
  expectedUnlockIfLastPhrasesDone: target.reduce((a, p) => a + p.documentsWithOneMissingPhrase, 0),
  uniquePhrases: target.length,
  byCategory: target.reduce((a, p) => { a[p.category] = (a[p.category] ?? 0) + 1; return a; }, {}),
  numberSamples: numSamples, structureSamples: structSamples,
  phrases: target,
};
fs.writeFileSync(`${D}/hff-en-r2916-audit-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${D}/hff-en-r2916-docs-v1.json`, JSON.stringify({ builtAt: out.builtAt, docs }, null, 1));
console.log(JSON.stringify({ ...out, phrases: undefined, numberSamples: numSamples.slice(0, 6), structureSamples: structSamples.slice(0, 4), top10: target.slice(0, 10).map((p) => ({ c: p.category, d1: p.documentsWithOneMissingPhrase, d: p.documentCount, t: p.koText.slice(0, 50) })) }, null, 2));
