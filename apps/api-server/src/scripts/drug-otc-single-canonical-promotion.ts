/**
 * OTC single 초안(66그룹) → shared_product_descriptions canonical 승격 — 전개 기반 경로
 *
 * WO-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1
 * 선행: CHECK-O4O-OTC-KO-CANONICAL-PROMOTION-READINESS-V1 (승격 조건·예상 수량 확정)
 *
 * 배경: single 초안은 `seed_json.groupScope.masterIds` 가 없어 기존 apply(masterIds SSOT)로는
 *   전부 NO_MASTERIDS 보류였다. 본 경로는 **성분·함량·제형 3축 전개**(공용 모듈)로 멤버십을 얻는다.
 *   **dry-run 과 apply 가 같은 전개 함수를 쓴다** → 결과 불일치가 구조적으로 불가능.
 *
 * 정책(READINESS §6 확정):
 *   - 정책 A = **SPD 가 전혀 없는 master 에만** 신규 canonical INSERT.
 *     기존 canonical 은 물론 candidate/hidden 이 있어도 **건드리지 않는다** → **UPDATE 0**.
 *   - content = **구조화 필드**(efficacy·usage·caution·summaryTable) → sd-* HTML.
 *     `bodyMarkdown` **사용 금지**(내부 편집 주석 노출 — CR-021).
 *   - 필수 4필드 누락 그룹은 **승격 보류**(INCOMPLETE_FIELDS).
 *   - master 당 canonical 1개 계약: `NOT EXISTS` 가드 + 그룹 간 master 중복 사전 차단.
 *
 * DB write 게이트(둘 다 필요):
 *   `--apply` AND `DRUG_OTC_SINGLE_CANONICAL_APPLY_CONFIRM=YES`
 *   ⚠️ 본 WO 는 **경로 구현 + dry-run 까지**다. 실제 apply 는 **별도 승인 WO**.
 *
 * 재실행 안전: INSERT 는 `NOT EXISTS(SPD)` 조건 → 재실행 시 자동 no-op.
 *
 * Usage(dry-run):
 *   DB_HOST=127.0.0.1 DB_PORT=5438 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-single-canonical-promotion.ts
 */

import {
  expandDrugOtcSingleGroups,
  selectPromotionTargets,
  findCrossGroupDuplicateMasters,
  type GroupTarget,
} from '../modules/neture/drug-import/drug-otc-single-group-expansion.js';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const OTC_SOURCE_LABEL = 'MFDS_DRUG_OTC';
/** 승격 SPD source_type — 감사·rollback·필터용 전용 값(entity union 등재됨). */
const PROMOTION_SOURCE_TYPE = 'mfds_drug_otc';
const PROMOTION_LANGUAGE = 'ko';
/** 승격 status. 초안이 needs_review 라 canonical 승격은 승인 사안 → apply WO 에서 재확인. */
const PROMOTION_STATUS = 'canonical';

interface PlanRow {
  gk: string;
  title: string;
  verdict: string | null;
  expandedMasters: number;
  excludedExistingCanonical: number;
  targets: number;
  contentHtmlLen: number;
  eligible: boolean;
  reason: string;
}

