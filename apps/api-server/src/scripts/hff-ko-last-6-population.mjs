/**
 * WO-O4O-HFF-KO-LAST-6-AUTHORITY-DECISION-AND-CLOSURE-V1 / 모집단 재현 + 사람 판정용 전량 덤프 (read-only).
 * 6건은 자동 판정 대상이 아니므로 원문·현재 canonical·정상 sibling 을 모두 펼쳐 사람이 직접 본다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const QUEUE = `${D}/hff-ko-final-manual-unresolved-v1.jsonl`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const dense = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/[･·∙‧・]/g, '·').replace(/[\s　 ]/g, '').trim();
const leafLis = (h) => [...(h ?? '').matchAll(/<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g)]
  .map((x) => x[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
const fnOf = (c) => (c.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/) ?? [])[0] ?? '';
const familyOf = (b) => /class="sd-fn"/.test(b ?? '') ? 'fn'
  : /class="sd-core"|class="sd-item"|class="sd-tag"/.test(b ?? '') ? 'core'
  : /class="sd-func"|class="sd-why"/.test(b ?? '') ? 'why' : 'none';

const rows = fs.readFileSync(QUEUE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5503', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const cand = new Map();
for (const r of (await c.query(`
  SELECT id, deleted_at, matched_product_master_id,
    raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
    raw_payload::jsonb->'source'->>'PRDUCT' name,
    raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn,
    raw_payload::jsonb->'source'->>'SRV_USE' srv,
    raw_payload::jsonb->'source'->>'RAWMTRL_NM' rawm,
    raw_payload::jsonb->'source'->>'PRIMARY_FNCLTY' pf,
    raw_payload::jsonb->'source'->>'ENTRPS' entrps,
    raw_payload::jsonb->'source'->>'BASE_STANDARD' base
  FROM product_candidates WHERE id = ANY($1)`, [rows.map((r) => r.candidateId)])).rows) cand.set(r.id, r);

const canon = new Map();
for (const r of (await c.query(`
  SELECT id, master_id, content, source_type, status, language, description_type
  FROM shared_product_descriptions WHERE id = ANY($1) AND deleted_at IS NULL`, [rows.map((r) => r.canonicalId)])).rows) canon.set(r.id, r);

// 동일 원료(뮤코다당·단백 등)를 쓰는 정상 sibling 을 family 별로 찾는다.
const siblings = (await c.query(`
  SELECT spd.id, spd.content, pm.name
  FROM shared_product_descriptions spd JOIN product_masters pm ON pm.id = spd.master_id
  WHERE spd.deleted_at IS NULL AND spd.description_type='STORE' AND spd.status='canonical'
    AND coalesce(spd.language,'ko')='ko' AND spd.source_type='o4o_hff_generated'
    AND spd.content LIKE '%뮤코다당%' AND spd.content LIKE '%sd-func%'
  LIMIT 4`)).rows;
const ginsengSibs = (await c.query(`
  SELECT spd.id, spd.content, pm.name
  FROM shared_product_descriptions spd JOIN product_masters pm ON pm.id = spd.master_id
  WHERE spd.deleted_at IS NULL AND spd.description_type='STORE' AND spd.status='canonical'
    AND coalesce(spd.language,'ko')='ko' AND spd.source_type='o4o_hff_generated'
    AND spd.content LIKE '%홍삼%' AND spd.content LIKE '%sd-func%' AND spd.content LIKE '%나이아신%'
  LIMIT 4`)).rows;
const fnFamilyCount = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
  WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
    AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated' AND content LIKE '%sd-fn%'`)).rows[0].n;
await c.end();

const out = [], problems = [], dump = [];
for (const q of rows) {
  const cd = cand.get(q.candidateId);
  const cn = canon.get(q.canonicalId);
  const content = cn?.content ?? '';
  const fn = fnOf(content);
  const rec = {
    candidateId: q.candidateId, statementNo: cd?.stmt ?? q.statementNo, productName: cd?.name ?? q.productName,
    entrps: cd?.entrps ?? null, productMasterId: cd?.matched_product_master_id ?? null,
    canonicalId: q.canonicalId, queueReason: q.finalHoldReason,
    candidatePresent: !!cd && !cd.deleted_at, canonicalPresent: !!cn,
    language: cn?.language ?? null, descriptionType: cn?.description_type ?? null,
    status: cn?.status ?? null, sourceType: cn?.source_type ?? null,
    masterIdMatches: !!cn && cn.master_id === cd?.matched_product_master_id,
    canonicalHash: cn ? sha(cn.content) : null,
    rendererFamily: familyOf(fn || content),
    fnHeading: (content.match(/<h2>([^<]*기능성[^<]*)<\/h2>/) ?? [])[1] ?? null,
    currentClauses: leafLis(fn),
    currentLabels: [...fn.matchAll(/<b>([\s\S]*?)<\/b>/g)].map((m) => m[1].trim())
      .concat([...fn.matchAll(/<span class="sd-tag">([\s\S]*?)<\/span>/g)].map((m) => m[1].trim())),
    officialFnPresent: !!dense(cd?.fn), officialSrvPresent: !!dense(cd?.srv),
    officialRawm: (cd?.rawm ?? '').slice(0, 400),
    officialPrimaryFnclty: (cd?.pf ?? '').slice(0, 400),
  };
  if (!rec.candidatePresent) problems.push({ id: q.candidateId, why: 'CANDIDATE_MISSING' });
  if (!rec.canonicalPresent) problems.push({ id: q.candidateId, why: 'CANONICAL_MISSING' });
  out.push(rec);

  dump.push(`\n===== ${rec.productName} | ${rec.statementNo} | ${rec.entrps ?? ''}`);
  dump.push(`cand=${rec.candidateId} canon=${rec.canonicalId} family=${rec.rendererFamily} heading=${rec.fnHeading}`);
  dump.push(`RAWMTRL_NM: ${rec.officialRawm}`);
  dump.push(`PRIMARY_FNCLTY: ${rec.officialPrimaryFnclty}`);
  dump.push('--- OFFICIAL MAIN_FNCTN ---');
  (cd?.fn ?? '').replace(/\r/g, '').split('\n').forEach((v, i) => dump.push(`  L${i}| ${v}`));
  dump.push('--- CURRENT fn section ---');
  dump.push(fn.replace(/></g, '>\n<'));
}

const checks = {
  total: out.length, expected: 6, matches: out.length === 6,
  byReason: out.reduce((a, r) => { a[r.queueReason] = (a[r.queueReason] ?? 0) + 1; return a; }, {}),
  candidateIdDup: out.length - new Set(out.map((r) => r.candidateId)).size,
  canonicalIdDup: out.length - new Set(out.map((r) => r.canonicalId)).size,
  dbMissing: out.filter((r) => !r.candidatePresent || !r.canonicalPresent).length,
  allKo: out.every((r) => (r.language ?? 'ko') === 'ko'),
  allStore: out.every((r) => r.descriptionType === 'STORE'),
  allCanonical: out.every((r) => r.status === 'canonical'),
  allHffSource: out.every((r) => r.sourceType === 'o4o_hff_generated'),
  masterIdAllMatch: out.every((r) => r.masterIdMatches),
  officialSourceMissingMixedIn: out.filter((r) => !r.officialFnPresent || !r.officialSrvPresent).length,
  byFamily: out.reduce((a, r) => { a[r.rendererFamily] = (a[r.rendererFamily] ?? 0) + 1; return a; }, {}),
  sdFnFamilyTotalDocs: fnFamilyCount,
};
fs.writeFileSync(`${D}/hff-ko-last-6-population-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0, checks, problems, rows: out }, null, 1));
fs.writeFileSync(`${D}/tmp-hff-last6-dump.txt`, dump.join('\n'));
fs.writeFileSync(`${D}/tmp-hff-last6-siblings.txt`,
  ['=== 뮤코다당 sd-func sibling ===', ...siblings.map((s) => `\n--- ${s.name}\n${fnOf(s.content).replace(/></g, '>\n<').slice(0, 700)}`),
   '\n\n=== 홍삼+나이아신 sd-func sibling ===', ...ginsengSibs.map((s) => `\n--- ${s.name}\n${fnOf(s.content).replace(/></g, '>\n<').slice(0, 700)}`)].join('\n'));
console.log(JSON.stringify({ checks, problems }, null, 2));
