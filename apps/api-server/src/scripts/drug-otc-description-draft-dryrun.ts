/**
 * Drug OTC Store Description Draft — DB 적재 DRY-RUN (read-only 전용, apply 경로 없음)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1
 *
 * 오프라인 CHECK 문서의 OTC 그룹(66개)을 product_candidate_description_drafts 로 적재하기 위한
 * **dry-run**. 프로덕션 DB 를 SELECT 만 하여 그룹별 master/OTC/RX/e약은요/anchor 를 해상하고,
 * verdict 분류 → insertable/제외/충돌 수 + 샘플 payload 를 산출한다.
 *
 * **DB write 0** — 이 스크립트에는 INSERT/UPDATE/DELETE 경로가 존재하지 않는다.
 * 실제 적재(apply)는 별도 WO(WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1) 에서 사용자 승인 후 수행.
 *
 * Usage (Cloud SQL Auth Proxy 경유, read-only):
 *   DB_HOST=127.0.0.1 DB_PORT=15432 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-description-draft-dryrun.ts [--out report.json] [--samples 8]
 */

import {
  DRUG_OTC_DESCRIPTION_GROUPS,
  classifyGroup,
  isInsertable,
  buildDrugOtcDraftRowPlan,
  DRUG_OTC_SOURCE_LABEL,
  type DrugOtcGroupResolution,
  type DrugOtcDraftVerdict,
} from '../modules/neture/drug-import/drug-otc-description-draft-plan.js';