async function main(): Promise<void> {
  const apply =
    process.argv.slice(2).includes('--apply') &&
    process.env.DRUG_OTC_SINGLE_CANONICAL_APPLY_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

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
    ...(host && !host.startsWith('/cloudsql/') && !/^(127\.0\.0\.1|localhost)$/.test(host)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });
  await ds.initialize();

  const plans: PlanRow[] = [];
  const writable: { target: GroupTarget; contentHtml: string; summary: string | null }[] = [];
  let insertedTotal = 0;

  try {
    // ── 1) 전개 (dry-run·apply 공용 경로) ──
    const rows = await expandDrugOtcSingleGroups(ds, {
      sourceLabel: OTC_SOURCE_LABEL,
      promotionSourceType: PROMOTION_SOURCE_TYPE,
    });
    const targets = selectPromotionTargets(rows, 'A_no_spd_only');

    // ── 2) 그룹 간 master 중복 방어 (master 당 canonical 1개 계약) ──
    const dup = findCrossGroupDuplicateMasters(targets);
    if (dup.length) throw new Error(`그룹 간 master 중복 ${dup.length}건 — apply 중단 (예: ${dup[0]})`);

    // ── 3) 초안 content_json 로드 → 구조화 필드로 소비자 HTML 생성 ──
    const drafts: { candidate_id: string; content_json: Record<string, unknown>; title: string }[] =
      await ds.query(
        `SELECT candidate_id::text, content_json, title
         FROM product_candidate_description_drafts
         WHERE source_label = $1 AND deleted_at IS NULL`,
        [OTC_SOURCE_LABEL],
      );
    const draftById = new Map(drafts.map((d) => [d.candidate_id, d]));

    for (const t of targets) {
      const d = draftById.get(t.candidateId);
      if (!d) {
        plans.push({ ...planBase(t), eligible: false, contentHtmlLen: 0, reason: 'DRAFT_NOT_FOUND' });
        continue;
      }
      const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
      if (built.missing.length) {
        plans.push({
          ...planBase(t),
          eligible: false,
          contentHtmlLen: 0,
          reason: `INCOMPLETE_FIELDS: ${built.missing.join(',')} — 승격 보류`,
        });
        continue;
      }
      if (t.masterIds.length === 0) {
        plans.push({
          ...planBase(t),
          eligible: false,
          contentHtmlLen: built.html.length,
          reason: 'NO_TARGET: 전개된 master 가 전부 기존 SPD 보유 — 신규 INSERT 없음',
        });
        continue;
      }
      const summary =
        String((d.content_json as Record<string, Record<string, string>>)?.summaryTable?.['주요 증상'] ?? '') ||
        null;
      plans.push({
        ...planBase(t),
        eligible: true,
        contentHtmlLen: built.html.length,
        reason: `정책 A 승격 대상${t.verdict && t.verdict !== 'INSERT_auto' ? ` ⚠️${t.verdict}(약사 검토 강화)` : ''}`,
      });
      writable.push({ target: t, contentHtml: built.html, summary });
    }

    const expectedInsert = writable.reduce((n, w) => n + w.target.masterIds.length, 0);

    // ── 4) apply (이중 게이트) ──
    if (apply) {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (const w of writable) {
          const res = await qr.query(
            `INSERT INTO shared_product_descriptions
               (master_id, content, summary, source_type, source_ref_id, status, language, created_at, updated_at)
             SELECT mid, $4, $5, $2, $3::uuid, $6, $7, now(), now()
             FROM unnest($1::uuid[]) mid
             WHERE NOT EXISTS(
               SELECT 1 FROM shared_product_descriptions s
               WHERE s.master_id = mid AND s.deleted_at IS NULL)
             RETURNING id`,
            [
              w.target.masterIds,
              PROMOTION_SOURCE_TYPE,
              w.target.candidateId,
              w.contentHtml,
              w.summary,
              PROMOTION_STATUS,
              PROMOTION_LANGUAGE,
            ],
          );
          insertedTotal += Array.isArray(res) ? res.length : 0;
        }
        // post-count: master 당 canonical 중복 0 검증
        const [{ dup: dupCanon }]: { dup: string }[] = await qr.query(
          `SELECT count(*)::text AS dup FROM (
             SELECT master_id FROM shared_product_descriptions
             WHERE deleted_at IS NULL AND status='canonical'
             GROUP BY master_id HAVING count(*) > 1) x`,
        );
        if (Number(dupCanon) > 0) throw new Error(`master 당 canonical 중복 ${dupCanon} — 롤백`);
        if (insertedTotal !== expectedInsert)
          throw new Error(`INSERT 수 불일치: 실제 ${insertedTotal} ≠ 예상 ${expectedInsert} — 롤백`);
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    // ── 5) 리포트 ──
    const eligible = plans.filter((p) => p.eligible);
    console.log('───────────────────────────────────────────────');
    console.log(`OTC single 초안 → canonical 승격 (${mode})`);
    console.log('───────────────────────────────────────────────');
    console.log(`draftGroups(전개됨)  : ${plans.length}`);
    console.log(`targetMasters(전개)  : ${rows.length} (distinct ${new Set(rows.map((r) => r.masterId)).size})`);
    console.log(`기존 canonical 보유  : ${rows.filter((r) => r.hasCanonical).length}`);
    console.log(`설명 전무(정책 A 대상): ${rows.filter((r) => !r.hasAnySpd).length}`);
    console.log(`승격 가능 그룹       : ${eligible.length} / 보류 ${plans.length - eligible.length}`);
    console.log(`예상 INSERT rows     : ${expectedInsert}`);
    console.log(`예상 UPDATE rows     : 0 (UPDATE 경로 없음)`);
    console.log(`그룹 간 master 중복  : 0`);
    console.log(`dbWrite              : ${apply ? insertedTotal : 0}`);
    console.log('JSON_REPORT_BEGIN');
    console.log(
      JSON.stringify({
        wo: 'WO-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1',
        mode,
        dbWrite: apply ? insertedTotal : 0,
        policy: 'A_no_spd_only',
        expansion: {
          draftGroups: plans.length,
          targetMasterRows: rows.length,
          distinctMasters: new Set(rows.map((r) => r.masterId)).size,
          withCanonical: rows.filter((r) => r.hasCanonical).length,
          noSpd: rows.filter((r) => !r.hasAnySpd).length,
          alreadyPromoted: rows.filter((r) => r.hasOtcPromotion).length,
        },
        expectedInsert,
        expectedUpdate: 0,
        crossGroupDuplicateMasters: 0,
        eligibleGroups: eligible.length,
        heldGroups: plans.filter((p) => !p.eligible).map((p) => ({ gk: p.gk, reason: p.reason })),
        byVerdict: countBy(eligible, (p) => p.verdict ?? 'null'),
        contentSource: 'structured fields → sd-* (buildDrugOtcConsumerHtml). bodyMarkdown 미사용',
        topGroups: eligible
          .slice()
          .sort((a, b) => b.targets - a.targets)
          .slice(0, 8)
          .map((p) => ({ gk: p.gk, verdict: p.verdict, expanded: p.expandedMasters, targets: p.targets })),
      }),
    );
    console.log('JSON_REPORT_END');
  } finally {
    await ds.destroy();
  }
}

function planBase(t: GroupTarget): Omit<PlanRow, 'eligible' | 'contentHtmlLen' | 'reason'> {
  return {
    gk: t.gk,
    title: t.title,
    verdict: t.verdict,
    expandedMasters: t.expandedMasters,
    excludedExistingCanonical: t.excludedExistingCanonical,
    targets: t.masterIds.length,
  };
}

function countBy<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of arr) out[key(a)] = (out[key(a)] ?? 0) + 1;
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
