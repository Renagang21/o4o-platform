/**
 * Drug OTC Store Description Draft — DB APPLY (dry-run 기본, --apply 이중 게이트)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1
 *
 * 설계 WO 의 dry-run 으로 검증된 OTC 설명 draft 를 product_candidate_description_drafts 에 적재한다.
 * 본문(마크다운)→content_json ETL 포함. **draft 적재까지만** — SharedProductDescription/canonical/
 * ProductMaster/ProductCandidate/Identifier/Extension 은 절대 건드리지 않는다.
 *
 * 모드:
 *   - 기본(dry-run): SELECT only. 적재 대상·본문 매칭·사전조건·샘플만 산출. **write 0**.
 *   - --apply: env DRUG_OTC_DRAFT_APPLY_CONFIRM=YES 필요. 단일 트랜잭션 INSERT. 사전조건 위반 시 즉시 중단.
 *
 * 식별/rollback: 모든 행 source_label=MFDS_DRUG_OTC + seed_json.applyRunId=<runId>.
 *   rollback(별도 승인 필요): DELETE ... WHERE source_label='MFDS_DRUG_OTC' AND seed_json->>'applyRunId'=<runId>.
 *
 * Usage:
 *   # dry-run
 *   DB_HOST=127.0.0.1 DB_PORT=15432 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-description-draft-apply.ts
 *   # apply (이중 게이트)
 *   ... DRUG_OTC_DRAFT_APPLY_CONFIRM=YES npx tsx src/scripts/drug-otc-description-draft-apply.ts --apply --run-id otc-v1
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  DRUG_OTC_DESCRIPTION_GROUPS,
  classifyGroup,
  isInsertable,
  buildDrugOtcDraftRowPlan,
  DRUG_OTC_SOURCE_LABEL,
  type DrugOtcDraftRowPlan,
} from '../modules/neture/drug-import/drug-otc-description-draft-plan.js';
import { resolveDrugOtcGroups } from '../modules/neture/drug-import/drug-otc-description-draft-resolve.js';
import { extractAllDrafts } from '../modules/neture/drug-import/drug-otc-description-draft-content.js';

const DOC_FILES = [
  'CHECK-O4O-DRUG-OTC-ONE-GROUP-DESCRIPTION-PILOT-V1.md',
  'CHECK-O4O-DRUG-OTC-DESCRIPTION-TEMPLATE-AND-5-GROUP-DRAFT-V1.md',
  'CHECK-O4O-DRUG-OTC-DESCRIPTION-20-GROUP-DRAFT-V1.md',
  'CHECK-O4O-DRUG-OTC-DESCRIPTION-50-GROUP-DRAFT-V1.md',
];

interface CliArgs {
  apply: boolean;
  runId: string;
  docsRoot: string;
  samples: number;
  out: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (n: string) => {
    const i = argv.indexOf(`--${n}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${n}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const has = (n: string) => argv.includes(`--${n}`);
  return {
    apply: has('apply'),
    runId: get('run-id') ?? `otc-${new Date().toISOString().slice(0, 10)}`,
    docsRoot: get('docs-root') ?? path.resolve(process.cwd(), '../../docs/checks'),
    samples: parseInt(get('samples') ?? '8', 10),
    out: get('out') ?? null,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // ── 본문 ETL (파일 read, DB 무관) ──
  const docTexts = DOC_FILES.map((f) => {
    const abs = path.join(args.docsRoot, f);
    if (!fs.existsSync(abs)) throw new Error(`문서 없음: ${abs}`);
    return fs.readFileSync(abs, 'utf-8');
  });
  const contentMap = extractAllDrafts(docTexts);

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
    const resolutions = await resolveDrugOtcGroups(ds);

    // ── 적재 대상 조립 ──
    const rows: DrugOtcDraftRowPlan[] = [];
    const rejects: { seq: number; label: string; reason: string }[] = [];
    const missingContent: string[] = [];
    const anchorSeen = new Set<string>();

    for (const f of DRUG_OTC_DESCRIPTION_GROUPS) {
      const r = resolutions.get(f.seq) ?? {
        masterTotal: 0, otc: 0, rx: 0, otherCat: 0, manufacturers: 0, spdMasters: 0, anchorMasters: 0, anchorCandidateId: null,
      };
      const verdict = classifyGroup(f, r);
      if (!isInsertable(verdict)) {
        rejects.push({ seq: f.seq, label: f.label, reason: verdict });
        continue;
      }
      const content = contentMap.get(f.label);
      if (!content) {
        missingContent.push(`#${f.seq} ${f.label}`);
        continue;
      }
      const row = buildDrugOtcDraftRowPlan(f, r, verdict, content);
      if (anchorSeen.has(row.candidate_id)) {
        rejects.push({ seq: f.seq, label: f.label, reason: 'anchor_collision' });
        continue;
      }
      anchorSeen.add(row.candidate_id);
      rows.push(row);
    }

    // ── 사전조건 (write 전 필수) ──
    const [{ count: existingLabel }]: { count: string }[] = await ds.query(
      `SELECT COUNT(*) AS count FROM product_candidate_description_drafts WHERE source_label=$1 AND deleted_at IS NULL`,
      [DRUG_OTC_SOURCE_LABEL],
    );
    const [{ count: totalRows }]: { count: string }[] = await ds.query(
      `SELECT COUNT(*) AS count FROM product_candidate_description_drafts WHERE deleted_at IS NULL`,
    );
    // 앵커 candidate 실재 확인
    const anchorIds = rows.map((r) => r.candidate_id);
    const [{ count: anchorExist }]: { count: string }[] = anchorIds.length
      ? await ds.query(
          `SELECT COUNT(*) AS count FROM product_candidates WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
          [anchorIds],
        )
      : [{ count: '0' }];

    const preconditions = {
      existingMfdsDrugOtcRows: Number(existingLabel),
      draftTableTotalRows: Number(totalRows),
      insertable: rows.length,
      distinctAnchors: anchorSeen.size,
      anchorsExistInDb: Number(anchorExist),
      contentMatched: rows.length,
      missingContent: missingContent.length,
      excluded: rejects.length,
    };
    const preconditionOk =
      preconditions.existingMfdsDrugOtcRows === 0 &&
      preconditions.missingContent === 0 &&
      preconditions.distinctAnchors === rows.length &&
      preconditions.anchorsExistInDb === rows.length &&
      rows.length > 0;

    let inserted = 0;
    const mode = args.apply ? 'apply' : 'dry-run';

    if (args.apply) {
      if (process.env.DRUG_OTC_DRAFT_APPLY_CONFIRM !== 'YES') {
        throw new Error('APPLY_BLOCKED: --apply 는 DRUG_OTC_DRAFT_APPLY_CONFIRM=YES 필요');
      }
      if (!preconditionOk) {
        throw new Error(`APPLY_ABORTED: 사전조건 위반 → ${JSON.stringify(preconditions)}`);
      }
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
        // 트랜잭션 내 검산: 이 runId 로 적재된 수 == rows.length
        const [{ count: applied }]: { count: string }[] = await qr.query(
          `SELECT COUNT(*) AS count FROM product_candidate_description_drafts
           WHERE source_label=$1 AND seed_json->>'applyRunId'=$2 AND deleted_at IS NULL`,
          [DRUG_OTC_SOURCE_LABEL, args.runId],
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
      wo: 'WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1',
      mode,
      runId: args.runId,
      sourceLabel: DRUG_OTC_SOURCE_LABEL,
      offlineDraftGroups: DRUG_OTC_DESCRIPTION_GROUPS.length,
      preconditions,
      preconditionOk,
      inserted,
      dbWrite: inserted,
    };

    console.log('───────────────────────────────────────────────');
    console.log(`Drug OTC Store Description Draft — DB ${mode.toUpperCase()}`);
    console.log('───────────────────────────────────────────────');
    console.log(`runId              : ${args.runId}`);
    console.log(`insertable         : ${rows.length}`);
    console.log(`contentMatched     : ${rows.length} (missingContent ${missingContent.length})`);
    console.log(`excluded           : ${rejects.length} ${JSON.stringify(rejects.map((r) => `#${r.seq}:${r.reason}`))}`);
    console.log(`preconditions      : ${JSON.stringify(preconditions)}`);
    console.log(`preconditionOk     : ${preconditionOk}`);
    console.log(`inserted           : ${inserted}`);
    console.log(`dbWrite            : ${inserted}`);
    if (missingContent.length) console.log(`⚠ missingContent   : ${JSON.stringify(missingContent)}`);
    console.log('── payload samples (title → anchor / usageLabel / flags) ──');
    for (const p of rows.slice(0, args.samples)) {
      const cj = p.content_json as { usageLabel?: string };
      console.log(`  ${p.title} → ${p.candidate_id.slice(0, 8)}… / ${cj.usageLabel} / ${JSON.stringify(p.review_flags)}`);
    }

    if (args.out) {
      const abs = path.isAbsolute(args.out) ? args.out : path.resolve(process.cwd(), args.out);
      fs.writeFileSync(abs, JSON.stringify({ report, rows: rows.slice(0, args.samples), rejects }, null, 2), 'utf-8');
      console.log(`out                : ${abs} (⚠️ gitignore 경로만)`);
    }
    console.log('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    console.log('JSON_REPORT_END');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  console.error('[drug-otc-description-draft-apply] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
