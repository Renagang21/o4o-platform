/**
 * 비타민C 1000mg 정제(A11GA01) — masterTotal 31→38 보정 + masterIds 저장 + canonical 승격 편입
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-VITC1000-PERSIST-PROMOTE-V1
 * 선행: MISMATCH-FIX-V1(비타민C fix_ready, corrected_target 38) / PROMOTION APPLY(d661d0fa6, 18그룹)
 *
 * 배경: 비타민C 1000mg draft(6f143bbc)의 groupScope.masterTotal 이 31(stale)이라 mismatch 로 승격 제외됐다.
 *   실제 1000mg급 = spec {1000,1030,1030.9,1031}밀리그램(염 보정 규격) = 38. STRENGTH-SPLIT-V1 §3.1 확정.
 *   → masterTotal 38 보정 + masterIds 38 저장 후, 동일 정책(masterIds 기반, mfds_drug_otc_nutrition_combo,
 *     content=draftMarkdownToHtml(인용=내부 주석 렌더 제외), 기존 canonical 보존)으로 canonical 승격 편입.
 *
 * 단일 그룹 전용(비타민C만). Mg·B2·B6 액제·revise/hold 3건 미접촉.
 *
 * DB write 게이트: `--apply` AND DRUG_OTC_NUTRITION_COMBO_VITC1000_CONFIRM=YES.
 *   write = (1) draft seed_json.groupScope {masterTotal:38, masterIds:[38]} + updated_at,
 *           (2) shared_product_descriptions canonical INSERT(기존 canonical 없는 master만).
 *   단일 트랜잭션 + post-verify(rollback 가드).
 *
 * Usage(dry-run):
 *   DB_HOST=127.0.0.1 DB_PORT=5433 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-nutrition-combo-vitc1000-persist-promote.ts
 */

const RUN_ID = 'otc-nutrition-combo-draft-v1';
import { draftMarkdownToHtml } from '../modules/neture/drug-import/draft-markdown-to-html.js';

const CANDIDATE_ID = '6f143bbc-ff49-4ffc-9271-42e50cf2e84d'; // 비타민 C 1000mg 정제
const ATC7 = 'A11GA01';
const CORRECTED_MASTER_TOTAL = 38;
/** 1000mg급 spec 버킷(염 보정 규격 포함) — MISMATCH-FIX-V1 §2 */
const VITC_1000_SPECS = ['1000밀리그램', '1030밀리그램', '1030.9밀리그램', '1031밀리그램'];
const PROMOTION_SOURCE_TYPE = 'mfds_drug_otc_nutrition_combo';
const PROMOTION_LANGUAGE = 'ko';

