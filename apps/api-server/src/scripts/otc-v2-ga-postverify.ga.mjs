// WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2-LIVE-APPLY-V1 — 가 shard LIVE apply 독립 사후검증 (에이전트 가).
//
// 공용 러너의 preflight/apply 경로를 **쓰지 않고** shard SSOT 의 master 목록만 읽어
// DB 실측으로 사후 상태를 판정한다. read-only · DB write 0.
//
// 검사:
//   1) 대상 master 837 (shard SSOT − HOLD)
//   2) authored STORE ko canonical == 837 · master 별 정확히 1
//   3) authored STORE en canonical == 837 · master 별 정확히 1
//   4) easy_drug STORE ko canonical 잔존 0
//   5) audit(canonical_replaced/ko) == 837
//   6) canonicalDup ko/en == 0
//   7) HOLD 2 master write 0 (ko authored 0 · en 0 · audit 0)
//   8) shard 밖 write 0 (authored_v2 source_ref_id 앵커가 shard fp 집합 밖 master 에 없음)
//   9) 총 write 실측 = ko(deprecated+insert+flip+audit) + en(insert+flip)
//
// Usage(apps/api-server):
//   DB_HOST=127.0.0.1 DB_PORT=<proxy> node --import tsx src/scripts/otc-v2-ga-postverify.ga.mjs
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA = 'src/scripts/data';
const SSOT = JSON.parse(fs.readFileSync(path.join(DATA, 'otc-remaining-shard-assignment-ssot-v2.json'), 'utf8'));
const CENSUS = JSON.parse(fs.readFileSync(path.join(DATA, 'otc-remaining-full-corpus-census-v2.json'), 'utf8'));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(DATA, 'otc-v2-dryrun-manifest.ga.json'), 'utf8'));
// 공용 러너의 V2 authored source_type (runner: AUTHORED_SOURCE_V2). 값 자체를 여기서 재확인한다.
const AUTHORED_V2 = 'mfds_drug_otc';

const gaFp = new Set(SSOT.shards.ga.fingerprintList);
const holdFp = new Set(MANIFEST.groups.filter((g) => g.anomalies && g.anomalies.length).map((g) => g.fp));
const groups = CENSUS.readyGroups.filter((g) => gaFp.has(g.fp));
const eligible = groups.filter((g) => !holdFp.has(g.fp));
const holdMasters = groups.filter((g) => holdFp.has(g.fp)).flatMap((g) => g.masterIds);
const targetIds = [...new Set(eligible.flatMap((g) => g.masterIds))].sort();

// source_ref_id 앵커 재현 — 러너와 동일 산식(fp → uuid v5-like sha1 truncation)은 쓰지 않고,
// 실측된 앵커 집합이 대상 master 밖으로 새어나갔는지만 본다.
const rows = (res) => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res);
const num = (r, k) => parseInt(r?.[k] ?? '0', 10);

const { DataSource } = await import('typeorm');
const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5442', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'o4o_platform',
  entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 600000 },
});
await ds.initialize();

const fail = [];
const chk = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) fail.push(`${label}: 실측 ${actual} != 기대 ${expected}`);
  console.log(`  ${ok ? 'PASS' : '*** FAIL ***'}  ${label} — ${actual} / ${expected}`);
  return ok;
};

console.log(`OTC-V2-GA POST-VERIFY (독립) — 대상 ${targetIds.length} master · HOLD ${holdMasters.length} master`);

// 1) authored ko canonical
const ko = rows(await ds.query(`
  SELECT count(*) FILTER (WHERE cc=1)::text one, count(*) FILTER (WHERE cc>1)::text dup,
         count(*) FILTER (WHERE cc=0)::text zero FROM (
    SELECT mid, (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid
      AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical'
      AND s.source_type=$2 AND s.deleted_at IS NULL) cc
    FROM unnest($1::uuid[]) mid) t`, [targetIds, AUTHORED_V2]))[0];
chk('authored STORE ko canonical 정확히 1', num(ko, 'one'), targetIds.length);
chk('ko canonical 0건 master', num(ko, 'zero'), 0);
chk('ko authored 중복', num(ko, 'dup'), 0);

// 2) authored en canonical
const en = rows(await ds.query(`
  SELECT count(*) FILTER (WHERE cc=1)::text one, count(*) FILTER (WHERE cc>1)::text dup,
         count(*) FILTER (WHERE cc=0)::text zero FROM (
    SELECT mid, (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid
      AND s.description_type='STORE' AND COALESCE(s.language,'ko')='en' AND s.status='canonical'
      AND s.deleted_at IS NULL) cc
    FROM unnest($1::uuid[]) mid) t`, [targetIds]))[0];
chk('STORE en canonical 정확히 1', num(en, 'one'), targetIds.length);
chk('en canonical 0건 master', num(en, 'zero'), 0);
chk('en canonical 중복', num(en, 'dup'), 0);

