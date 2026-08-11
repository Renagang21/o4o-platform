/**
 * WO-O4O-COSMETICS-PRODUCTMASTER-STORE-DESCRIPTION-FULL-APPLY-V1 — 잔여 전량 apply
 *
 * 파일럿 V2 에서 검증된 파이프라인을 잔여 모집단 전체에 적용한다.
 *   대상 = 정제된 화장품 확정 모집단 − 파일럿 500 (DB 의 woBatch 태그로 실측 제외)
 *
 * 계약 (WO §4·§5):
 *   - 기존 ProductMaster 를 UPDATE 하지 않는다. 이름이 같아도 자동 재사용하지 않는다(전량 신규 생성).
 *   - 기존 canonical 은 덮어쓰지 않는다. 신규 master 이므로 canonical 은 항상 새로 생긴다.
 *   - 모든 생성분에 rollback tag 를 부여한다.
 *   - 결손(설명서 feature 부족)은 문제 큐에 적재하고 적용은 계속한다.
 *
 * BLOCKER 는 apply 전 preflight 에서만 판정한다. preflight 실패 시 write 0 으로 중지한다.
 *
 * 옵션: --preflight-only (write 0), --limit=N (부분 적용)
 */
import { withDb } from './db.mjs';
import { readGuide, readOut, writeOut } from './lib.mjs';
import { renderHtml } from './render.mjs';

const BATCH_TAG = 'cosmetics-full-apply-v1';
const PILOT_TAG = 'cosmetics-pilot-500-v2';
const SOURCE_TYPE = 'o4o_cosmetics_retail';
const CATEGORY_SLUG = 'cosmetics';
const EXPECTED_TARGET = 32174;
const CHUNK = 100;

const PROTECTED_TYPES = ['DRUG', '건강기능식품', 'QUASI_DRUG', 'MEDICAL_DEVICE'];

const argv = process.argv.slice(2);
const preflightOnly = argv.includes('--preflight-only');
const limitArg = argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : null;