async function main(): Promise<void> {
  const apply =
    process.argv.slice(2).includes('--apply') &&
    process.env.DRUG_OTC_NUTRITION_COMBO_VITC1000_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정');
  const ds = new DataSource({
    type: 'postgres', host, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
    ...(host && !host.startsWith('/cloudsql/') && !/^(127\.0\.0\.1|localhost)$/.test(host)
      ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await ds.initialize();

  try {
    // draft 로드 + 안전검증
    const [draft]: { candidate_id: string; title: string; content_json: any; seed_json: any; review_status: string }[] =
      await ds.query(
        `SELECT candidate_id::text, title, content_json, seed_json, review_status
         FROM product_candidate_description_drafts
         WHERE candidate_id=$1::uuid AND seed_json->>'applyRunId'=$2 AND deleted_at IS NULL`,
        [CANDIDATE_ID, RUN_ID],
      );
    if (!draft) throw new Error('비타민C draft 미발견');
    if (draft.review_status !== 'needs_review') throw new Error('review_status != needs_review');
    const groupKey = String(draft.seed_json?.groupKey ?? '');
    if (groupKey !== 'drug_otc::single::oral::a11ga01::1000mg::tablet') {
      throw new Error(`groupKey 불일치: ${groupKey}`);
    }

    // 1000mg급 masterIds (spec 버킷 + name '정' + otc)
    const [{ ids }]: { ids: string[] | null }[] = await ds.query(
      `SELECT array_agg(DISTINCT m.id) AS ids
       FROM product_masters m JOIN product_drug_extensions e ON e.product_master_id=m.id
       WHERE m.drug_category='otc' AND upper(substr(e.atc_code,1,7))=$1 AND m.name LIKE '%정%'
         AND split_part(m.specification,' / ',1) = ANY($2::text[])`,
      [ATC7, VITC_1000_SPECS],
    );
    const masterIds = ids ?? [];
    if (masterIds.length !== CORRECTED_MASTER_TOTAL) {
      throw new Error(`masterIds ${masterIds.length} != corrected_target ${CORRECTED_MASTER_TOTAL} — 재현 불일치, 중단`);
    }

    // canonical 현황
    const [row]: { valid_otc: string; existing_canon: string }[] = await ds.query(
      `SELECT
         (SELECT count(*) FROM product_masters m WHERE m.id = ANY($1::uuid[]) AND m.drug_category='otc') AS valid_otc,
         (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(
            SELECT 1 FROM shared_product_descriptions s
            WHERE s.master_id=mid AND s.deleted_at IS NULL AND s.status='canonical')) AS existing_canon`,
      [masterIds],
    );
    const validOtc = Number(row.valid_otc);
    const existingCanonical = Number(row.existing_canon);
    const newInsert = masterIds.length - existingCanonical;
    if (validOtc !== masterIds.length) throw new Error(`비-OTC master 포함 (${validOtc}/${masterIds.length})`);

    // WO-O4O-MDTOHTML-BLOCKQUOTE-SAFETY-GUARD-V1: 공용 변환기 — 인용(내부 편집 주석)은 렌더 제외.
    // 1차 원칙(구조화 필드 렌더)은 canonical-promotion 스크립트에만 적용됨 → 본 경로는 안전망 의존(CHECK §6).
    const { html: contentHtml, droppedQuoteBlocks } = draftMarkdownToHtml(
      String(draft.content_json?.bodyMarkdown ?? ''),
    );
    if (droppedQuoteBlocks > 0) console.log(`internal note dropped: ${droppedQuoteBlocks} block(s)`);
    const summary = String(draft.content_json?.summaryTable?.['사용목적'] ?? '') || null;

    let insertedTotal = 0;
    let postSeed = { masterTotal: 0, masterIdsLen: 0 };
    let postNewSourceCanon = 0;

    if (apply) {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        // (1) seed_json 보정: masterTotal 38 + masterIds 38
        await qr.query(
          `UPDATE product_candidate_description_drafts
           SET seed_json = jsonb_set(
                 jsonb_set(seed_json, '{groupScope,masterTotal}', $2::jsonb, true),
                 '{groupScope,masterIds}', $3::jsonb, true),
               updated_at = now()
           WHERE candidate_id=$1::uuid AND seed_json->>'applyRunId'=$4`,
          [CANDIDATE_ID, String(CORRECTED_MASTER_TOTAL), JSON.stringify(masterIds), RUN_ID],
        );
        // (2) canonical INSERT (기존 canonical 없는 master만)
        const res = await qr.query(
          `INSERT INTO shared_product_descriptions
             (master_id, content, summary, source_type, source_ref_id, status, language, created_at, updated_at)
           SELECT mid, $2, $3, $4, $5::uuid, 'canonical', $6, now(), now()
           FROM unnest($1::uuid[]) mid
           WHERE NOT EXISTS(
             SELECT 1 FROM shared_product_descriptions s
             WHERE s.master_id=mid AND s.deleted_at IS NULL AND s.status='canonical')
           RETURNING id`,
          [masterIds, contentHtml, summary, PROMOTION_SOURCE_TYPE, CANDIDATE_ID, PROMOTION_LANGUAGE],
        );
        insertedTotal = Array.isArray(res) ? res.length : 0;

        // post-verify
        const [seedRow]: { mt: string; ml: string }[] = await qr.query(
          `SELECT (seed_json->'groupScope'->>'masterTotal') AS mt,
                  jsonb_array_length(seed_json->'groupScope'->'masterIds') AS ml
           FROM product_candidate_description_drafts WHERE candidate_id=$1::uuid`,
          [CANDIDATE_ID],
        );
        postSeed = { masterTotal: Number(seedRow.mt), masterIdsLen: Number(seedRow.ml) };
        const [{ cnt }]: { cnt: string }[] = await qr.query(
          `SELECT count(*) AS cnt FROM shared_product_descriptions
           WHERE source_type=$1 AND source_ref_id=$2::uuid AND status='canonical' AND deleted_at IS NULL`,
          [PROMOTION_SOURCE_TYPE, CANDIDATE_ID],
        );
        postNewSourceCanon = Number(cnt);
        const [{ dup }]: { dup: string }[] = await qr.query(
          `SELECT count(*) AS dup FROM (
             SELECT master_id FROM shared_product_descriptions WHERE status='canonical' AND deleted_at IS NULL
             AND master_id = ANY($1::uuid[]) GROUP BY master_id HAVING count(*)>1) t`,
          [masterIds],
        );
        const ok = insertedTotal === newInsert && postSeed.masterTotal === CORRECTED_MASTER_TOTAL &&
          postSeed.masterIdsLen === CORRECTED_MASTER_TOTAL && postNewSourceCanon === newInsert && Number(dup) === 0;
        if (!ok) {
          await qr.rollbackTransaction();
          throw new Error(`post-verify 실패 → rollback. inserted=${insertedTotal}/${newInsert} seed=${JSON.stringify(postSeed)} newSrcCanon=${postNewSourceCanon} dup=${dup}`);
        }
        await qr.commitTransaction();
      } catch (e) {
        if (qr.isTransactionActive) await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    const report = {
      wo: 'WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-VITC1000-PERSIST-PROMOTE-V1',
      mode, candidateId: CANDIDATE_ID, groupKey,
      correctedMasterTotal: CORRECTED_MASTER_TOTAL, reproducedMasterIds: masterIds.length,
      existingCanonical, expectedNewInsert: newInsert,
      insertedTotal: apply ? insertedTotal : 0, dbWrite: apply ? insertedTotal + 1 : 0, // +1 = seed update
      postSeed: apply ? postSeed : null, postNewSourceCanon: apply ? postNewSourceCanon : null,
      contentHtmlLen: contentHtml.length,
    };
    console.log('───────────────────────────────────────────────');
    console.log(`비타민C 1000mg — persist(31→38) + promote [${mode}]`);
    console.log('───────────────────────────────────────────────');
    console.log(`groupKey            : ${groupKey}`);
    console.log(`correctedMasterTotal: ${CORRECTED_MASTER_TOTAL} (reproduced masterIds ${masterIds.length})`);
    console.log(`existingCanonical   : ${existingCanonical}`);
    console.log(`expectedNewInsert   : ${newInsert}`);
    console.log(`contentHtmlLen      : ${contentHtml.length}`);
    if (apply) {
      console.log(`inserted            : ${insertedTotal}`);
      console.log(`post seed           : masterTotal=${postSeed.masterTotal} masterIdsLen=${postSeed.masterIdsLen}`);
      console.log(`post newSrc canon   : ${postNewSourceCanon}`);
    }
    console.log(`dbWrite             : ${report.dbWrite}`);
    console.log('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    console.log('JSON_REPORT_END');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  console.error('[drug-otc-nutrition-combo-vitc1000-persist-promote] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
