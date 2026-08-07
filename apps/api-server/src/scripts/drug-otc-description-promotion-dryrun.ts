/**
 * Drug OTC Store Description Draft → SharedProductDescription 승격 DRY-RUN (read-only 전용)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-DESIGN-V1
 *
 * product_candidate_description_drafts(MFDS_DRUG_OTC 66그룹)를 shared_product_descriptions 로
 * 승격할 때의 **대상 master 전개 + e약은요 overlap + 정책별 insertable 수**를 산출한다.
 *
 * **DB write 0** — INSERT/UPDATE/DELETE 경로가 존재하지 않는다(SELECT only).
 * 실제 승격은 별도 WO(WO-...-APPLY-V1)에서 사용자 승인 후 수행.
 *
 * 전개 원칙(조사 결과 확정):
 *   - display 는 shared_product_descriptions 를 (master_id + status='canonical') 로만 조회
 *     (store-public-utils / product-library). representative 폴백 없음 → 대상 master 전체 전개 필요.
 *   - needs_review 는 노출되지 않음(안전). canonical 은 master 당 1개(partial unique) → e약은요 canonical 보존.
 *
 * Usage:
 *   DB_HOST=127.0.0.1 DB_PORT=15432 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-description-promotion-dryrun.ts
 */

const OTC_SOURCE_LABEL = 'MFDS_DRUG_OTC';
const PROMOTION_SOURCE_TYPE = 'mfds_drug_otc'; // 승격 시 부여할 source_type(신규 union 값 — apply WO 에서 추가)

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정 — Cloud SQL Auth Proxy(127.0.0.1) 또는 /cloudsql 소켓 필요');
  const ds = new DataSource({
    type: 'postgres', host, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
    ...(host && !host.startsWith('/cloudsql/') && !/^(127\.0\.0\.1|localhost)$/.test(host)
      ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await ds.initialize();
  try {
    // 대상 master 전개(그룹 = seed_json 성분·함량·제형, drug_category='otc') + SPD overlap 상태
    const perMasterCte = `
      WITH d AS (
        SELECT source_identifier_value AS gk,
          seed_json->>'ingredient' AS ing, seed_json->>'strengthToken' AS str,
          seed_json->>'doseForm' AS form, guard_result->>'verdict' AS verdict
        FROM product_candidate_description_drafts
        WHERE source_label='${OTC_SOURCE_LABEL}' AND deleted_at IS NULL
      ),
      parsed AS (
        SELECT pm.id, substring(pm.name from '\\(([^()]+)\\)\\s*$') AS ing,
          split_part(pm.specification,' / ',1) AS str,
          CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐'
               WHEN pm.name LIKE '%캡슐%' THEN '캡슐'
               WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END AS form
        FROM product_masters pm WHERE pm.regulatory_type='DRUG' AND pm.drug_category='otc'
      ),
      m AS (SELECT d.gk, d.verdict, p.id AS master_id FROM d JOIN parsed p ON p.ing=d.ing AND p.str=d.str AND p.form=d.form),
      mstat AS (
        SELECT m.gk, m.verdict, m.master_id,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.master_id AND s.deleted_at IS NULL AND s.status='canonical') AS has_canon,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.master_id AND s.deleted_at IS NULL) AS has_any,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.master_id AND s.deleted_at IS NULL AND s.source_type='${PROMOTION_SOURCE_TYPE}') AS has_otc
        FROM m
      )`;

    // baseline (invariant refs)
    const spdBaseline: { status: string; source_type: string; count: string }[] = await ds.query(
      `SELECT status, source_type, count(*) AS count FROM shared_product_descriptions WHERE deleted_at IS NULL GROUP BY 1,2 ORDER BY 3 DESC`,
    );
    const [{ count: draftCount }]: { count: string }[] = await ds.query(
      `SELECT count(*) AS count FROM product_candidate_description_drafts WHERE source_label='${OTC_SOURCE_LABEL}' AND deleted_at IS NULL`,
    );

    const [grand]: {
      target_master_rows: string; distinct_masters: string; with_canonical: string;
      with_any_spd: string; no_spd: string; already_otc: string;
    }[] = await ds.query(`${perMasterCte}
      SELECT count(*) AS target_master_rows, count(DISTINCT master_id) AS distinct_masters,
        count(*) FILTER (WHERE has_canon) AS with_canonical,
        count(*) FILTER (WHERE has_any) AS with_any_spd,
        count(*) FILTER (WHERE NOT has_any) AS no_spd,
        count(*) FILTER (WHERE has_otc) AS already_otc
      FROM mstat`);

    const byVerdict: { verdict: string; masters: string; no_spd: string; with_canonical: string }[] =
      await ds.query(`${perMasterCte}
      SELECT verdict, count(*) AS masters,
        count(*) FILTER (WHERE NOT has_any) AS no_spd,
        count(*) FILTER (WHERE has_canon) AS with_canonical
      FROM mstat GROUP BY verdict ORDER BY masters DESC`);

    const perGroup: {
      gk: string; verdict: string; masters: string; no_spd: string; with_canonical: string;
    }[] = await ds.query(`${perMasterCte}
      SELECT gk, verdict, count(*) AS masters,
        count(*) FILTER (WHERE NOT has_any) AS no_spd,
        count(*) FILTER (WHERE has_canon) AS with_canonical
      FROM mstat GROUP BY gk, verdict ORDER BY count(*) DESC`);

    const g = {
      targetMasterRows: Number(grand.target_master_rows),
      distinctMasters: Number(grand.distinct_masters),
      withCanonical: Number(grand.with_canonical),
      withAnySpd: Number(grand.with_any_spd),
      noSpd: Number(grand.no_spd),
      alreadyOtc: Number(grand.already_otc),
    };
    const autoMasters = Number(byVerdict.find((v) => v.verdict === 'INSERT_auto')?.masters ?? 0);
    const autoNoSpd = Number(byVerdict.find((v) => v.verdict === 'INSERT_auto')?.no_spd ?? 0);

    // 정책별 insertable(승격 시 생성될 SPD row 수)
    const policies = {
      A_noSpd_only: g.noSpd, // 설명 전무 master 만 → needs_review
      C_auto_only_all: autoMasters, // auto 그룹 전체 master
      C_auto_only_noSpd: autoNoSpd, // auto 그룹 중 설명 전무
      D_all_target: g.targetMasterRows, // 전체 target master → needs_review(canonical 보존)
    };

    const report = {
      wo: 'WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-DESIGN-V1',
      mode: 'dry-run',
      dbWrite: 0,
      invariantRefs: { spdBaseline, draftCount: Number(draftCount) },
      totalDraftGroups: perGroup.length,
      grand: g,
      byVerdict: byVerdict.map((v) => ({
        verdict: v.verdict, masters: Number(v.masters), noSpd: Number(v.no_spd), withCanonical: Number(v.with_canonical),
      })),
      policyInsertable: policies,
      statusMapping: { status: 'needs_review', source_type: PROMOTION_SOURCE_TYPE, language: 'ko' },
      excludedRefs: {
        excludedBecauseExistingCanonical_ifA: g.withCanonical,
        excludedBecauseExistingAnySpd_ifA: g.withAnySpd,
        note: 'D안은 canonical 보존하며 needs_review 병행 → excluded 0. A안은 no_spd 만.',
      },
      topGroupsSample: perGroup.slice(0, 8).map((r) => ({
        gk: r.gk, verdict: r.verdict, masters: Number(r.masters), noSpd: Number(r.no_spd), withCanonical: Number(r.with_canonical),
      })),
      bottomGroupsSample: perGroup.slice(-6).map((r) => ({
        gk: r.gk, verdict: r.verdict, masters: Number(r.masters), noSpd: Number(r.no_spd), withCanonical: Number(r.with_canonical),
      })),
    };

    console.log('───────────────────────────────────────────────');
    console.log('OTC draft → SharedProductDescription 승격 DRY-RUN (read-only)');
    console.log('───────────────────────────────────────────────');
    console.log(`draftGroups         : ${report.totalDraftGroups}`);
    console.log(`targetMasters       : ${g.targetMasterRows} (distinct ${g.distinctMasters})`);
    console.log(`withCanonical(e약은요): ${g.withCanonical}`);
    console.log(`withAnySpd          : ${g.withAnySpd}`);
    console.log(`noSpd(설명전무)     : ${g.noSpd}`);
    console.log(`already ${PROMOTION_SOURCE_TYPE} : ${g.alreadyOtc}`);
    console.log('── policy insertable(SPD rows) ──');
    console.log(`  A(noSpd only)     : ${policies.A_noSpd_only}`);
    console.log(`  C(auto all)       : ${policies.C_auto_only_all}  / auto+noSpd ${policies.C_auto_only_noSpd}`);
    console.log(`  D(all target)     : ${policies.D_all_target}`);
    console.log(`dbWrite             : 0`);
    console.log('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    console.log('JSON_REPORT_END');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  console.error('[drug-otc-description-promotion-dryrun] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});

// top-level import/export 가 없으면 TS 가 이 파일을 global script 로 취급해
// 다른 스크립트의 `main` 선언과 충돌한다(TS2393). 모듈로 고정한다.
export {};