// 3) easy_drug ko canonical 잔존
const easy = rows(await ds.query(`
  SELECT count(*)::text n FROM shared_product_descriptions
  WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
    AND source_type='mfds_easy_drug' AND status='canonical' AND deleted_at IS NULL`, [targetIds]))[0];
chk('easy_drug ko canonical 잔존', num(easy, 'n'), 0);

const easyDep = rows(await ds.query(`
  SELECT count(*)::text n FROM shared_product_descriptions
  WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
    AND source_type='mfds_easy_drug' AND status='deprecated' AND deleted_at IS NULL`, [targetIds]))[0];
chk('easy_drug ko deprecated (원문 보존)', num(easyDep, 'n'), targetIds.length);

// 4) canonicalDup 전체(언어 무관)
const dup = rows(await ds.query(`
  SELECT count(*)::text n FROM (
    SELECT master_id, COALESCE(language,'ko') lang FROM shared_product_descriptions
    WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
    GROUP BY 1,2 HAVING count(*) > 1) d`, [targetIds]))[0];
chk('canonicalDup (ko/en)', num(dup, 'n'), 0);

// 5) audit
const audit = rows(await ds.query(`
  SELECT count(*)::text n FROM shared_product_description_audit_logs
  WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND language='ko'
    AND event_type='canonical_replaced' AND metadata->>'newSource'=$2`, [targetIds, AUTHORED_V2]))[0];
chk('audit(canonical_replaced/ko)', num(audit, 'n'), targetIds.length);

// 6) HOLD master write 0
if (holdMasters.length) {
  const hold = rows(await ds.query(`
    SELECT
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id = ANY($1::uuid[])
        AND s.description_type='STORE' AND s.source_type=$2 AND s.deleted_at IS NULL)::text spd,
      (SELECT count(*) FROM shared_product_description_audit_logs a WHERE a.master_id = ANY($1::uuid[])
        AND a.metadata->>'newSource'=$2)::text aud,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id = ANY($1::uuid[])
        AND s.description_type='STORE' AND COALESCE(s.language,'ko')='en' AND s.deleted_at IS NULL)::text en
    `, [holdMasters, AUTHORED_V2]))[0];
  chk('HOLD master authored SPD write', num(hold, 'spd'), 0);
  chk('HOLD master audit write', num(hold, 'aud'), 0);
  chk('HOLD master en SPD write', num(hold, 'en'), 0);
}

// 7) shard 밖 write 0
//    source_type 'mfds_drug_otc' 는 선행 트랙과 공유하는 값이므로 그것만으로는 이번 WO 를 식별할 수 없다.
//    이번 apply 가 남긴 audit(metadata->>'wo') 로 이번 run 의 write 를 특정하고,
//    그 source_ref_id 앵커가 대상 master 밖에 쓰였는지 본다.
const WO = 'WO-O4O-OTC-REMAINING-READY-V2-SHARED-RUNNER-APPLY-SUPPORT-V1';
const outside = rows(await ds.query(`
  WITH mine AS (
    SELECT DISTINCT (metadata->>'source_ref_id')::uuid ref FROM shared_product_description_audit_logs
    WHERE metadata->>'wo' = $2 AND metadata->>'source_ref_id' IS NOT NULL)
  SELECT count(*)::text n FROM shared_product_descriptions s JOIN mine ON s.source_ref_id = mine.ref
  WHERE s.description_type='STORE' AND s.deleted_at IS NULL AND NOT (s.master_id = ANY($1::uuid[]))`,
  [targetIds, WO]))[0];
chk('shard 밖 write (이번 WO 앵커 기준)', num(outside, 'n'), 0);

const mineTotal = rows(await ds.query(`
  SELECT count(*)::text n FROM shared_product_description_audit_logs WHERE metadata->>'wo' = $1`, [WO]))[0];
chk('이번 WO audit 총량', num(mineTotal, 'n'), targetIds.length);

// 8) 실측 총 write
const koW = num(ko, 'one') * 3 + num(audit, 'n');           // deprecated + insert + flip + audit
const enW = num(en, 'one') * 2;                              // insert + flip
console.log(`  실측 write — KO ${koW}T · EN ${enW}T · 총 ${koW + enW}T (기대 3348 / 1674 / 5022)`);
if (koW !== 3348) fail.push(`KO write ${koW} != 3348`);
if (enW !== 1674) fail.push(`EN write ${enW} != 1674`);

// 9) 기존 LIVE drift — 이번 대상 밖 authored 트랙(V1 등) 총량 스냅샷
const drift = rows(await ds.query(`
  SELECT source_type, count(*)::text n FROM shared_product_descriptions
  WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
    AND source_type = ANY($1) GROUP BY 1 ORDER BY 1`,
  [['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo', 'mfds_easy_drug']]));
console.log('  authored canonical 분포:');
for (const r of drift) console.log(`    ${r.source_type}: ${r.n}`);

await ds.destroy();
console.log(fail.length === 0 ? 'POST-VERIFY ga — GREEN' : `POST-VERIFY ga — RED ${fail.length}건`);
for (const f of fail) console.log(`  - ${f}`);
process.exit(fail.length ? 1 : 0);
