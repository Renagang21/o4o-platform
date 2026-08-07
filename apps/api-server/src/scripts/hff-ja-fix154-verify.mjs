/**
 * WO-O4O-HFF-JA-NUMERIC-IZYOU-MISTRANSLATION-154-CORRECTION-V1 §5 독립검증
 *
 * apply 산출물을 신뢰하지 않고 **DB 현재 상태만** 읽어 재계산한다. read-only.
 *   - 수치 문맥 異常 오역 잔여 (교정 대상 안 / 밖 각각)
 *   - 교정 대상 밖 JA write 0 (작업 구간 중 갱신된 JA 행이 대상뿐인지)
 *   - KO hash drift 0 / EN·ZH·ProductMaster 변경 0 / canonicalDup 0
 *   - 수치·단위 drift 0 / 슬롯 한국어·간체자 0
 *   - 기존 JA 전체에 대한 새 선행 가드 회귀: 생산 가능성 악화 0 · 구조 차이 0
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { build, parityBreak, PARITY } from './hff-ja-b01-build.mjs';
import { clearMemo, SIMPLIFIED_ONLY, KEEP_PROPER } from './hff-ja-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-JA-NUMERIC-IZYOU-MISTRANSLATION-154-CORRECTION-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const APPLIED = JSON.parse(fs.readFileSync(`${D}/hff-ja-fix154-apply-result-v1.json`, 'utf8'));
const TARGETS = JSON.parse(fs.readFileSync(`${D}/hff-ja-fix154-targets-v1.json`, 'utf8')).targets;
const byId = new Map(TARGETS.map((t) => [t.rowId, t]));
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5481', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

/* 1. 교정된 행을 다시 읽어 대조 */
const rows = (await c.query(`
  SELECT id, master_id, language, status, description_type, source_type, content
    FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [APPLIED.updatedIds ?? []])).rows;
let contract = 0, contentMismatch = 0, abnormalLeft = 0, hangulDoc = 0, simplifiedDoc = 0, notInTargets = 0;
const samples = [];
for (const r of rows) {
  if (!(r.language === 'ja' && r.status === 'canonical' && r.description_type === 'STORE' && r.source_type === 'o4o_hff_generated')) contract++;
  const t = byId.get(r.id);
  if (!t) { notInTargets++; continue; }
  if (r.content !== t.newContent) { contentMismatch++; if (samples.length < 5) samples.push({ m: r.master_id, why: 'CONTENT_MISMATCH' }); continue; }
  if (/[\d%]異常/.test(r.content)) { abnormalLeft++; if (samples.length < 8) samples.push({ m: r.master_id, why: 'ABNORMAL_LEFT' }); }
  const rest = r.content.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ').replace(KEEP_PROPER, ' ');
  if (HANGUL.test(rest)) { hangulDoc++; if (samples.length < 10) samples.push({ m: r.master_id, why: 'HANGUL' }); }
  if (SIMPLIFIED_ONLY.test(rest)) { simplifiedDoc++; }
}

/* 2. 수치 문맥 異常 오역 전체 잔여 — 대상 안 / 밖 */
const leftAll = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND language='ja' AND description_type='STORE'
     AND status='canonical' AND source_type='o4o_hff_generated'
     AND content ~ '[0-9%]異常'`)).rows[0].n;
const leftInTargets = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE id = ANY($1::uuid[]) AND content ~ '[0-9%]異常'`, [APPLIED.updatedIds ?? []])).rows[0].n;

/* 3. 대상 밖 JA write 0 — 작업 구간에 갱신된 JA 행이 대상뿐인가 */
const outside = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND language='ja' AND description_type='STORE'
     AND status='canonical' AND source_type='o4o_hff_generated'
     AND updated_at >= $1 AND NOT (id = ANY($2::uuid[]))`,
[APPLIED.startedAt, APPLIED.updatedIds ?? []])).rows[0].n;