async function main() {
  const keptKeys = readOut('cleansed-population.json').keys;
  const guides = new Map(readGuide('all-guides-ko.json').guides.map((g) => [g.key, g]));
  const issues = new Map();
  for (const i of readGuide('issue-queue.json').issues) {
    if (!issues.has(i.key)) issues.set(i.key, []);
    issues.get(i.key).push(i.type);
  }

  const pre = {
    wo: 'WO-O4O-COSMETICS-PRODUCTMASTER-STORE-DESCRIPTION-FULL-APPLY-V1',
    batchTag: BATCH_TAG,
    sourceType: SOURCE_TYPE,
    cleansedPopulation: keptKeys.length,
    blockers: [],
  };

  let targets = [];
  let categoryId = null;
  const baseline = {};

  await withDb(async (q) => {
    const cat = await q(`SELECT id FROM product_categories WHERE slug = $1 LIMIT 1`, [CATEGORY_SLUG]);
    categoryId = cat.rows[0]?.id ?? null;
    if (!categoryId) pre.blockers.push('화장품 category(slug=cosmetics) 없음');

    // 이미 적용된 census key (파일럿 + 이번 배치 재실행분) 를 DB 에서 실측 제외한다.
    const { rows: applied } = await q(
      `SELECT tags->>'censusKey' k, tags->>'woBatch' b FROM product_masters
        WHERE tags->>'woBatch' IN ($1, $2)`,
      [PILOT_TAG, BATCH_TAG],
    );
    const appliedKeys = new Set(applied.map((r) => r.k));
    pre.alreadyAppliedPilot = applied.filter((r) => r.b === PILOT_TAG).length;
    pre.alreadyAppliedThisBatch = applied.filter((r) => r.b === BATCH_TAG).length;

    targets = keptKeys.filter((k) => !appliedKeys.has(k) && guides.has(k));
    pre.missingGuideBody = keptKeys.filter((k) => !appliedKeys.has(k) && !guides.has(k)).length;
    pre.target = targets.length;

    // 보호 제품군 baseline
    const { rows: rt } = await q(
      `SELECT regulatory_type t, COUNT(*)::int c FROM product_masters GROUP BY 1`,
    );
    for (const r of rt) baseline[r.t] = r.c;
    pre.baselineRegulatoryTypeCounts = baseline;

    // --- BLOCKER 판정 (WO §5)
    if (pre.alreadyAppliedPilot !== 500) {
      pre.blockers.push(`파일럿 적용분이 500 이 아니다(${pre.alreadyAppliedPilot})`);
    }
    if (Math.abs(pre.target + pre.missingGuideBody - EXPECTED_TARGET) > 50) {
      pre.blockers.push(`잔여 모집단이 기대치 ${EXPECTED_TARGET} 과 크게 다르다(${pre.target})`);
    }
    for (const t of PROTECTED_TYPES) {
      if (!baseline[t]) pre.blockers.push(`보호 제품군 baseline 누락: ${t}`);
    }
  });

  pre.willApply = LIMIT ? Math.min(LIMIT, targets.length) : targets.length;
  writeOut('full-apply-preflight.json', pre);
  console.log(
    `preflight — 정제 모집단 ${pre.cleansedPopulation} / 파일럿 기적용 ${pre.alreadyAppliedPilot} / ` +
      `이번배치 기적용 ${pre.alreadyAppliedThisBatch} / 본문 없음 ${pre.missingGuideBody} / 대상 ${pre.target} / 적용예정 ${pre.willApply}`,
  );
  if (pre.blockers.length) {
    console.error(`BLOCKER:\n- ${pre.blockers.join('\n- ')}`);
    process.exitCode = 2;
    return;
  }
  if (preflightOnly) {
    console.log('preflight-only — DB write 0');
    return;
  }

  const list = LIMIT ? targets.slice(0, LIMIT) : targets;
  const result = {
    ...pre,
    planned: list.length,
    createdMaster: 0,
    createdCanonical: 0,
    failed: 0,
    failures: [],
    contentGaps: 0,
    rollback: `DELETE FROM shared_product_descriptions WHERE master_id IN (SELECT id FROM product_masters WHERE tags->>'woBatch' = '${BATCH_TAG}'); DELETE FROM product_masters WHERE tags->>'woBatch' = '${BATCH_TAG}';`,
  };
  const gapItems = [];

  await withDb(async (q) => {
    const applyOne = async (key) => {
      const g = guides.get(key);
      const content = renderHtml(g);
      if (!content) throw new Error('렌더 결과 빈 본문');
      const ins = await q(
        `INSERT INTO product_masters
           (name, regulatory_name, manufacturer_name, brand_name, regulatory_type,
            category_id, status, is_mfds_verified, tags)
         VALUES ($1, $1, '', $2, 'COSMETIC', $3, 'ACTIVE', false, $4::jsonb)
         RETURNING id`,
        [
          g.productName,
          g.brandName ?? null,
          categoryId,
          JSON.stringify({ woBatch: BATCH_TAG, censusKey: g.key, productType: g.productType }),
        ],
      );
      await q(
        `INSERT INTO shared_product_descriptions
           (master_id, content, summary, source_type, status, language, description_type)
         VALUES ($1, $2, $3, $4, 'canonical', 'ko', 'STORE')`,
        [ins.rows[0].id, content, g.oneLineDescription ?? null, SOURCE_TYPE],
      );
      if (g.missingRequired?.length || issues.has(g.key)) {
        gapItems.push({
          key: g.key,
          status: g.status,
          missingRequired: g.missingRequired ?? [],
          issueTypes: issues.get(g.key) ?? [],
        });
      }
    };

    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK);
      try {
        await q('BEGIN');
        for (const key of chunk) await applyOne(key);
        await q('COMMIT');
        result.createdMaster += chunk.length;
        result.createdCanonical += chunk.length;
      } catch {
        // 청크 실패 — 단위별로 재시도해 실패 건만 격리한다.
        await q('ROLLBACK').catch(() => {});
        for (const key of chunk) {
          try {
            await q('BEGIN');
            await applyOne(key);
            await q('COMMIT');
            result.createdMaster++;
            result.createdCanonical++;
          } catch (e) {
            await q('ROLLBACK').catch(() => {});
            result.failed++;
            result.failures.push({ key, reason: String(e.message).split('\n')[0] });
          }
        }
      }
      if ((i / CHUNK) % 20 === 0 || i + CHUNK >= list.length) {
        console.log(
          `  진행 ${Math.min(i + CHUNK, list.length)}/${list.length} — 생성 ${result.createdMaster} / 실패 ${result.failed}`,
        );
      }
    }
  }, { write: true });

  result.contentGaps = gapItems.length;
  const byIssue = {};
  const byMissing = {};
  for (const c of gapItems) {
    for (const t of c.issueTypes) byIssue[t] = (byIssue[t] ?? 0) + 1;
    for (const m of c.missingRequired) byMissing[m] = (byMissing[m] ?? 0) + 1;
  }
  writeOut('full-apply-result.json', result);
  writeOut('full-apply-issue-queue.json', {
    wo: 'WO-O4O-COSMETICS-PRODUCTMASTER-STORE-DESCRIPTION-FULL-APPLY-V1',
    note: '적용은 완료됐다. 후속 보완 저작 대상이다.',
    count: gapItems.length,
    byIssueType: byIssue,
    byMissingField: byMissing,
    items: gapItems,
  });
  console.log(
    `apply 완료 — 계획 ${result.planned} / 신규 master ${result.createdMaster} / canonical ${result.createdCanonical} / 실패 ${result.failed} / 결손 큐 ${gapItems.length}`,
  );
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
