/**
 * WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1 — 단계 1 후보 재산출 (READ-ONLY)
 *
 * 실행기준 4·5항: 최신 LIVE 에서 경구 금지 파손 후보를 **전 계열** 재산출한다.
 * 참고 시작값(KO 224 / EN 750 / ZH 56)은 재현 대상이지 목표치가 아니다.
 *
 * 두 탐지기를 **합집합**으로 돌린다.
 *   탐지기 1 SOURCE_DIFF        제품별 e약은요 원문의 경구 금지 문장이 본문에서 치환·소실됐다.
 *   탐지기 2 SELF_CONTRADICTION 본문이 "…사용하고 사용하지 마십시오" 처럼 자기모순이다.
 * 탐지기 1만 쓰면 **원문 자체가 결손인 제품**(itemSeq 200807607: 원문이 "내복하지 하십시오")을 놓치고,
 * 탐지기 2만 쓰면 동사가 서로 다른 치환(국소적으로 적용하거나 → 사용하지)을 놓친다.
 *
 * 대조 단위는 master 가 아니라 **(허가품목 itemSeq × 본문 md5)** 다 — 한 본문이 최대 48개
 * 허가품목에 재사용되므로 master 단위로 세면 같은 본문을 수천 번 재대조한다.
 *
 * write 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { WO, judgeBody, octFullText, ORAL_TERM_RE, PROHIBIT_RE } from './prohibition-contract.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const PORT = parseInt(process.env.PROXY_PORT || '15441', 10);

/**
 * SQL 단계에서는 두 축으로만 좁힌다. 여기서 과도하게 좁히면 "전 계열 재산출" 요구를 어긴다.
 *   축 A 원문에 경구 어휘가 있는 제품 (금지 종결 판정은 문장 단위라 JS 에서)
 *   축 B 본문이 자기모순 서명을 갖는 경우 — 원문 유무와 무관하게 전수 스캔한다.
 *        Postgres POSIX 정규식의 역참조(\\1)로 "같은 동사 반복"을 잡는다.
 */
const SELF_CONTRA_SQL_RE = '(사용|적용|도포|점안|바르)(하고|하며|하거나)[, ]{0,3}\\1(하)?지 *(마|않|하)|내사용|사용용|사용약|경구사용|사용하지 *하십시오';

const SQL = `
WITH lk AS (
  SELECT DISTINCT pi.product_master_id AS master_id, pi.normalized_value AS item_seq
  FROM product_identifiers pi
  WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
),
ed AS (
  SELECT normalized_identifier_value AS item_seq,
         raw_payload->'officialConsumerText' AS oct,
         (raw_payload->>'officialConsumerText') ~ '내복|복용|복약|먹|삼키|경구' AS has_oral
  FROM product_candidates
  WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
    AND raw_payload->>'sourceKind'='easy_drug_info' AND deleted_at IS NULL
)
SELECT COALESCE(lk.item_seq, '')          AS "itemSeq",
       md5(sd.content)                    AS "contentMd5",
       count(DISTINCT sd.master_id)::int  AS "nMaster",
       min(sd.content)                    AS "content",
       min(ed.oct::text)                  AS "octText"
FROM shared_product_descriptions sd
LEFT JOIN lk ON lk.master_id = sd.master_id
LEFT JOIN ed ON ed.item_seq = lk.item_seq
WHERE sd.deleted_at IS NULL AND sd.description_type='STORE'
  AND COALESCE(sd.language,'ko')='ko' AND sd.status='canonical'
  AND (COALESCE(ed.has_oral, false) OR sd.content ~ $1)
GROUP BY 1, 2`;

async function main() {
  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT,
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 1800000, max: 2,
  });
  const c = await pool.connect();
  await c.query('SET default_transaction_read_only = on');
  process.stderr.write('querying...\n');
  const { rows } = await c.query(SQL, [SELF_CONTRA_SQL_RE]);
  process.stderr.write(`units=${rows.length}\n`);

  const damaged = [];
  let withSafety = 0;
  let benignOnly = 0;
  let noSource = 0;
  const byDetector = {};
  const lostPattern = new Map();
  const contraPattern = new Map();
  const benignPattern = new Map();
  const bump = (m, s) => { const k = s.replace(/\d+/g, '#').slice(0, 70); m.set(k, (m.get(k) || 0) + 1); };

  for (const r of rows) {
    const oct = r.octText ? JSON.parse(r.octText) : null;
    const j = judgeBody(octFullText(oct), r.content);
    if (j.nSafety > 0) withSafety += 1;
    if (!j.damaged && j.nBenignRewrite > 0) benignOnly += 1;
    for (const s of j.benignSentences) bump(benignPattern, s);
    if (!j.damaged) continue;
    if (!oct) noSource += 1;
    const key = j.detectedBy.join('+');
    byDetector[key] = (byDetector[key] || 0) + 1;
    damaged.push({
      itemSeq: r.itemSeq, contentMd5: r.contentMd5, nMaster: r.nMaster,
      hasOfficialSource: !!oct, detectedBy: j.detectedBy,
      nCandidate: j.nCandidate, nSafety: j.nSafety, nSafetyLost: j.nSafetyLost,
      nSelfContradiction: j.nSelfContradiction, nKept: j.nKept, nAbsent: j.nAbsent,
      lostSentences: j.lostSentences, contradictionSentences: j.contradictionSentences,
    });
    for (const s of j.lostSentences) bump(lostPattern, s);
    for (const s of j.contradictionSentences) bump(contraPattern, s);
  }

  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([pattern, cnt]) => ({ n: cnt, pattern }));
  const summary = {
    wo: WO, mode: 'READ-ONLY MEASURE',
    oralTermRe: ORAL_TERM_RE.source, prohibitRe: PROHIBIT_RE.source, selfContraSqlRe: SELF_CONTRA_SQL_RE,
    scannedUnits: rows.length,
    unitsWithSafetyProhibitionInSource: withSafety,
    damagedUnits: damaged.length,
    damagedMasterSum: damaged.reduce((a, d) => a + d.nMaster, 0),
    damagedUnitsWithoutOfficialSource: noSource,
    byDetector,
    benignRewriteOnlyUnits: benignOnly,
    lostPatterns: top(lostPattern, 60),
    contradictionPatterns: top(contraPattern, 40),
    topBenignPatterns: top(benignPattern, 10),
  };
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(path.join(RESULTS, 'candidate-measure.json'),
    JSON.stringify({ ...summary, damaged }, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');

  c.release();
  await pool.end();
}
main();
