/**
 * WO-...-PRODUCTMASTER-PILOT-V2 — 단계 5: 파일럿 500 apply (WO §11)
 *
 * dry-run 이 PASS 한 500건만 적용한다. 기존 구조를 그대로 쓴다(새 테이블·migration 없음).
 *   ProductMaster: regulatory_type='COSMETIC', category=화장품, status='ACTIVE', is_mfds_verified=false
 *   설명서       : shared_product_descriptions — description_type='STORE', language='ko',
 *                  status='canonical', source_type='o4o_cosmetics_retail'
 *
 * 보호 규칙 (WO §11):
 *   - 기존 master 를 UPDATE 하지 않는다. INSERT 만 한다.
 *   - 기존 canonical 이 있으면 덮어쓰지 않고 충돌 큐로 보낸다.
 *   - 단위별 트랜잭션 — 실패 1건이 나머지를 되돌리지 않는다.
 *
 * rollback: tags->>'woBatch' = 'cosmetics-pilot-500-v2' 인 master 와 그 설명서만 지우면 원복된다.
 */
import { withDb } from './db.mjs';
import { readGuide, readOut, writeOut } from './lib.mjs';

const BATCH_TAG = 'cosmetics-pilot-500-v2';
const SOURCE_TYPE = 'o4o_cosmetics_retail';
const COSMETICS_CATEGORY_SLUG = 'cosmetics';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 설명서 본문 HTML — 있는 항목만 렌더한다. 빈 정보를 추론해 채우지 않는다. */
function renderHtml(g) {
  const out = [];
  const sec = (title, body) => out.push(`<h3>${esc(title)}</h3>${body}`);
  if (g.oneLineDescription) out.push(`<p>${esc(g.oneLineDescription)}</p>`);
  if (g.mainFeatures?.length) {
    sec('주요 특징', `<ul>${g.mainFeatures.map((f) => `<li>${esc(f.text)}</li>`).join('')}</ul>`);
  }
  if (g.productHighlights?.length) {
    sec('제품 포인트', `<ul>${g.productHighlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>`);
  }
  if (g.mainIngredients) sec('주요 성분', `<p>${esc(g.mainIngredients)}</p>`);
  if (g.texture) sec('사용감', `<p>${esc(g.texture)}</p>`);
  if (g.usage) sec('사용 방법', `<p>${esc(g.usage)}</p>`);
  if (g.useContext) sec('사용 상황', `<p>${esc(g.useContext)}</p>`);
  if (g.cautions) sec('주의사항', `<p>${esc(g.cautions)}</p>`);
  if (g.variants?.length) {
    sec('구성', `<ul>${g.variants.map((v) => `<li>${esc(typeof v === 'string' ? v : v.text ?? JSON.stringify(v))}</li>`).join('')}</ul>`);
  }
  if (g.classification) out.push(`<p><small>분류: ${esc(g.classification)}</small></p>`);
  if (g.distributionSources?.length) {
    out.push(`<p><small>유통 확인: ${esc(g.distributionSources.join(', '))}</small></p>`);
  }
  return out.join('\n');
}

async function main() {
  const dry = readOut('dry-run.json');
  const guides = new Map(readGuide('all-guides-ko.json').guides.map((g) => [g.key, g]));
  const targets = dry.plan.filter((p) => p.action === 'CREATE_MASTER' || p.action === 'REUSE_MASTER');

  const result = {
    wo: 'WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2',
    batchTag: BATCH_TAG,
    sourceType: SOURCE_TYPE,
    planned: targets.length,
    createdMaster: 0,
    reusedMaster: 0,
    createdCanonical: 0,
    canonicalConflict: 0,
    skippedAlreadyApplied: 0,
    failed: 0,
    conflicts: [],
    failures: [],
    rollback: `DELETE FROM shared_product_descriptions WHERE master_id IN (SELECT id FROM product_masters WHERE tags->>'woBatch' = '${BATCH_TAG}'); DELETE FROM product_masters WHERE tags->>'woBatch' = '${BATCH_TAG}';`,
  };

  await withDb(async (q) => {
    const cat = await q(`SELECT id FROM product_categories WHERE slug = $1 LIMIT 1`, [
      COSMETICS_CATEGORY_SLUG,
    ]);
    const categoryId = cat.rows[0]?.id ?? null;
    if (!categoryId) throw new Error('화장품 category(slug=cosmetics) 를 찾지 못했다 — 중지');

    for (const p of targets) {
      const g = guides.get(p.key);
      if (!g) {
        result.failed++;
        result.failures.push({ key: p.key, reason: '설명서 본문 없음' });
        continue;
      }
      const content = renderHtml(g);
      if (!content) {
        result.failed++;
        result.failures.push({ key: p.key, reason: '렌더 결과 빈 본문' });
        continue;
      }
      try {
        await q('BEGIN');
        // 재실행 안전 — 같은 배치 태그로 이미 만든 master 가 있으면 건너뛴다.
        const dup = await q(
          `SELECT id FROM product_masters
            WHERE tags->>'woBatch' = $1 AND name = $2 AND COALESCE(brand_name,'') = $3 LIMIT 1`,
          [BATCH_TAG, g.productName, g.brandName ?? ''],
        );
        if (dup.rows[0]) {
          await q('ROLLBACK');
          result.skippedAlreadyApplied++;
          continue;
        }

        let masterId = p.reuseMasterId;
        if (masterId) {
          result.reusedMaster++;
        } else {
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
          masterId = ins.rows[0].id;
          result.createdMaster++;
        }

        // 기존 KO STORE canonical 이 있으면 절대 덮지 않는다 — 충돌 큐로 보낸다.
        const exists = await q(
          `SELECT id FROM shared_product_descriptions
            WHERE master_id = $1 AND description_type = 'STORE'
              AND COALESCE(language,'ko') = 'ko' AND status = 'canonical' AND deleted_at IS NULL
            LIMIT 1`,
          [masterId],
        );
        if (exists.rows[0]) {
          result.canonicalConflict++;
          result.conflicts.push({ key: p.key, masterId, existingSpdId: exists.rows[0].id });
        } else {
          await q(
            `INSERT INTO shared_product_descriptions
               (master_id, content, summary, source_type, status, language, description_type)
             VALUES ($1, $2, $3, $4, 'canonical', 'ko', 'STORE')`,
            [masterId, content, g.oneLineDescription ?? null, SOURCE_TYPE],
          );
          result.createdCanonical++;
        }
        await q('COMMIT');
      } catch (e) {
        await q('ROLLBACK').catch(() => {});
        result.failed++;
        result.failures.push({ key: p.key, reason: String(e.message).split('\n')[0] });
      }
    }
  }, { write: true });

  writeOut('apply-result.json', result);
  console.log(
    `계획 ${result.planned} / 신규 master ${result.createdMaster} / 재사용 ${result.reusedMaster} / ` +
      `canonical 생성 ${result.createdCanonical} / 충돌 ${result.canonicalConflict} / ` +
      `이미적용 skip ${result.skippedAlreadyApplied} / 실패 ${result.failed}`,
  );
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
