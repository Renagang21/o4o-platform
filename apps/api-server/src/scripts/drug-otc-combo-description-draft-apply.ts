/**
 * Drug OTC COMBO Store Description Draft — DB APPLY (dry-run 기본, --apply 이중 게이트)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1
 *
 * GROUNDING-DRAFT-V1 drafted 27 registry group_key → ATC 계열당 draft 1건(6 family) 적재.
 * body(§5 마크다운)→content_json ETL 포함. **draft 적재까지만** — SharedProductDescription/
 * canonical/ProductMaster/ProductCandidate/Extension 절대 무변경.
 *
 * 모드:
 *   기본(dry-run): SELECT only, write 0. 적재 대상·본문 매칭·사전조건·preview 산출.
 *   --apply: env DRUG_OTC_COMBO_DRAFT_APPLY_CONFIRM=YES 필요. 단일 TX INSERT + 트랜잭션 내 검산.
 *
 * 식별/rollback: source_label=MFDS_DRUG_OTC + seed_json.applyRunId='otc-combo-draft-v1'.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  DRUG_OTC_COMBO_FAMILIES,
  DRUG_OTC_COMBO_SOURCE_LABEL,
  classifyComboFamily,
  isComboInsertable,
  buildComboDraftRowPlan,
  type ComboFamilyResolution,
  type ComboDraftRowPlan,
} from '../modules/neture/drug-import/drug-otc-combo-description-draft-plan.js';
import { extractComboDraftsFromDoc } from '../modules/neture/drug-import/drug-otc-combo-description-draft-content.js';

const GROUNDING_DOC = 'CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-GROUNDING-DRAFT-V1.md';

interface CliArgs { apply: boolean; runId: string; docsRoot: string; out: string | null }

function parseArgs(argv: string[]): CliArgs {
  const get = (n: string) => {
    const i = argv.indexOf(`--${n}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${n}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  return {
    apply: argv.includes('--apply'),
    runId: get('run-id') ?? 'otc-combo-draft-v1',
    docsRoot: get('docs-root') ?? path.resolve(process.cwd(), '../../docs/checks'),
    out: get('out') ?? null,
  };
}

async function resolveFamilies(ds: import('typeorm').DataSource): Promise<Map<string, ComboFamilyResolution>> {
  const atcs = DRUG_OTC_COMBO_FAMILIES.map((f) => f.atc7);
  const rows: {
    atc7: string; master_total: string; otc: string; rx: string; mfr: string; spd_masters: string;
    anchor_cand: string | null; anchor_master: string | null;
  }[] = await ds.query(
    `WITH fam AS (
       SELECT upper(substr(e.atc_code,1,7)) atc7, m.id mid, m.name nm, m.drug_category dc, m.manufacturer_name mfr
       FROM product_drug_extensions e JOIN product_masters m ON m.id=e.product_master_id
       WHERE upper(substr(e.atc_code,1,7)) = ANY($1)
     ),
     sc AS (
       SELECT f.atc7,
         count(distinct f.mid) master_total,
         count(distinct f.mid) filter (where f.dc='otc') otc,
         count(distinct f.mid) filter (where f.dc='rx') rx,
         count(distinct f.mfr) mfr,
         count(distinct s.master_id) spd_masters
       FROM fam f LEFT JOIN shared_product_descriptions s ON s.master_id=f.mid AND s.deleted_at IS NULL
       GROUP BY f.atc7
     ),
     anc AS (
       SELECT f.atc7, (array_agg(c.id ORDER BY c.id))[1] cid, (array_agg(f.mid ORDER BY c.id))[1] amid
       FROM fam f JOIN product_candidates c ON c.matched_product_master_id=f.mid
       WHERE f.dc='otc' GROUP BY f.atc7
     )
     SELECT sc.atc7, sc.master_total, sc.otc, sc.rx, sc.mfr, sc.spd_masters,
            anc.cid::text AS anchor_cand, am.name AS anchor_master
     FROM sc LEFT JOIN anc ON anc.atc7=sc.atc7
     LEFT JOIN product_masters am ON am.id=anc.amid`,
    [atcs],
  );
  const map = new Map<string, ComboFamilyResolution>();
  for (const r of rows) {
    // 계열 대표 canonical SPD 샘플 2개
    const spd: { id: string }[] = await ds.query(
      `SELECT s.id::text AS id
       FROM product_drug_extensions e JOIN product_masters m ON m.id=e.product_master_id AND m.drug_category='otc'
       JOIN shared_product_descriptions s ON s.master_id=m.id AND s.deleted_at IS NULL AND s.status='canonical'
       WHERE upper(substr(e.atc_code,1,7))=$1 LIMIT 2`,
      [r.atc7],
    );
    map.set(r.atc7, {
      atc7: r.atc7,
      masterTotal: Number(r.master_total),
      otc: Number(r.otc),
      rx: Number(r.rx),
      manufacturers: Number(r.mfr),
      spdMasters: Number(r.spd_masters),
      anchorCandidateId: r.anchor_cand,
      anchorMasterName: r.anchor_master,
      spdSampleIds: spd.map((x) => x.id),
    });
  }
  return map;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // ── 본문 ETL (파일 read, DB 무관) ──
  const abs = path.join(args.docsRoot, GROUNDING_DOC);
  if (!fs.existsSync(abs)) throw new Error(`문서 없음: ${abs}`);
  const contentMap = extractComboDraftsFromDoc(fs.readFileSync(abs, 'utf-8'));

  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정 — Cloud SQL Auth Proxy(127.0.0.1) 필요');
  const ds = new DataSource({
    type: 'postgres', host, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
    ...(host && !host.startsWith('/cloudsql/') && !/^(127\.0\.0\.1|localhost)$/.test(host)
      ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await ds.initialize();

  try {
    const resolutions = await resolveFamilies(ds);
    const rows: ComboDraftRowPlan[] = [];
    const rejects: { atc7: string; reason: string }[] = [];
    const missingContent: string[] = [];
    const anchorSeen = new Set<string>();

    for (const f of DRUG_OTC_COMBO_FAMILIES) {
      const r = resolutions.get(f.atc7) ?? {
        atc7: f.atc7, masterTotal: 0, otc: 0, rx: 0, manufacturers: 0, spdMasters: 0,
        anchorCandidateId: null, anchorMasterName: null, spdSampleIds: [],
      };
      const content = contentMap.get(f.contentLabel);
      const verdict = classifyComboFamily(f, r, !!content);
      if (!isComboInsertable(verdict)) {
        rejects.push({ atc7: f.atc7, reason: verdict });
        if (verdict === 'EXCLUDE_no_content') missingContent.push(`${f.atc7} :: ${f.contentLabel}`);
        continue;
      }
      const row = buildComboDraftRowPlan(f, r, verdict, content!);
      if (anchorSeen.has(row.candidate_id)) {
        rejects.push({ atc7: f.atc7, reason: 'anchor_collision' });
        continue;
      }
      anchorSeen.add(row.candidate_id);
      rows.push(row);
    }

    // ── 사전조건 (write 전 필수) ──
    const [{ count: existingRun }]: { count: string }[] = await ds.query(
      `SELECT COUNT(*) AS count FROM product_candidate_description_drafts
       WHERE source_label=$1 AND seed_json->>'applyRunId'=$2 AND deleted_at IS NULL`,
      [DRUG_OTC_COMBO_SOURCE_LABEL, args.runId],
    );
    const [{ count: totalRows }]: { count: string }[] = await ds.query(
      `SELECT COUNT(*) AS count FROM product_candidate_description_drafts WHERE deleted_at IS NULL`,
    );
    const anchorIds = rows.map((r) => r.candidate_id);
    const [{ count: anchorExist }]: { count: string }[] = anchorIds.length
      ? await ds.query(
          `SELECT COUNT(*) AS count FROM product_candidates WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
          [anchorIds],
        )
      : [{ count: '0' }];
    // 앵커가 이미 활성 draft 를 가지고 있는지 (unique 충돌 예방)
    const [{ count: anchorActiveDraft }]: { count: string }[] = anchorIds.length
      ? await ds.query(
          `SELECT COUNT(*) AS count FROM product_candidate_description_drafts
           WHERE candidate_id = ANY($1::uuid[]) AND draft_type='store_description' AND language='ko' AND deleted_at IS NULL`,
          [anchorIds],
        )
      : [{ count: '0' }];

    const preconditions = {
      existingThisRunId: Number(existingRun),
      draftTableTotalRows: Number(totalRows),
      insertable: rows.length,
      distinctAnchors: anchorSeen.size,
      anchorsExistInDb: Number(anchorExist),
      anchorActiveDraftConflicts: Number(anchorActiveDraft),
      contentMatched: rows.length,
      missingContent: missingContent.length,
      excluded: rejects.length,
    };
    const preconditionOk =
      preconditions.existingThisRunId === 0 &&
      preconditions.missingContent === 0 &&
      preconditions.distinctAnchors === rows.length &&
      preconditions.anchorsExistInDb === rows.length &&
      preconditions.anchorActiveDraftConflicts === 0 &&
      rows.length > 0;

    let inserted = 0;
    const mode = args.apply ? 'apply' : 'dry-run';

    if (args.apply) {
      if (process.env.DRUG_OTC_COMBO_DRAFT_APPLY_CONFIRM !== 'YES') {
        throw new Error('APPLY_BLOCKED: --apply 는 DRUG_OTC_COMBO_DRAFT_APPLY_CONFIRM=YES 필요');
      }
      if (!preconditionOk) throw new Error(`APPLY_ABORTED: 사전조건 위반 → ${JSON.stringify(preconditions)}`);
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (const row of rows) {
          const seed = { ...row.seed_json, applyRunId: args.runId };
          await qr.query(
            `INSERT INTO product_candidate_description_drafts
              (candidate_id, source_label, source_identifier_value, draft_type, language,
               title, summary, content_json, content_html, seed_json, guard_result,
               review_status, review_flags, ai_provider, ai_model, ai_policy_scope, ai_cost_estimate, generated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
             ON CONFLICT (candidate_id, draft_type, language) WHERE deleted_at IS NULL DO NOTHING`,
            [
              row.candidate_id, row.source_label, row.source_identifier_value, row.draft_type, row.language,
              row.title, row.summary, JSON.stringify(row.content_json), row.content_html,
              JSON.stringify(seed), JSON.stringify(row.guard_result),
              row.review_status, row.review_flags, row.ai_provider, row.ai_model, row.ai_policy_scope,
              row.ai_cost_estimate, row.generated_at,
            ],
          );
        }
        const [{ count: applied }]: { count: string }[] = await qr.query(
          `SELECT COUNT(*) AS count FROM product_candidate_description_drafts
           WHERE source_label=$1 AND seed_json->>'applyRunId'=$2 AND deleted_at IS NULL`,
          [DRUG_OTC_COMBO_SOURCE_LABEL, args.runId],
        );
        inserted = Number(applied);
        if (inserted !== rows.length) {
          throw new Error(`INSERT_COUNT_MISMATCH: applied ${inserted} != target ${rows.length} → rollback`);
        }
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    const report = {
      wo: 'WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1',
      mode, runId: args.runId, model: 'A-family', sourceLabel: DRUG_OTC_COMBO_SOURCE_LABEL,
      families: DRUG_OTC_COMBO_FAMILIES.length,
      registryGroupKeysCovered: rows.reduce((n, r) => n + (r.seed_json.registryGroupCount as number), 0),
      preconditions, preconditionOk, inserted, dbWrite: inserted,
    };

    console.log('───────────────────────────────────────────────');
    console.log(`Drug OTC COMBO Draft — DB ${mode.toUpperCase()} (A-family)`);
    console.log('───────────────────────────────────────────────');
    console.log(`runId              : ${args.runId}`);
    console.log(`insertable(family) : ${rows.length}`);
    console.log(`registryGroupCover : ${report.registryGroupKeysCovered}`);
    console.log(`excluded           : ${rejects.length} ${JSON.stringify(rejects)}`);
    console.log(`preconditions      : ${JSON.stringify(preconditions)}`);
    console.log(`preconditionOk     : ${preconditionOk}`);
    console.log(`inserted           : ${inserted}  dbWrite: ${inserted}`);
    if (missingContent.length) console.log(`⚠ missingContent   : ${JSON.stringify(missingContent)}`);
    console.log('── preview (title → anchor / registryGroups / efficacyHead / flags) ──');
    for (const p of rows) {
      const cj = p.content_json as { efficacy?: string; registryGroupCount?: number };
      console.log(`  ${p.title}`);
      console.log(`    anchor=${p.candidate_id.slice(0, 8)}… (${(p.seed_json.groupScope as any).anchorMaster}) groups=${cj.registryGroupCount} spd=${(p.seed_json.groupScope as any).spdMasters}`);
      console.log(`    효능=${(cj.efficacy ?? '').slice(0, 60)}…`);
      console.log(`    flags=${JSON.stringify(p.review_flags)}`);
    }

    if (args.out) {
      const outAbs = path.isAbsolute(args.out) ? args.out : path.resolve(process.cwd(), args.out);
      fs.writeFileSync(outAbs, JSON.stringify({ report, rows }, null, 2), 'utf-8');
      console.log(`out                : ${outAbs}`);
    }
    console.log('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    console.log('JSON_REPORT_END');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  console.error('[drug-otc-combo-description-draft-apply] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
