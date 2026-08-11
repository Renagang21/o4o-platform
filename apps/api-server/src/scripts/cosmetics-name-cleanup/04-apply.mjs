/**
 * WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1 — §8 apply
 *
 * dry-run 의 자동수정 대상만 적용한다. CHECK 는 건드리지 않는다.
 * 변경 범위 (WO §6·§8):
 *   - product_masters.name            (필수)
 *   - product_masters.regulatory_name (기존 값이 옛 name 과 같을 때만 — 다른 값은 보존)
 *   - product_masters.tags.nameCleanupV1 = { before, rules }  → rollback key
 *   - shared_product_descriptions.summary / content 안의 상품명 문자열 (설명서 내용 자체는 수정하지 않는다)
 *
 * 멱등: `WHERE name = beforeName` 가드로 이미 적용된 행·타 세션 변경분을 건너뛴다.
 */
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { readOut, writeOut } from './lib.mjs';

const CLEANUP_TAG = 'nameCleanupV1';
const CHUNK = 50;

/** render.mjs 와 동일한 HTML escape — 본문에는 escape 된 형태로 박혀 있다. */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function main() {
  const items = readOut('dry-run.json').items;
  const result = {
    wo: 'WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1',
    step: '04-apply',
    planned: items.length,
    updatedMaster: 0,
    updatedRegulatoryName: 0,
    updatedSummary: 0,
    updatedContent: 0,
    skippedNameMismatch: 0,
    contentUnchanged: [],
    failed: 0,
    failures: [],
    byRule: {},
    rollback:
      `UPDATE product_masters SET name = tags->'${CLEANUP_TAG}'->>'before', ` +
      `regulatory_name = CASE WHEN regulatory_name = name THEN tags->'${CLEANUP_TAG}'->>'before' ELSE regulatory_name END, ` +
      `tags = tags - '${CLEANUP_TAG}' WHERE tags ? '${CLEANUP_TAG}'; ` +
      `-- 설명서는 별도: summary/content 의 새 이름을 before 로 되돌린다 (apply-result.json 의 items 기준)`,
  };

  await withDb(async (q) => {
    const applyOne = async (it) => {
      const m = await q(
        `UPDATE product_masters
            SET name = $2,
                regulatory_name = CASE WHEN regulatory_name = $1 THEN $2 ELSE regulatory_name END,
                tags = COALESCE(tags, '{}'::jsonb) || jsonb_build_object($3::text, jsonb_build_object('before', $1::text, 'rules', $4::jsonb)),
                updated_at = NOW()
          WHERE id = $5 AND name = $1
          RETURNING regulatory_name`,
        [it.beforeName, it.afterName, CLEANUP_TAG, JSON.stringify(it.rules), it.masterId],
      );
      if (m.rowCount === 0) {
        result.skippedNameMismatch++;
        return;
      }
      result.updatedMaster++;
      if (m.rows[0].regulatory_name === it.afterName) result.updatedRegulatoryName++;
      for (const r of it.rules) result.byRule[r] = (result.byRule[r] ?? 0) + 1;

      const d = await q(
        `UPDATE shared_product_descriptions
            SET summary = replace(summary, $1, $2),
                content = replace(content, $3, $4),
                updated_at = NOW()
          WHERE id = $5
          RETURNING summary, (content LIKE '%' || $4 || '%') AS content_has_new`,
        [it.beforeName, it.afterName, esc(it.beforeName), esc(it.afterName), it.descId],
      );
      if (d.rowCount) {
        if (d.rows[0].summary?.includes(it.afterName)) result.updatedSummary++;
        if (d.rows[0].content_has_new) result.updatedContent++;
        else result.contentUnchanged.push({ masterId: it.masterId, afterName: it.afterName });
      }
    };

    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);
      try {
        await q('BEGIN');
        for (const it of chunk) await applyOne(it);
        await q('COMMIT');
      } catch {
        await q('ROLLBACK').catch(() => {});
        for (const it of chunk) {
          try {
            await q('BEGIN');
            await applyOne(it);
            await q('COMMIT');
          } catch (e) {
            await q('ROLLBACK').catch(() => {});
            result.failed++;
            result.failures.push({ masterId: it.masterId, reason: String(e.message).split('\n')[0] });
          }
        }
      }
      console.log(`  진행 ${Math.min(i + CHUNK, items.length)}/${items.length} — master ${result.updatedMaster} / 실패 ${result.failed}`);
    }
  }, { write: true });

  writeOut('apply-result.json', { ...result, items });
  console.log(
    `apply 완료 — 계획 ${result.planned} / master ${result.updatedMaster} / regulatory_name ${result.updatedRegulatoryName} / ` +
      `summary ${result.updatedSummary} / content ${result.updatedContent} / 이름불일치 skip ${result.skippedNameMismatch} / 실패 ${result.failed}`,
  );
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
