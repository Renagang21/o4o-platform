/**
 * WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1 — §9 postVerify + §10 검색 smoke (read-only)
 */
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { normalizeName, bracketImbalance } from './rules.mjs';
import { readOut, writeOut } from './lib.mjs';

const CLEANUP_TAG = 'nameCleanupV1';

async function main() {
  const census = readOut('census.json');
  const apply = readOut('apply-result.json');
  const items = apply.items;
  const out = {
    wo: 'WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1',
    step: '05-post-verify',
    readOnly: true,
    baseline: {
      cosmeticTotal: census.total,
      regulatoryTypeCounts: census.baselineRegulatoryTypeCounts,
      nonWordLeading: census.nonWordLeadingCount,
      bracketImbalanced: census.bracketImbalancedCount,
    },
    expected: { modified: apply.updatedMaster },
    pass: true,
    failures: [],
  };
  const must = (ok, label) => { if (!ok) { out.pass = false; out.failures.push(label); } };

  await withDb(async (q) => {
    const one = async (sql, p) => (await q(sql, p)).rows[0];

    // 1) 총수 불변 · 신규/삭제 0
    out.cosmeticTotal = (await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type='COSMETIC'`)).c;
    must(out.cosmeticTotal === census.total, `COSMETIC 총수 변동 ${census.total} → ${out.cosmeticTotal}`);

    const rt = await q(`SELECT regulatory_type t, COUNT(*)::int c FROM product_masters GROUP BY 1`);
    out.regulatoryTypeCounts = Object.fromEntries(rt.rows.map((r) => [r.t, r.c]));
    out.regulatoryTypeDrift = [];
    for (const [t, c] of Object.entries(census.baselineRegulatoryTypeCounts)) {
      if (out.regulatoryTypeCounts[t] !== c) out.regulatoryTypeDrift.push({ type: t, before: c, after: out.regulatoryTypeCounts[t] ?? 0 });
    }
    must(out.regulatoryTypeDrift.length === 0, `regulatory_type drift ${JSON.stringify(out.regulatoryTypeDrift)}`);

    // 2) 수정 대상 expected == actual
    out.taggedCount = (await one(`SELECT COUNT(*)::int c FROM product_masters WHERE tags ? '${CLEANUP_TAG}'`)).c;
    must(out.taggedCount === apply.updatedMaster, `tag 수 불일치 ${apply.updatedMaster} vs ${out.taggedCount}`);

    // 3) 빈 상품명
    out.emptyNames = (
      await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type='COSMETIC' AND COALESCE(btrim(name),'') = ''`)
    ).c;
    must(out.emptyNames === 0, `빈 상품명 ${out.emptyNames}`);

    // 4) master 중복 (brand,name)
    out.masterDuplicateGroups = (
      await one(`SELECT COUNT(*)::int c FROM (
          SELECT 1 FROM product_masters WHERE regulatory_type='COSMETIC'
           GROUP BY lower(COALESCE(brand_name,'')), lower(name) HAVING COUNT(*) > 1) t`)
    ).c;
    must(out.masterDuplicateGroups === 0, `신규 중복 master ${out.masterDuplicateGroups}`);

    // 5) canonical 중복 · orphan
    out.canonicalDuplicateGroups = (
      await one(`SELECT COUNT(*)::int c FROM (
          SELECT s.master_id FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
           WHERE m.regulatory_type='COSMETIC' AND s.description_type='STORE'
             AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL
           GROUP BY 1 HAVING COUNT(*) > 1) t`)
    ).c;
    must(out.canonicalDuplicateGroups === 0, `canonical 중복 ${out.canonicalDuplicateGroups}`);

    out.orphanDescriptions = (
      await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions s
                  WHERE s.source_type = 'o4o_cosmetics_retail'
                    AND NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id = s.master_id)`)
    ).c;
    must(out.orphanDescriptions === 0, `orphan ${out.orphanDescriptions}`);

    out.cosmeticWithoutCanonical = (
      await one(`SELECT COUNT(*)::int c FROM product_masters m WHERE m.regulatory_type='COSMETIC'
                  AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id = m.id
                                   AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko'
                                   AND s.status='canonical' AND s.deleted_at IS NULL)`)
    ).c;
    must(out.cosmeticWithoutCanonical === 0, `canonical 없는 화장품 master ${out.cosmeticWithoutCanonical}`);

    // 6) 비화장품 오등록 — 수정분이 전부 COSMETIC 인지
    out.taggedNonCosmetic = (
      await one(`SELECT COUNT(*)::int c FROM product_masters WHERE tags ? '${CLEANUP_TAG}' AND regulatory_type <> 'COSMETIC'`)
    ).c;
    must(out.taggedNonCosmetic === 0, `비화장품 수정 ${out.taggedNonCosmetic}`);

    // 7) master ↔ 설명서 이름 정합 (WO §6)
    const ids = items.map((i) => i.masterId);
    out.summaryStillHasOldName = (
      await one(
        `SELECT COUNT(*)::int c FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
          WHERE m.id = ANY($1::uuid[]) AND s.deleted_at IS NULL
            AND position(m.tags->'${CLEANUP_TAG}'->>'before' in s.summary) > 0`,
        [ids],
      )
    ).c;
    must(out.summaryStillHasOldName === 0, `설명서 summary 에 옛 이름 잔존 ${out.summaryStillHasOldName}`);

    out.summaryMissingNewName = (
      await one(
        `SELECT COUNT(*)::int c FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
          WHERE m.id = ANY($1::uuid[]) AND s.deleted_at IS NULL AND position(m.name in s.summary) = 0`,
        [ids],
      )
    ).c;
    must(out.summaryMissingNewName === 0, `설명서 summary 에 새 이름 없음 ${out.summaryMissingNewName}`);

    out.emptyContent = (
      await one(
        `SELECT COUNT(*)::int c FROM shared_product_descriptions s
          WHERE s.master_id = ANY($1::uuid[]) AND s.deleted_at IS NULL AND COALESCE(length(btrim(s.content)),0) = 0`,
        [ids],
      )
    ).c;
    must(out.emptyContent === 0, `본문 길이 0 ${out.emptyContent}`);

    // 8) 잔여 비정상명 재산출
    const checkQueue = readOut('check-queue.json');
    const checkIds = new Set(checkQueue.items.map((i) => i.id));
    const { rows: names } = await q(
      `SELECT id, name, brand_name FROM product_masters WHERE regulatory_type='COSMETIC'`,
    );
    out.residual = {
      total: names.length,
      nonWordLeading: names.filter((r) => /^[^0-9A-Za-z가-힣]/.test(r.name)).length,
      bracketImbalanced: names.filter((r) => bracketImbalance(r.name).length).length,
      // CHECK 큐에 오른 행(충돌 강등 106 포함)은 의도적 미적용이므로 잔여로 세지 않는다.
      stillAutoFixable: names.filter((r) => {
        if (checkIds.has(r.id)) return false;
        const n = normalizeName(r.name);
        return n.rules.length && !n.checks.length;
      }).length,
      checkQueue: checkQueue.count,
      checkQueueDemotedByCollision: checkQueue.items.filter((i) => i.reasons.some((x) => x.startsWith('NAME_COLLISION'))).length,
    };
    must(out.residual.stillAutoFixable === 0, `자동수정 잔여 ${out.residual.stillAutoFixable} (재적용 필요)`);

    // 9) §10 검색 smoke — 수정된 표본 5건
    out.searchSmoke = [];
    for (const it of items.slice(0, 5)) {
      const byExact = (
        await one(
          `SELECT COUNT(*)::int c FROM product_masters
            WHERE regulatory_type='COSMETIC' AND COALESCE(brand_name,'') = COALESCE($1,'') AND name = $2`,
          [it.brand, it.afterName],
        )
      ).c;
      const byNameLike = (
        await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type='COSMETIC' AND name ILIKE $1`, [
          `%${it.afterName}%`,
        ])
      ).c;
      const oldStillFound = (
        await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type='COSMETIC' AND name = $1`, [
          it.beforeName,
        ])
      ).c;
      const desc = await one(
        `SELECT length(content)::int len, summary FROM shared_product_descriptions WHERE id = $1`,
        [it.descId],
      );
      out.searchSmoke.push({
        before: it.beforeName,
        after: it.afterName,
        exactBrandName: byExact,
        nameLike: byNameLike,
        oldNameStillPresent: oldStillFound,
        contentLen: desc?.len ?? 0,
        summary: desc?.summary ?? null,
      });
    }
    must(out.searchSmoke.every((s) => s.exactBrandName >= 1 && s.contentLen > 0), '검색 smoke 실패');
  });

  writeOut('post-verify.json', out);
  console.log(JSON.stringify({ ...out, searchSmoke: undefined }, null, 2));
  console.log('\n검색 smoke:');
  for (const s of out.searchSmoke) {
    console.log(`  - ${s.before}\n  + ${s.after}\n    정확조회 ${s.exactBrandName} / like ${s.nameLike} / 옛이름 ${s.oldNameStillPresent} / 본문 ${s.contentLen}자\n    summary: ${s.summary}`);
  }
  console.log(`\n판정: ${out.pass ? 'PASS' : 'FAIL — ' + out.failures.join(' | ')}`);
  if (!out.pass) process.exitCode = 3;
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
