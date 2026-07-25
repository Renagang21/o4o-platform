/**
 * WO-O4O-OTC-REMAINING-READY-SHARD-NA-V2 — 나 shard 독립검증기 (read-only, DB write 0).
 *
 * V2 SSOT(otc-remaining-shard-assignment-ssot-v2.json).shards.na 240 fp / 839 master 를
 * 프로덕션 실측과 대조한다. 러너와 분리된 SELECT 전용 검증기.
 *
 * identity 축(일반명코드)은 product_candidates.raw_payload->'rawRow'->>'일반명코드(성분명코드)' 에
 * 존재하며 품목기준코드(mfds_code)로 조인한다. 제품명 파생 축은 사용하지 않는다(V2 원칙).
 *
 * Usage: cd apps/api-server && node src/scripts/otc-remaining-v2-verify.na.mjs
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const D = path.resolve(process.cwd(), 'src/scripts/data');
const census = JSON.parse(fs.readFileSync(path.join(D, 'otc-remaining-full-corpus-census-v2.json'), 'utf8'));
const ssot = JSON.parse(fs.readFileSync(path.join(D, 'otc-remaining-shard-assignment-ssot-v2.json'), 'utf8'));

const naFps = new Set(ssot.shards.na.fingerprintList);
const groups = census.readyGroups.filter((g) => naFps.has(g.fp));
const allIds = groups.flatMap((g) => g.masterIds);
const EXP = 839;
const results = [];
const gate = (name, actual, expected) => {
  const pass = actual === expected;
  results.push({ name, actual, expected, pass });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} ${String(actual).padStart(6)} / ${expected}`);
};

const c = new pg.Client({
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10),
  user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  statement_timeout: 300000,
});
await c.connect();
const q = async (s, p) => (await c.query(s, p)).rows;

console.log(`NA V2 shard 독립검증 — fp ${naFps.size} / master ${allIds.length} (distinct ${new Set(allIds).size})\n`);

console.log('[1] 대상 master');
const [a] = await q(`SELECT count(*)::int n FROM product_masters WHERE id=ANY($1::uuid[])`, [allIds]);
gate('product_masters 존재', a.n, EXP);
const [b] = await q(
  `SELECT count(DISTINCT pm.id)::int n FROM product_masters pm
     JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.deleted_at IS NULL
    WHERE pm.id=ANY($1::uuid[]) AND e.drug_category='otc'`, [allIds]);
gate("drug_category='otc'", b.n, EXP);

console.log('\n[2] READY 상태 (기존 완료분 교집합 0 포함)');
const [g] = await q(
  `SELECT
     (SELECT count(*) FROM unnest($1::uuid[]) m WHERE (SELECT count(*) FROM shared_product_descriptions s
        WHERE s.master_id=m AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
          AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL)=1)::int easy1,
     (SELECT count(DISTINCT master_id) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
         AND status='canonical' AND deleted_at IS NULL
         AND source_type IN ('mfds_drug_otc','nutrition_combo','mfds_drug_otc_nutrition_combo'))::int authored,
     (SELECT count(DISTINCT master_id) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='en'
         AND status='canonical' AND deleted_at IS NULL)::int en,
     (SELECT count(DISTINCT master_id) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='needs_review'
         AND deleted_at IS NULL)::int nr`, [allIds]);
gate('easy ko canonical 정확히 1', g.easy1, EXP);
gate('authored ko canonical', g.authored, 0);
gate('en canonical', g.en, 0);
gate('needs_review', g.nr, 0);

console.log('\n[3] canonical 중복');
const dup = await q(
  `SELECT master_id FROM shared_product_descriptions
    WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
    GROUP BY master_id, COALESCE(language,'ko') HAVING count(*)>1`, [allIds]);
gate('canonicalDup', dup.length, 0);

console.log('\n[4] fingerprint identity 축 불변 (일반명코드)');
// 2-pass: (1) master→MFDS_CODE (product_identifiers), (2) candidate 단일 스캔으로 code→gencode 맵.
// 경로는 러너 계약과 동일: raw_payload->'source'->>'일반명코드(성분명코드)', 조인은 raw_payload->>'mfdsCode'.
const mrows = await q(
  `SELECT pi.product_master_id::text id, pi.identifier_value code
     FROM product_identifiers pi
    WHERE pi.product_master_id=ANY($1::uuid[]) AND pi.identifier_type='MFDS_CODE'`, [allIds]);
const codes = [...new Set(mrows.map((r) => r.code).filter(Boolean))];
const crows = await q(
  `SELECT raw_payload->>'mfdsCode' code, raw_payload->'source'->>'일반명코드(성분명코드)' gen
     FROM product_candidates
    WHERE raw_payload->>'mfdsCode' = ANY($1::text[])
      AND NULLIF(raw_payload->'source'->>'일반명코드(성분명코드)','') IS NOT NULL`, [codes]);
const codeGen = new Map(crows.map((r) => [r.code, r.gen]));
const dbGen = new Map(mrows.map((r) => [r.id, codeGen.get(r.code)]));
let ok = 0; const bad = [];
for (const grp of groups) for (const id of grp.masterIds) {
  if (dbGen.get(id) === grp.gencode) ok++; else bad.push({ fp: grp.fp, id, ssot: grp.gencode, db: dbGen.get(id) });
}
gate('gencode SSOT==DB 일치', ok, EXP);
if (bad.length) console.log('   불일치 샘플:', JSON.stringify(bad.slice(0, 4)));
const het = groups.filter((grp) => new Set(grp.masterIds.map((i) => dbGen.get(i))).size > 1);
gate('fp 내 gencode 이질 그룹', het.length, 0);

console.log('\n[5] 공식 원문 축 (효능·용법·주의)');
const [s] = await q(
  `SELECT count(*)::int total,
     count(*) FILTER (WHERE content ~ '효능|효과')::int eff,
     count(*) FILTER (WHERE content ~ '용법|용량')::int use,
     count(*) FILTER (WHERE content ~ '주의')::int cau
     FROM shared_product_descriptions
    WHERE master_id=ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
      AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [allIds]);
gate('easy canonical 총수', s.total, EXP);
gate('효능 축 보유', s.eff, EXP);
gate('용법 축 보유', s.use, EXP);
gate('주의 축 보유', s.cau, EXP);

await c.end();
const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${failed.length ? 'FAIL' : 'GREEN'} — ${results.length - failed.length}/${results.length} PASS · DB write 0 (SELECT only) ===`);
if (failed.length) console.log('실패:', failed.map((f) => `${f.name}(${f.actual}!=${f.expected})`).join(' · '));
