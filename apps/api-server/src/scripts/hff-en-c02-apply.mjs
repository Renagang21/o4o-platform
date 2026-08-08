/**
 * WO-O4O-HFF-EN-C02-IN-STORE-EXPERT-GUIDANCE-25404-FULL-REPAIR-V1 §5·§7·§8
 *
 * 전문가 안내 고정 문장을 영어로 교정. **UPDATE 전용**, 대상은 survey 가 확정한 문서뿐이다.
 *   - 이중 게이트: `--apply` + HFF_EN_C02_APPLY_CONFIRM=YES
 *   - 낙관적 잠금: 저장된 EN 본문 해시가 survey 시점과 같을 때만 갱신
 *   - `sd-cta` 안의 문장 **하나만** 바꾼다. 다른 영역은 손대지 않는다(§6).
 *   - KO·ZH·JA·ProductMaster 는 쓰지 않는다. INSERT 0.
 *
 * 영어 문장(§5):
 *   KO  섭취 방법이나 본인 상태에 맞는지 궁금하시면 매장 내 약사 등 전문가에게 문의하십시오.
 *   EN  If you have questions about how to take this product or whether it is right for you,
 *       please ask our in-store pharmacist or another expert.
 *   — 의미 3요소(섭취 방법 / 본인에게 맞는지 / 매장 전문가에게 문의)를 모두 보존한다.
 *   — 진단·치료를 확정한다는 의미를 넣지 않는다. 짧은 매장 안내 어투를 유지한다.
 *   — 코퍼스 문체(영국식 철자)와 충돌하는 어휘가 없다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C02-IN-STORE-EXPERT-GUIDANCE-25404-FULL-REPAIR-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');

const KO_FIXED = '섭취 방법이나 본인 상태에 맞는지 궁금하시면 매장 내 약사 등 전문가에게 문의하십시오.';
const EN_FIXED = 'If you have questions about how to take this product or whether it is right for you, please ask our in-store pharmacist or another expert.';

const targets = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c02-targets.json`, 'utf8'));
if (!targets.length) { console.error('NO_TARGETS'); process.exit(1); }

const APPLY = process.argv.includes('--apply') && process.env.HFF_EN_C02_APPLY_CONFIRM === 'YES';
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5551', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
const globals = async () => (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='ja' AND source_type='o4o_hff_generated') ja_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='zh' AND source_type='o4o_hff_generated') zh_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];
const before = await globals();

const ids = targets.map((t) => t.enId);
const cur = new Map();
for (let i = 0; i < ids.length; i += 3000) {
  for (const r of (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids.slice(i, i + 3000)])).rows) cur.set(r.id, r.content);
}

const cnt = (h, re) => (h.match(re) ?? []).length;
const PARITY = [[/<li[ >]/g, 'li'], [/<h2[ >]/g, 'h2'], [/sd-item/g, 'sd-item'], [/sd-tag/g, 'sd-tag'], [/<b>/g, 'b'], [/<ul[ >]/g, 'ul'], [/<p[ >]/g, 'p'], [/sd-cta/g, 'sd-cta'], [/<div[ >]/g, 'div']];

const ready = [], rejected = [];
const diff = { missing: 0, enDrift: 0, sliceMismatch: 0, structureDiff: 0, ctaHangulLeft: 0, emptyCta: 0, duplicateSentence: 0, otherAreaChanged: 0 };
for (const t of targets) {
  const old = cur.get(t.enId);
  if (old === undefined) { diff.missing++; rejected.push({ m: t.productMasterId, why: 'MISSING' }); continue; }
  if (sha(old) !== t.enHash) { diff.enDrift++; rejected.push({ m: t.productMasterId, why: 'EN_DRIFT' }); continue; }
  /* 뒤에서부터 오프셋 치환 — 앞 오프셋 밀림 방지 */
  let next = old, bad = false;
  for (const h of [...t.hits].sort((a, b) => b.start - a.start)) {
    if (old.slice(h.start, h.end) !== h.inner) { bad = true; break; }
    next = next.slice(0, h.start) + EN_FIXED + next.slice(h.end);
  }
  if (bad) { diff.sliceMismatch++; rejected.push({ m: t.productMasterId, why: 'SLICE_MISMATCH' }); continue; }
  /* §7 검증 */
  let sd = false;
  for (const [re] of PARITY) if (cnt(old, re) !== cnt(next, re)) sd = true;
  if (sd) { diff.structureDiff++; rejected.push({ m: t.productMasterId, why: 'STRUCTURE_DIFF' }); continue; }
  const ctaNew = (next.match(/<div class="sd-cta"[^>]*>\s*<p>([\s\S]*?)<\/p>/) ?? [])[1] ?? '';
  if (/[가-힣]/.test(ctaNew)) { diff.ctaHangulLeft++; rejected.push({ m: t.productMasterId, why: 'CTA_HANGUL_LEFT' }); continue; }
  if (!ctaNew.trim()) { diff.emptyCta++; rejected.push({ m: t.productMasterId, why: 'EMPTY_CTA' }); continue; }
  if (cnt(next, new RegExp(EN_FIXED.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) !== t.hits.length) { diff.duplicateSentence++; rejected.push({ m: t.productMasterId, why: 'DUPLICATE_SENTENCE' }); continue; }
  /* 대상 밖 영역 불변 — CTA 구간을 제외한 나머지가 동일해야 한다 */
  const strip = (s) => s.replace(/<div class="sd-cta"[^>]*>\s*<p>[\s\S]*?<\/p>/g, '<CTA/>');
  if (strip(old) !== strip(next)) { diff.otherAreaChanged++; rejected.push({ m: t.productMasterId, why: 'OTHER_AREA_CHANGED' }); continue; }
  ready.push({ enId: t.enId, m: t.productMasterId, old, next, oldHash: t.enHash });
}