/* 4. KO hash drift · 전역 수치 */
const koDrift = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions k
   JOIN unnest($1::uuid[], $2::text[]) AS x(id, h) ON x.id = k.id
  WHERE encode(sha256(convert_to(k.content,'UTF8')),'hex') <> x.h`,
[TARGETS.map((t) => t.koCanonicalId), TARGETS.map((t) => t.koHash)])).rows[0].n;
const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='zh' AND source_type='o4o_hff_generated') zh_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='ja' AND source_type='o4o_hff_generated') ja_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];
const dup = (await c.query(`
  SELECT count(*)::int n FROM (
    SELECT master_id FROM shared_product_descriptions
     WHERE deleted_at IS NULL AND language='ja' AND description_type='STORE'
       AND status='canonical' AND source_type='o4o_hff_generated'
     GROUP BY master_id HAVING count(*) > 1) z`)).rows[0].n;

/* 5. 새 선행 가드 회귀 — 저장된 JA 전량을 KO 에서 다시 build 해 생산 가능성·구조 확인 */
const REG = ['hff-ja-b01-safe-targets-v1.json', 'hff-ja-b02-safe-targets-v1.json', 'hff-ja-b03-safe-targets-v1.json', 'hff-ja-b04-safe-targets-v1.json']
  .flatMap((f) => (fs.existsSync(`${D}/${f}`) ? JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8')).targets : []));
const regMasters = REG.map((t) => t.productMasterId);
const koRows = [];
const SH = 5000;
for (let i = 0; i < regMasters.length; i += SH) {
  const rs = (await c.query(`
    SELECT master_id, content FROM shared_product_descriptions
     WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND coalesce(language,'ko')='ko'
       AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`,
  [regMasters.slice(i, i + SH)])).rows;
  koRows.push(...rs);
}
await c.end();

const cntRe = (h, re) => (h.match(re) ?? []).length;
const expectStruct = new Map(REG.map((t) => [t.productMasterId, t.newContent]));
let regNotProducible = 0, regStructureDiff = 0, regParity = 0;
for (const r of koRows) {
  const b = build(r.content);
  if (b.misses.length || b.hangul || b.simplified) { regNotProducible++; continue; }
  if (parityBreak(r.content, b.html)) { regParity++; continue; }
  const prev = expectStruct.get(r.master_id);
  if (!prev) continue;
  for (const [re, name] of PARITY) if (cntRe(prev, re) !== cntRe(b.html, re)) { regStructureDiff++; break; }
}
clearMemo();

const out = {
  wo: WO, verifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  updatedRowsFound: rows.length, expectedUpdate: TARGETS.length,
  contractViolations: contract, contentMismatch, notInTargets,
  numericAbnormalLeftInTargets: leftInTargets,
  numericAbnormalLeftOverall: leftAll,
  hangulInSlots: hangulDoc, simplifiedInSlots: simplifiedDoc,
  writesOutsideTargets: outside,
  koHashDrift: koDrift,
  koUnchanged: g.ko_canon === APPLIED.before.ko_canon,
  enUnchanged: g.en_canon === APPLIED.before.en_canon,
  zhUnchanged: g.zh_canon === APPLIED.before.zh_canon,
  pmUnchanged: g.pm_hff === APPLIED.before.pm_hff,
  jaCanonNow: g.ja_canon, jaCountUnchanged: g.ja_canon === APPLIED.before.ja_canon,
  canonicalDup: dup,
  regression: { scope: 'b01+b02+b03+b04 stored JA', documents: koRows.length, notProducible: regNotProducible, structureDiff: regStructureDiff, parityBroken: regParity },
  samples,
};
out.verdict = (rows.length === TARGETS.length && !contract && !contentMismatch && !notInTargets
  && !leftInTargets && !hangulDoc && !simplifiedDoc && !outside && !koDrift
  && out.koUnchanged && out.enUnchanged && out.zhUnchanged && out.pmUnchanged && out.jaCountUnchanged
  && !dup && !regNotProducible && !regStructureDiff && !regParity) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-ja-fix154-verify-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
