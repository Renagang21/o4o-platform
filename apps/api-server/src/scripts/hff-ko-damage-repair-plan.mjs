/**
 * WO-O4O-HFF-KO-CANONICAL-DAMAGE-REPAIR-812-V1 / 손상 조각 수정안 생성 (read-only).
 *
 * KO canonical 에 남은 **파싱 잔재**만 정리한다. 공식 기능성 내용은 건드리지 않는다.
 *   1) TRAILING_OPEN_PAREN  `… 필요 (`      → 끝의 여는 괄호 제거  (원문 `(1)(2)` 분할 잔재)
 *   2) MARKER_ONLY          `(국문)` `일일섭취량` → 해당 <li> 제거 (정보 아님)
 *   3) ENGLISH_ONLY         `May help to …`  → 해당 <li> 제거 (KO 문서의 영문 잔재)
 *   4) EMBEDDED_MARKER      `…있음 ②…`       → 원문 대조 없이는 분할 불가 → HOLD
 * 절이 0 이 되는 섹션이 생기면 그 문서는 HOLD 한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const norm = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const LI = /<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g;

const isMarkerOnly = (t) => /^\(국문\)$|^\(영문\)$|^일일섭취량$/.test(t);
const isEnglish = (t) => /^[A-Za-z][A-Za-z ,.'()\/-]{12,}$/.test(t);
const hasOpenParen = (t) => /\s*\($/.test(t);
const hasEmbedded = (t) => /[②-⑮]/.test(t);

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5543', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const rows = (await c.query(`SELECT id, master_id, content FROM shared_product_descriptions
  WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
    AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated'`)).rows;
const globals = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon`)).rows[0];
await c.end();

const plan = [], holds = [];
const stat = { openParen: 0, markerOnly: 0, english: 0, embedded: 0 };
for (const r of rows) {
  const lis = [...r.content.matchAll(LI)].map((m) => ({ whole: m[0], inner: m[1], text: norm(m[1]) }));
  const touched = lis.filter((x) => hasOpenParen(x.text) || isMarkerOnly(x.text) || isEnglish(x.text) || hasEmbedded(x.text));
  if (!touched.length) continue;

  if (touched.some((x) => hasEmbedded(x.text))) {
    holds.push({ canonicalId: r.id, productMasterId: r.master_id, reason: 'EMBEDDED_MARKER_NEEDS_SOURCE',
      samples: touched.filter((x) => hasEmbedded(x.text)).map((x) => x.text.slice(0, 60)).slice(0, 3) });
    continue;
  }

  let out = r.content;
  const ops = [];
  for (const x of touched) {
    if (isMarkerOnly(x.text) || isEnglish(x.text)) {
      out = out.replace(x.whole, '');
      ops.push({ op: 'REMOVE_LI', kind: isMarkerOnly(x.text) ? 'MARKER_ONLY' : 'ENGLISH', text: x.text.slice(0, 60) });
      if (isMarkerOnly(x.text)) stat.markerOnly++; else stat.english++;
    } else if (hasOpenParen(x.text)) {
      const fixedInner = x.inner.replace(/\s*\(\s*$/, '');
      out = out.replace(x.whole, `<li>${fixedInner}</li>`);
      ops.push({ op: 'TRIM_OPEN_PAREN', text: x.text.slice(0, 60) });
      stat.openParen++;
    }
  }
  if (out === r.content) continue;

  // 안전 게이트 — 절이 0 이 되는 목록이 생기면 수정하지 않는다
  const emptyList = /<ul[^>]*>\s*<\/ul>|<div class="sd-item">\s*(?:<span class="sd-tag">[\s\S]*?<\/span>)?\s*<ul>\s*<\/ul>\s*<\/div>/.test(out);
  const liBefore = (r.content.match(/<li>/g) ?? []).length;
  const liAfter = (out.match(/<li>/g) ?? []).length;
  const removed = ops.filter((o) => o.op === 'REMOVE_LI').length;
  if (emptyList || liBefore - liAfter !== removed) {
    holds.push({ canonicalId: r.id, productMasterId: r.master_id, reason: emptyList ? 'WOULD_EMPTY_LIST' : 'LI_COUNT_MISMATCH' });
    continue;
  }
  // 공식 기능성 절이 통째로 사라지지 않았는지 (남은 절이 있어야 한다)
  if (liAfter === 0) { holds.push({ canonicalId: r.id, productMasterId: r.master_id, reason: 'NO_CLAUSE_LEFT' }); continue; }

  plan.push({ canonicalId: r.id, productMasterId: r.master_id,
    oldContentHash: sha(r.content), newContentHash: sha(out), newContent: out, ops });
}

const checks = {
  scannedKoCanonicals: rows.length,
  planned: plan.length, holds: holds.length,
  opStats: stat,
  holdReasons: holds.reduce((a, r) => { a[r.reason] = (a[r.reason] ?? 0) + 1; return a; }, {}),
  canonicalDup: plan.length - new Set(plan.map((r) => r.canonicalId)).size,
  globals,
};
fs.writeFileSync(`${D}/hff-ko-damage-repair-plan-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0, checks, plan }, null, 1));
fs.writeFileSync(`${D}/hff-ko-damage-repair-hold-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: holds.length, holds }, null, 1));
fs.writeFileSync(`${D}/hff-ko-damage-repair-rollback-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: plan.length,
  rollback: plan.map((p) => ({ canonicalId: p.canonicalId, productMasterId: p.productMasterId, oldContentHash: p.oldContentHash, newContentHash: p.newContentHash, ops: p.ops })) }, null, 1));
console.log(JSON.stringify(checks, null, 2));