fs.writeFileSync(`${D}/hff-en-c02-rollback-v1.json`, JSON.stringify({
  wo: WO, preparedAt: new Date().toISOString(),
  rollback: 'UPDATE 전용. 되돌리기는 sd-cta 문장을 KO 원문으로 되돌리는 것이다.',
  koFixed: KO_FIXED, enFixed: EN_FIXED, before,
  rows: ready.map((r) => ({ enId: r.enId, productMasterId: r.m, oldHash: r.oldHash })),
}, null, 1));

const head = { wo: WO, at: new Date().toISOString(), koFixed: KO_FIXED, enFixed: EN_FIXED,
  targets: targets.length, ready: ready.length, rejected: rejected.length, rejectedByWhy: diff, before };
if (!APPLY) {
  fs.writeFileSync(`${D}/hff-en-c02-apply-result-v1.json`, JSON.stringify({ ...head, mode: 'DRY_RUN' }, null, 1));
  fs.writeFileSync(`${CACHE}/hff-en-c02-render-input.jsonl`, ready.slice(0, 600).map((r) => JSON.stringify({ m: r.m, p: '', h: r.next, lic: [] })).join('\n') + '\n');
  console.log(JSON.stringify({ ...head, mode: 'DRY_RUN', rejectedSample: rejected.slice(0, 6) }, null, 2));
  await c.end(); process.exit(0);
}

const startedAt = new Date().toISOString();
const updated = [], skipped = [], failed = [];
for (let i = 0; i < ready.length; i += 500) {
  const chunk = ready.slice(i, i + 500);
  try {
    await c.query('BEGIN');
    for (const r of chunk) {
      const q = await c.query(`
        UPDATE shared_product_descriptions SET content=$1, updated_at=now()
         WHERE id=$2 AND language='en' AND description_type='STORE' AND status='canonical'
           AND source_type='o4o_hff_generated' AND deleted_at IS NULL
           AND encode(sha256(convert_to(content,'UTF8')),'hex') = $3 RETURNING id`,
      [r.next, r.enId, r.oldHash]);
      if (q.rowCount === 1) updated.push(r.enId); else skipped.push({ m: r.m, why: 'CONTENT_DRIFT' });
    }
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); failed.push({ shard: i, error: String(e.message ?? e) }); }
}
const after = await globals();
const out = {
  ...head, startedAt, appliedAt: new Date().toISOString(), mode: 'APPLY',
  expectedUpdate: ready.length, actualUpdate: updated.length,
  expectedInsert: 0, actualInsert: after.en_canon - before.en_canon,
  skipped: skipped.length, failedShards: failed.length, after,
  koUnchanged: before.ko_canon === after.ko_canon, jaUnchanged: before.ja_canon === after.ja_canon,
  zhUnchanged: before.zh_canon === after.zh_canon, pmUnchanged: before.pm_hff === after.pm_hff,
  enCountUnchanged: before.en_canon === after.en_canon,
  expectedEqualsActual: updated.length === ready.length && !skipped.length && !failed.length && before.en_canon === after.en_canon,
};
fs.writeFileSync(`${D}/hff-en-c02-apply-result-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
await c.end();
