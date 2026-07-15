/**
 * OTC 영문 그룹 → master 전개 DRY-RUN (read-only 전용)
 *
 * WO-O4O-OTC-EN-GROUP-TO-MASTER-FANOUT-DESIGN-V1
 *
 * **DB write 0** — INSERT/UPDATE 경로가 이 파일에 존재하지 않는다. 실제 저장은 별도 승인 WO.
 *
 * 구조: 번역은 그룹당 1회(TranslationUnit) · 저장은 연결 master 전체에 전개(PersistUnit).
 *   멤버십 SSOT = 이미 저장된 한국어 canonical 행 → ko/en 축이 어긋날 수 없다.
 *
 * Usage:
 *   DB_HOST=127.0.0.1 DB_PORT=<proxy> DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-en-fanout-dryrun.ts
 */

import {
  loadEnFanoutRows,
  buildEnFanoutPlan,
} from '../modules/neture/drug-import/drug-otc-en-fanout.js';
import { buildDrugOtcTranslationInput } from '../modules/neture/drug-import/drug-otc-translation-input.js';

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정 — Cloud SQL Auth Proxy(127.0.0.1) 필요');
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
  });
  await ds.initialize();

  try {
    const rows = await loadEnFanoutRows(ds);
    const plan = buildEnFanoutPlan(rows);

    // 번역 입력(그룹당 1) — 저장 입력과 분리됨을 실제로 산출해 확인
    const drafts: { candidate_id: string; title: string; content_json: Record<string, unknown> }[] =
      await ds.query(
        `SELECT candidate_id::text, title, content_json
         FROM product_candidate_description_drafts
         WHERE candidate_id = ANY($1::uuid[]) AND deleted_at IS NULL`,
        [plan.translationUnits.map((u) => u.candidateId)],
      );
    const byId = new Map(drafts.map((d) => [d.candidate_id, d]));
    const translationInputs = plan.translationUnits.map((u) => {
      const d = byId.get(u.candidateId);
      const input = buildDrugOtcTranslationInput((d?.content_json ?? {}) as never, {
        title: u.title,
        groupKey: u.groupKey,
      });
      return { unit: u, input };
    });

    const routeDist: Record<string, number> = {};
    let noteCount = 0;
    for (const t of translationInputs) {
      const r = t.input.meta.route.route ?? 'needs_review';
      routeDist[r] = (routeDist[r] ?? 0) + 1;
      if (t.input.translatorNote) noteCount++;
    }

    console.log('───────────────────────────────────────────────');
    console.log('OTC 영문 그룹 → master 전개 (DRY-RUN · DB write 0)');
    console.log('───────────────────────────────────────────────');
    console.log(`그룹(번역 단위)      : ${plan.totals.groups}`);
    console.log(`대상 master(ko 보유) : ${plan.totals.masters}`);
    console.log(`그룹 간 master 중복  : ${plan.crossGroupDuplicateMasters.length}`);
    console.log(`기존 en 보유(제외)   : ${plan.totals.existingEn}`);
    console.log(`예상 INSERT rows     : ${plan.totals.expectedInsert}`);
    console.log(`예상 UPDATE rows     : ${plan.totals.expectedUpdate}`);
    console.log(`번역 입력 route 분포 : ${JSON.stringify(routeDist)}`);
    console.log(`translatorNote 보유  : ${noteCount}그룹`);
    console.log(`dbWrite              : 0`);
    console.log('JSON_REPORT_BEGIN');
    console.log(
      JSON.stringify({
        wo: 'WO-O4O-OTC-EN-GROUP-TO-MASTER-FANOUT-DESIGN-V1',
        mode: 'dry-run',
        dbWrite: 0,
        totals: plan.totals,
        crossGroupDuplicateMasters: plan.crossGroupDuplicateMasters.length,
        routeDistribution: routeDist,
        translatorNoteGroups: noteCount,
        groupsWithExistingEn: plan.persistUnits
          .filter((u) => u.skippedExistingEn > 0)
          .map((u) => ({ gk: u.groupKey, total: u.totalMasters, skipped: u.skippedExistingEn, targets: u.targetMasterIds.length })),
        topGroups: plan.persistUnits
          .slice()
          .sort((a, b) => b.totalMasters - a.totalMasters)
          .slice(0, 8)
          .map((u) => ({ gk: u.groupKey, masters: u.totalMasters, targets: u.targetMasterIds.length })),
      }),
    );
    console.log('JSON_REPORT_END');
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
