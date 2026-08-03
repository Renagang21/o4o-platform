/**
 * WO-O4O-HFF-EN-INTEGRATED-ISSUE-QUEUE-663-FULL-CLEANUP-V1  §2
 *
 * 통합 문제 큐 663건 모집단 재현 (read-only).
 *   - 큐 원본은 수정하지 않는다.
 *   - 큐가 기록한 과거 판정을 그대로 믿지 않고, 현재 DB · 현재 사전으로 문제를 재현한다.
 *   - 큐의 koCanonicalId 가 비어 있는 행은 masterId 로 현재 KO canonical 을 찾는다.
 *
 * 산출: data/hff-en-q663-population-v1.json
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { lookup, norm, SLOT_RE } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const QUEUE = `${D}/hff-en-deferred-issue-queue-through-batch05-v1.jsonl`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

/* batch05 classify 와 동일한 판정식. 재현 목적이므로 한 글자도 바꾸지 않는다. */
const DAMAGED = (t) => /[(:：[]\s*$/.test(t) || /^[*※]\s*\S/.test(t) || /^\(국문\)$|^\(영문\)$/.test(t)
  || /^\s*\(\s*[가나다라마]\s*\)/.test(t) || /[:：]\s*$/.test(t) || t.length < 4
  || /^[A-Za-z][A-Za-z ,.'()/-]{10,}$/.test(t)
  || /^(null|undefined|NaN)$/i.test(t);
const UNIT = String.raw`mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|%|억|만|천`;
const canonUnit = (x) => x.replace(/[,\s]/g, '')
  .replace(/㎎/g, 'mg').replace(/㎍|μg|mcg/g, 'ug').replace(/㎖/g, 'ml')
  .replace(/억/g, 'E8').replace(/만/g, 'E4').replace(/천/g, 'E3')
  .replace(/hundredmillion/gi, 'E8').replace(/tenthousand/gi, 'E4').replace(/thousand/gi, 'E3')
  .toLowerCase();
const koNums = (s) => (norm(s).match(new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${UNIT})`, 'g')) ?? []).map(canonUnit);
const enNums = (s) => (norm(s).match(new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${UNIT}|hundred million|ten thousand|thousand)`, 'g')) ?? []).map(canonUnit);

/* 손상 유형 표준 분류 (§5-1). DAMAGED 가 참인 이유를 구체적으로 나눈다. */
function damageKind(t) {
  if (/^(null|undefined|NaN)$/i.test(t)) return 'SERIALIZATION_LITERAL';
  if (/^\(국문\)$|^\(영문\)$/.test(t)) return 'LANG_MARKER_ONLY';
  if (/^\(국문\)|^\(영문\)/.test(t)) return 'LANG_MARKER_PREFIX';
  if (/[(:：[]\s*$/.test(t) || /[:：]\s*$/.test(t)) return 'TRAILING_LABEL_SEPARATOR';
  if (/^[*※]\s*\S/.test(t)) return 'LEADING_MARKER';
  if (/^\s*\(\s*[가나다라마]\s*\)/.test(t)) return 'ENUM_MARKER_PREFIX';
  if (/^[A-Za-z][A-Za-z ,.'()/-]{10,}$/.test(t)) return 'ALREADY_ENGLISH';
  if (t.length < 4) return 'TOO_SHORT';
  return 'OTHER';
}

function classifyRow(koHtml) {
  const misses = [];
  let out = koHtml;
  for (const { kind, re } of SLOT_RE) {
    out = out.replace(re, (whole, open, inner, close) => {
      const t = norm(inner);
      if (!t) return whole;
      const r = lookup(kind, inner);
      if (!r) {
        misses.push({ kind, text: t, why: DAMAGED(t) ? 'KO_DAMAGED' : 'NO_ENTRY', damageKind: DAMAGED(t) ? damageKind(t) : null });
        return whole;
      }
      const ka = koNums(inner), eb = new Set(enNums(r.en));
      const lost = ka.filter((x) => !eb.has(x));
      if (lost.length) { misses.push({ kind, text: t, why: 'NUMBER_DRIFT', lost, en: r.en, how: r.how }); return whole; }
      return open + r.en + close;
    });
  }
  let hangul = false;
  for (const { re } of SLOT_RE) for (const m of out.matchAll(re)) if (HANGUL.test(norm(m[2]))) hangul = true;
  return { misses, hangul, html: out };
}

/* ── 큐 적재 ─────────────────────────────────────────────────── */
const rows = fs.readFileSync(QUEUE, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const inputTally = rows.reduce((a, r) => { a[r.issueType] = (a[r.issueType] ?? 0) + 1; return a; }, {});

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

/* KO / EN canonical 을 master 기준으로 현재 상태에서 다시 읽는다. */
const koByMaster = new Map(), enByMaster = new Map();
const mIds = rows.map((r) => r.productMasterId);
for (let i = 0; i < mIds.length; i += 500) {
  const q = await c.query(`
    SELECT master_id, id, content, coalesce(language,'ko') lang
      FROM shared_product_descriptions
     WHERE master_id = ANY($1) AND deleted_at IS NULL
       AND source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'`,
  [mIds.slice(i, i + 500)]);
  for (const r of q.rows) (r.lang === 'en' ? enByMaster : koByMaster).set(r.master_id, r);
}
/* 공식 원천 (기능성·섭취방법) — KO 손상 판정의 근거로 쓴다. */
const src = new Map();
for (let i = 0; i < mIds.length; i += 500) {
  const q = await c.query(`
    SELECT pc.matched_product_master_id mid,
           pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn,
           pc.raw_payload::jsonb->'source'->>'SRV_USE' srv,
           pc.raw_payload::jsonb->'source'->>'INTAKE_HINT1' hint,
           pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt
      FROM product_candidates pc
     WHERE pc.matched_product_master_id = ANY($1)
       AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL`,
  [mIds.slice(i, i + 500)]);
  for (const r of q.rows) src.set(r.mid, r);
}
await c.end();

const out = [];
for (const q of rows) {
  const ko = koByMaster.get(q.productMasterId);
  const en = enByMaster.get(q.productMasterId);
  const base = {
    batch: q.batch, issueType: q.issueType,
    productMasterId: q.productMasterId, productName: q.productName,
    queuedKoCanonicalId: q.koCanonicalId ?? null,
    koCanonicalId: ko?.id ?? null, koHash: ko ? sha(ko.content) : null,
    enCanonicalId: en?.id ?? null,
    officialStatementNo: src.get(q.productMasterId)?.stmt ?? null,
  };
  if (!ko) { out.push({ ...base, state: 'KO_MISSING', misses: [] }); continue; }
  if (en) { out.push({ ...base, state: 'EN_ALREADY_EXISTS', misses: [] }); continue; }
  const r = classifyRow(ko.content);
  const state = r.misses.length ? 'BLOCKED' : r.hangul ? 'HANGUL_REMAINS' : 'NOW_PRODUCIBLE';
  const observed = !r.misses.length ? (r.hangul ? 'TRANSLATION_AMBIGUOUS' : null)
    : r.misses.some((m) => m.why === 'KO_DAMAGED') ? 'KO_SOURCE_DAMAGED'
      : r.misses.some((m) => m.why === 'NUMBER_DRIFT') ? 'NUMBER_STRUCTURE_AMBIGUOUS'
        : 'PENDING_DIRECT_TRANSLATION';
  out.push({ ...base, state, observedIssueType: observed, misses: r.misses });
}

const tally = (a, f) => a.reduce((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const allMiss = out.flatMap((r) => r.misses.map((m) => ({ ...m, productMasterId: r.productMasterId })));
const phraseKey = (m) => `${m.kind}${m.text}`;
const byPhrase = new Map();
for (const m of allMiss) {
  const k = phraseKey(m);
  const e = byPhrase.get(k) ?? { kind: m.kind, text: m.text, why: new Set(), damageKind: new Set(), rows: 0, lost: new Set(), curEn: m.en ?? null, how: m.how ?? null };
  e.why.add(m.why); if (m.damageKind) e.damageKind.add(m.damageKind);
  for (const l of m.lost ?? []) e.lost.add(l);
  if (m.en) { e.curEn = m.en; e.how = m.how; }
  e.rows++; byPhrase.set(k, e);
}
const phrases = [...byPhrase.values()].map((e) => ({ ...e, why: [...e.why], damageKind: [...e.damageKind], lost: [...e.lost] }))
  .sort((a, b) => b.rows - a.rows);

const summary = {
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  wo: 'WO-O4O-HFF-EN-INTEGRATED-ISSUE-QUEUE-663-FULL-CLEANUP-V1',
  queueRows: rows.length,
  queueIssueTypeTally: inputTally,
  reproduced: rows.length === 663 && inputTally.KO_SOURCE_DAMAGED === 369
    && inputTally.NUMBER_STRUCTURE_AMBIGUOUS === 289 && inputTally.TRANSLATION_AMBIGUOUS === 5,
  duplicates: {
    productMaster: rows.length - new Set(rows.map((r) => r.productMasterId)).size,
    koCanonical: (() => { const v = out.map((r) => r.koCanonicalId).filter(Boolean); return v.length - new Set(v).size; })(),
  },
  byState: tally(out, (r) => r.state),
  byObserved: tally(out.filter((r) => r.observedIssueType), (r) => r.observedIssueType),
  queueVsObserved: tally(out, (r) => `${r.issueType} -> ${r.observedIssueType ?? r.state}`),
  missTotal: allMiss.length,
  missByWhy: tally(allMiss, (m) => m.why),
  missByDamageKind: tally(allMiss.filter((m) => m.damageKind), (m) => m.damageKind),
  distinctBlockingPhrases: phrases.length,
  distinctByWhy: tally(phrases, (p) => p.why.join('+')),
};
fs.writeFileSync(`${D}/hff-en-q663-population-v1.json`, JSON.stringify({ ...summary, rows: out }, null, 1));
fs.writeFileSync(`${D}/hff-en-q663-blocking-phrases-v1.json`, JSON.stringify({ builtAt: summary.builtAt, count: phrases.length, phrases }, null, 1));
console.log(JSON.stringify(summary, null, 2));
