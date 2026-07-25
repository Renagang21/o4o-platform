/**
 * WO-O4O-OTC-REMAINING-READY-SHARD-NA-V2-LIVE-APPLY-V1 — 나 shard LIVE apply 사후 독립검증기.
 *
 * read-only (SELECT 전용 · DB write 0). 공용 러너를 import 하지 않는다 — SSOT(census/shard) 와
 * 프로덕션 실측만 대조하고, 앵커 산식(md5('otc-v2-leaflet:'+fp))만 계약대로 재구현해 교차 확인한다.
 * 러너의 사후검증과 검증 경로를 이중화하는 것이 목적이다.
 *
 * Usage(apps/api-server):
 *   DB_HOST=127.0.0.1 DB_PORT=5442 node src/scripts/otc-remaining-v2-postverify.na.mjs
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const D = path.resolve(process.cwd(), 'src/scripts/data');
const census = JSON.parse(fs.readFileSync(path.join(D, 'otc-remaining-full-corpus-census-v2.json'), 'utf8'));
const ssot = JSON.parse(fs.readFileSync(path.join(D, 'otc-remaining-shard-assignment-ssot-v2.json'), 'utf8'));
const runKo = JSON.parse(fs.readFileSync(path.join(D, 'otc-v2-apply-run.na.ko.json'), 'utf8'));
const runEn = JSON.parse(fs.readFileSync(path.join(D, 'otc-v2-apply-run.na.en.json'), 'utf8'));

const AUTHORED = 'mfds_drug_otc';
const EXP = 839;
const EXP_FP = 240;

const naFps = new Set(ssot.shards.na.fingerprintList);
const groups = census.readyGroups.filter((g) => naFps.has(g.fp));
const allIds = [...new Set(groups.flatMap((g) => g.masterIds))];
/** 러너 계약 VERBATIM 재구현 — fpToUuidV2 */
const fpUuid = (fp) => {
  const h = crypto.createHash('md5').update(`otc-v2-leaflet:${fp}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};
const anchors = groups.map((g) => fpUuid(g.fp));

const results = [];
const gate = (name, actual, expected) => {
  const pass = actual === expected;
  results.push({ name, actual, expected, pass });
  console.log(`  ${pass ? 'PASS' : '*** FAIL ***'}  ${name.padEnd(38)} ${String(actual).padStart(7)} / ${expected}`);
};

const c = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10),
  user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform',
  statement_timeout: 300000,
});
await c.connect();
const q = async (s, p) => (await c.query(s, p)).rows;

console.log(`NA V2 LIVE apply 사후 독립검증 — fp ${naFps.size} / master ${allIds.length}\n`);

console.log('[1] authored canonical (KO/EN)');
const [a] = await q(
  `SELECT
     (SELECT count(DISTINCT master_id) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
         AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::int ko,
     (SELECT count(DISTINCT master_id) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en'
         AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::int en`, [allIds, AUTHORED]);
gate('authored KO canonical', a.ko, EXP);
gate('authored EN canonical', a.en, EXP);

console.log('\n[2] master 당 canonical 정확히 1 (언어별)');
const [b] = await q(
  `SELECT count(*) FILTER (WHERE ko=1)::int ko1, count(*) FILTER (WHERE en=1)::int en1,
          count(*) FILTER (WHERE ko>1 OR en>1)::int dup FROM (
     SELECT mid,
       (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical'
          AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) ko,
       (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical'
          AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) en
     FROM unnest($1::uuid[]) mid) t`, [allIds]);
gate('KO canonical == 1 인 master', b.ko1, EXP);
gate('EN canonical == 1 인 master', b.en1, EXP);
gate('canonicalDup (KO 또는 EN >1)', b.dup, 0);

console.log('\n[3] easy_drug 잔존 / needs_review 잔존');
const [e] = await q(
  `SELECT
     (SELECT count(DISTINCT master_id) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
         AND status='canonical' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::int easyko,
     (SELECT count(*) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='needs_review'
         AND deleted_at IS NULL)::int nr,
     (SELECT count(*) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
         AND status='deprecated' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::int demoted`,
  [allIds]);
gate('easy_drug KO canonical', e.easyko, 0);
gate('needs_review 잔존', e.nr, 0);
gate('easy_drug KO deprecated (강등분)', e.demoted, EXP);

console.log('\n[4] audit 원장');
const [au] = await q(
  `SELECT count(*)::int n FROM shared_product_description_audit_logs
    WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='ko'
      AND event_type='canonical_replaced' AND metadata->>'wo' IS NOT NULL
      AND metadata->>'newSource'=$2`, [allIds, AUTHORED]);
gate('audit(canonical_replaced/ko)', au.n, EXP);

console.log('\n[5] 앵커(source_ref_id) 정합 · shard 밖 write 0');
const [an] = await q(
  `SELECT
     (SELECT count(*) FROM shared_product_descriptions
       WHERE source_ref_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
         AND deleted_at IS NULL AND COALESCE(language,'ko')='ko')::int koAnchored,
     (SELECT count(*) FROM shared_product_descriptions
       WHERE source_ref_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
         AND deleted_at IS NULL AND language='en')::int enAnchored,
     (SELECT count(*) FROM shared_product_descriptions
       WHERE source_ref_id=ANY($1::uuid[]) AND NOT (master_id=ANY($2::uuid[])))::int outOfShard,
     (SELECT count(DISTINCT source_ref_id) FROM shared_product_descriptions
       WHERE master_id=ANY($2::uuid[]) AND source_type=$3 AND description_type='STORE'
         AND status='canonical' AND deleted_at IS NULL)::int distinctAnchors`,
  [anchors, allIds, AUTHORED]);
gate('앵커 KO canonical 행', an.koanchored, EXP);
gate('앵커 EN canonical 행', an.enanchored, EXP);
gate('shard 밖 앵커 write', an.outofshard, 0);
gate('사용된 앵커 distinct', an.distinctanchors, EXP_FP);

console.log('\n[6] 실제 write (run 원장 교차)');
gate('KO writeActual', runKo.writeActual, 3356);
gate('EN writeActual', runEn.writeActual, 1678);
gate('총 write', runKo.writeActual + runEn.writeActual, 5034);
gate('KO 그룹수', runKo.groups, EXP_FP);
gate('EN 그룹수', runEn.groups, EXP_FP);

console.log('\n[7] 기존 LIVE drift (가 shard · 나 밖 authored 불변)');
const gaFps = new Set(ssot.shards.ga.fingerprintList);
const gaIds = [...new Set(census.readyGroups.filter((g) => gaFps.has(g.fp)).flatMap((g) => g.masterIds))];
const [ga] = await q(
  `SELECT
     (SELECT count(DISTINCT master_id) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
         AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::int ko,
     (SELECT count(DISTINCT master_id) FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en'
         AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::int en`, [gaIds, AUTHORED]);
gate('가 shard KO canonical 불변', ga.ko, 837);
gate('가 shard EN canonical 불변', ga.en, 837);
const daFps = new Set(ssot.shards.da.fingerprintList);
const daIds = [...new Set(census.readyGroups.filter((g) => daFps.has(g.fp)).flatMap((g) => g.masterIds))];
const [da] = await q(
  `SELECT count(DISTINCT master_id)::int n FROM shared_product_descriptions
    WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
      AND source_type=$2 AND deleted_at IS NULL`, [daIds, AUTHORED]);
gate('다 shard 미착수(authored 0)', da.n, 0);

console.log('\n[8] EN 본문 실물 (한글 잔존 0 · 비어있음 0)');
const [en] = await q(
  `SELECT count(*)::int total, count(*) FILTER (WHERE content ~ '[가-힣]')::int hangul,
          count(*) FILTER (WHERE content IS NULL OR length(content)<50)::int tiny
     FROM shared_product_descriptions
    WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en'
      AND status='canonical' AND source_type=$2 AND deleted_at IS NULL`, [allIds, AUTHORED]);
gate('EN canonical 총수', en.total, EXP);
gate('EN 한글 잔존', en.hangul, 0);
gate('EN 본문 결손(<50자)', en.tiny, 0);

await c.end();
const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${failed.length ? 'FAIL' : 'GREEN'} — ${results.length - failed.length}/${results.length} PASS · DB write 0 (SELECT only) ===`);
if (failed.length) console.log('실패:', failed.map((f) => `${f.name}(${f.actual}!=${f.expected})`).join(' · '));
process.exit(failed.length ? 1 : 0);
