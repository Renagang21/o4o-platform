/**
 * WO-...-PRODUCTMASTER-PILOT-V2 — 단계 4: 500건 dry-run (WO §9·§10)
 *
 * **운영 DB write 0.** SELECT 만 수행하고 세션을 read-only 로 강제한다.
 *
 * dedupe 계약 (WO §10 — 최소 계약, 새 상품식별 시스템을 만들지 않는다):
 *   dedupeKey = norm(brandName) + '|' + norm(canonicalProductName)
 *   norm = 공백·기호 제거 + 소문자화 (census 와 동일 규칙)
 *   - 색상·용량·기획세트·바코드는 조건에 넣지 않는다 (WO §10, §7 판매 마디 유지).
 *   - 표본 내부 중복 / 기존 master 충돌을 각각 센다.
 *   - 이름만 같고 규제유형이 다른 기존 master 는 **자동 병합하지 않고** CHECK 로 남긴다.
 */
import { withDb } from './db.mjs';
import { readGuide, readOut, writeOut } from './lib.mjs';

const norm = (s) =>
  (s ?? '')
    .toLowerCase()
    .replace(/[\s\-_/\\.,()[\]{}'"’“”·:;!?+*&%#@~^|<>]/g, '')
    .trim();

const dedupeKey = (brand, name) => `${norm(brand)}|${norm(name)}`;

async function main() {
  const sample = readOut('sample-500.json').items;
  const guides = new Map(readGuide('all-guides-ko.json').guides.map((g) => [g.key, g]));

  // --- 1) 표본 내부 dedupe 검증
  const byDedupe = new Map();
  for (const s of sample) {
    const k = dedupeKey(s.brandName, s.productName);
    if (!byDedupe.has(k)) byDedupe.set(k, []);
    byDedupe.get(k).push(s.key);
  }
  const intraDuplicates = [...byDedupe.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([k, v]) => ({ dedupeKey: k, keys: v }));

  // 브랜드명 없는 항목은 이름만으로 dedupe 되어 오병합 위험이 있다 — 세어 둔다.
  const noBrand = sample.filter((s) => !norm(s.brandName)).map((s) => s.key);

  const result = {
    wo: 'WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2',
    access: 'read-only SELECT only — 운영 DB write 0',
    dedupeContract: 'norm(brandName)|norm(canonicalProductName) — 색상/용량/기획세트/바코드 미포함',
    input: sample.length,
    intraSampleDuplicateGroups: intraDuplicates.length,
    intraSampleDuplicates: intraDuplicates,
    sampleWithoutBrandName: noBrand.length,
  };

  await withDb(async (q) => {
    // 화장품과 이름이 부딪힐 수 있는 master 만 본다 (DRUG 17만 건 제외 — census 와 같은 범위).
    const { rows } = await q(
      `SELECT id, name, brand_name, manufacturer_name, regulatory_type, status
         FROM product_masters
        WHERE regulatory_type IS DISTINCT FROM 'DRUG'`,
    );
    result.comparedMasterRows = rows.length;

    // 기존 master 색인: (brand|name) 과 (name) 두 축 — census 비교 규칙과 동일한 폭
    const byBrandName = new Map();
    const byNameOnly = new Map();
    for (const r of rows) {
      const n = norm(r.name);
      if (!n) continue;
      const bk = `${norm(r.brand_name)}|${n}`;
      if (!byBrandName.has(bk)) byBrandName.set(bk, []);
      byBrandName.get(bk).push(r);
      if (!byNameOnly.has(n)) byNameOnly.set(n, []);
      byNameOnly.get(n).push(r);
    }

    const plan = [];
    for (const s of sample) {
      const n = norm(s.productName);
      const bk = dedupeKey(s.brandName, s.productName);
      const exactBrand = byBrandName.get(bk) ?? [];
      const nameOnly = byNameOnly.get(n) ?? [];
      let action;
      let note;
      if (exactBrand.some((r) => r.regulatory_type === 'COSMETIC')) {
        action = 'REUSE_MASTER';
        note = '브랜드+상품명 일치하는 화장품 master 존재';
      } else if (exactBrand.length) {
        action = 'CHECK';
        note = `브랜드+상품명은 같으나 규제유형이 화장품이 아니다(${[...new Set(exactBrand.map((r) => r.regulatory_type))].join(',')})`;
      } else if (nameOnly.length) {
        action = 'CREATE_MASTER';
        note = `상품명만 같은 기존 master ${nameOnly.length}건 존재 — 브랜드가 다르므로 병합하지 않는다`;
      } else {
        action = 'CREATE_MASTER';
        note = '기존 master 없음';
      }
      plan.push({
        key: s.key,
        bucket: s.bucket,
        brandName: s.brandName,
        productName: s.productName,
        dedupeKey: bk,
        action,
        note,
        nameOnlyCollisions: nameOnly.length,
        reuseMasterId: action === 'REUSE_MASTER' ? exactBrand.find((r) => r.regulatory_type === 'COSMETIC').id : null,
      });
    }
    result.plan = plan;

    const count = (a) => plan.filter((p) => p.action === a).length;
    result.expectedCreateMaster = count('CREATE_MASTER');
    result.expectedReuseMaster = count('REUSE_MASTER');
    result.expectedCheck = count('CHECK');
    result.nameOnlyCollisionUnits = plan.filter((p) => p.nameOnlyCollisions > 0).length;

    // --- 3) KO STORE canonical 신규/충돌 — 신규 master 에는 canonical 이 있을 수 없다.
    const reuseIds = plan.filter((p) => p.reuseMasterId).map((p) => p.reuseMasterId);
    let canonicalConflict = 0;
    if (reuseIds.length) {
      const { rows: cr } = await q(
        `SELECT master_id FROM shared_product_descriptions
          WHERE master_id = ANY($1::uuid[]) AND description_type = 'STORE'
            AND COALESCE(language,'ko') = 'ko' AND status = 'canonical' AND deleted_at IS NULL`,
        [reuseIds],
      );
      canonicalConflict = cr.length;
    }
    result.expectedCanonicalCreate = count('CREATE_MASTER') + count('REUSE_MASTER') - canonicalConflict;
    result.expectedCanonicalConflict = canonicalConflict;

    // 설명서 본문이 비어 있으면 apply 대상이 아니다 — 미리 센다.
    result.emptyContentUnits = sample.filter((s) => !guides.get(s.key)).length;
  });

  result.writesPerformed = 0;
  writeOut('dry-run.json', result);
  console.log(
    `대상 ${result.input} / 신규 master ${result.expectedCreateMaster} / 재사용 ${result.expectedReuseMaster} / CHECK ${result.expectedCheck}\n` +
      `KO canonical 신규 ${result.expectedCanonicalCreate} / 충돌 ${result.expectedCanonicalConflict}\n` +
      `표본 내부 중복 그룹 ${result.intraSampleDuplicateGroups} / 이름만 충돌 ${result.nameOnlyCollisionUnits} / 브랜드명 없음 ${result.sampleWithoutBrandName} / 비교 master ${result.comparedMasterRows}`,
  );
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