interface CliArgs {
  out: string | null;
  samples: number;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (n: string) => {
    const i = argv.indexOf(`--${n}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${n}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  return { out: get('out') ?? null, samples: parseInt(get('samples') ?? '8', 10) };
}

/** 프로덕션 DB read-only 해상도. 그룹 fixture 를 VALUES 로 바인딩(파라미터), master 파싱 CTE 와 조인. */
async function resolveGroups(): Promise<Map<number, DrugOtcGroupResolution>> {
  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정 — Cloud SQL Auth Proxy(127.0.0.1) 또는 /cloudsql 소켓 필요');
  const ds = new DataSource({
    type: 'postgres',
    host,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [],
    synchronize: false,
    logging: ['error'],
    // /cloudsql 소켓·로컬 proxy(127.0.0.1/localhost) 는 SSL 미사용, 그 외 원격 TCP 만 SSL
    ...(host && !host.startsWith('/cloudsql/') && !/^(127\.0\.0\.1|localhost)$/.test(host)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });
  await ds.initialize();
  try {
    // fixture VALUES 파라미터 조립 (seq, ing, str, form)
    const params: (number | string)[] = [];
    const rows = DRUG_OTC_DESCRIPTION_GROUPS.map((g, i) => {
      const b = i * 4;
      params.push(g.seq, g.ingredient, g.strengthToken, g.doseForm);
      return `($${b + 1}::int,$${b + 2}::text,$${b + 3}::text,$${b + 4}::text)`;
    }).join(',');

    const sql = `
      WITH fixture(seq, ing, str, form) AS ( VALUES ${rows} ),
      parsed AS (
        SELECT pm.id, pm.manufacturer_name AS mfr, pm.drug_category AS cat,
          substring(pm.name from '\\(([^()]+)\\)\\s*$') AS ing,
          split_part(pm.specification, ' / ', 1) AS str,
          CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐'
               WHEN pm.name LIKE '%캡슐%' THEN '캡슐'
               WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END AS form
        FROM product_masters pm WHERE pm.regulatory_type='DRUG'
      ),
      matched AS (
        SELECT f.seq, p.id, p.mfr, p.cat
        FROM fixture f JOIN parsed p ON p.ing=f.ing AND p.str=f.str AND p.form=f.form
      ),
      agg AS (
        SELECT seq, count(*) AS master_total,
          count(*) FILTER (WHERE cat='otc') AS otc,
          count(*) FILTER (WHERE cat='rx') AS rx,
          count(*) FILTER (WHERE cat NOT IN ('otc','rx') OR cat IS NULL) AS other_cat,
          count(DISTINCT mfr) AS mfrs
        FROM matched GROUP BY seq
      ),
      spd AS (
        SELECT m.seq, count(DISTINCT s.master_id) AS spd_masters
        FROM matched m
        JOIN shared_product_descriptions s ON s.master_id=m.id AND s.deleted_at IS NULL AND s.source_type='mfds_easy_drug'
        WHERE m.cat='otc' GROUP BY m.seq
      ),
      anchor AS (
        SELECT m.seq, count(DISTINCT c.matched_product_master_id) AS anchor_masters, min(c.id::text) AS anchor_candidate
        FROM matched m
        JOIN product_candidates c ON c.matched_product_master_id=m.id AND c.source_type='csv_import' AND c.deleted_at IS NULL
        WHERE m.cat='otc' GROUP BY m.seq
      )
      SELECT f.seq,
        COALESCE(a.master_total,0) AS master_total, COALESCE(a.otc,0) AS otc, COALESCE(a.rx,0) AS rx,
        COALESCE(a.other_cat,0) AS other_cat, COALESCE(a.mfrs,0) AS mfrs,
        COALESCE(sp.spd_masters,0) AS spd_masters, COALESCE(an.anchor_masters,0) AS anchor_masters,
        an.anchor_candidate
      FROM fixture f
      LEFT JOIN agg a ON a.seq=f.seq
      LEFT JOIN spd sp ON sp.seq=f.seq
      LEFT JOIN anchor an ON an.seq=f.seq
      ORDER BY f.seq`;

    type Raw = {
      seq: number; master_total: string; otc: string; rx: string; other_cat: string;
      mfrs: string; spd_masters: string; anchor_masters: string; anchor_candidate: string | null;
    };
    const raw: Raw[] = await ds.query(sql, params);
    const map = new Map<number, DrugOtcGroupResolution>();
    for (const r of raw) {
      map.set(Number(r.seq), {
        masterTotal: Number(r.master_total), otc: Number(r.otc), rx: Number(r.rx),
        otherCat: Number(r.other_cat), manufacturers: Number(r.mfrs),
        spdMasters: Number(r.spd_masters), anchorMasters: Number(r.anchor_masters),
        anchorCandidateId: r.anchor_candidate,
      });
    }
    return map;
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const resolutions = await resolveGroups();

  const verdictCounts: Record<string, number> = {};
  const insertPlans: ReturnType<typeof buildDrugOtcDraftRowPlan>[] = [];
  const rejects: { seq: number; label: string; verdict: DrugOtcDraftVerdict; reason: string }[] = [];
  const anchorSeen = new Map<string, number>(); // anchorCandidateId → seq (충돌 감지)
  let anchorCollision = 0;

  for (const f of DRUG_OTC_DESCRIPTION_GROUPS) {
    const r = resolutions.get(f.seq) ?? {
      masterTotal: 0, otc: 0, rx: 0, otherCat: 0, manufacturers: 0, spdMasters: 0, anchorMasters: 0, anchorCandidateId: null,
    };
    const verdict = classifyGroup(f, r);
    verdictCounts[verdict] = (verdictCounts[verdict] ?? 0) + 1;

    if (isInsertable(verdict)) {
      const plan = buildDrugOtcDraftRowPlan(f, r, verdict);
      // dedup 축 검산: (candidate_id, draft_type, language) 활성 유일 — anchor 충돌 없어야 함
      const prev = anchorSeen.get(plan.candidate_id);
      if (prev != null) {
        anchorCollision += 1;
        rejects.push({ seq: f.seq, label: f.label, verdict, reason: `anchor 충돌 seq=${prev} 와 동일 candidate` });
        continue;
      }
      anchorSeen.set(plan.candidate_id, f.seq);
      insertPlans.push(plan);
    } else {
      const reason =
        verdict === 'EXCLUDE_match_fail' ? 'name 파싱 그룹키가 DB master 0건(표기 변형/생략 표기)' :
        verdict === 'EXCLUDE_anchor_fail' ? 'OTC master 에 연결된 csv_import candidate 없음' :
        verdict === 'EXCLUDE_rx_heavy' ? 'RX 가 OTC 초과(전문의약품 우세)' :
        verdict === 'EXCLUDE_no_otc' ? 'OTC master 0건' : verdict;
      rejects.push({ seq: f.seq, label: f.label, verdict, reason });
    }
  }

  const report = {
    wo: 'WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1',
    mode: 'dry-run',
    sourceLabel: DRUG_OTC_SOURCE_LABEL,
    offlineDraftGroups: DRUG_OTC_DESCRIPTION_GROUPS.length,
    resolvedGroups: [...resolutions.values()].filter((r) => r.masterTotal > 0).length,
    insertableDrafts: insertPlans.length,
    excluded: rejects.length,
    anchorCollision,
    verdictCounts,
    distinctAnchorCandidates: anchorSeen.size,
    dbWrite: 0,
  };

  console.log('───────────────────────────────────────────────');
  console.log('Drug OTC Store Description Draft — DB 적재 DRY-RUN (read-only)');
  console.log('───────────────────────────────────────────────');
  console.log(`offlineDraftGroups   : ${report.offlineDraftGroups}`);
  console.log(`resolvedGroups       : ${report.resolvedGroups}`);
  console.log(`insertableDrafts     : ${report.insertableDrafts}`);
  console.log(`excluded             : ${report.excluded}`);
  console.log(`distinctAnchorCand   : ${report.distinctAnchorCandidates} (=insertable 여야 dedup 안전)`);
  console.log(`verdictCounts        : ${JSON.stringify(verdictCounts)}`);
  console.log(`dbWrite              : 0`);
  console.log('── reject samples ──');
  for (const rj of rejects.slice(0, args.samples)) console.log(`  #${rj.seq} ${rj.label} — ${rj.verdict} (${rj.reason})`);
  console.log('── insert payload samples ──');
  for (const p of insertPlans.slice(0, args.samples)) {
    console.log(`  ${p.title} → cand=${p.candidate_id.slice(0, 8)}… flags=${JSON.stringify(p.review_flags)}`);
  }

  const full = { report, insertSamples: insertPlans.slice(0, args.samples), rejects };
  if (args.out) {
    const fs = await import('fs');
    const path = await import('path');
    const abs = path.isAbsolute(args.out) ? args.out : path.resolve(process.cwd(), args.out);
    fs.writeFileSync(abs, JSON.stringify(full, null, 2), 'utf-8');
    console.log(`out                  : ${abs} (⚠️ gitignore 경로만)`);
  }
  console.log('JSON_REPORT_BEGIN');
  console.log(JSON.stringify(report));
  console.log('JSON_REPORT_END');
}

main().catch((e) => {
  console.error('[drug-otc-description-draft-dryrun] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
