/**
 * OTC 영문 설명서 canonical 전환 — needs_review → canonical (686건)
 *
 * WO-O4O-OTC-EN-CANONICAL-PROMOTION-686-V1
 * 선행: WO-O4O-OTC-EN-PERSIST-APPLY-681-V1 (686 저장 완료) · 번역 검수 완료
 *
 * ⚠️ **이 전환은 영문 설명서를 소비 화면에 노출시킨다** — `needs_review` 는 표시되지 않지만
 *    `canonical` 은 표시된다. 콘텐츠 변경 없이 **상태만** 바꾼다.
 *
 * 작업 원칙:
 *   - **본문 수정 0** — `content`·`summary` 를 건드리지 않는다(SET 절에 status·updated_at 뿐).
 *   - **한국어 canonical 변경 0** — WHERE 가 `language='en'` 으로 잠겨 있다.
 *   - **INSERT·DELETE 0** — 이 파일에 해당 문이 없다.
 *   - 대상 수가 686 과 다르면 중단.
 *   - `(master_id, description_type, COALESCE(language,'ko'))` canonical 충돌 시 롤백.
 *     (부분 유니크 인덱스 `uniq_shared_product_descriptions_canonical_per_master_type_lang` 와 동일 기준)
 *
 * DB write 게이트: `--apply` AND `DRUG_OTC_EN_CANONICAL_CONFIRM=YES`
 *
 * Usage:
 *   DB_HOST=127.0.0.1 DB_PORT=<proxy> DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-en-canonical-promotion.ts [--apply]
 */

import type { SharedProductDescriptionSourceType } from '../modules/neture/entities/SharedProductDescription.entity.js';

const SOURCE_TYPE: SharedProductDescriptionSourceType = 'mfds_drug_otc';
const LANGUAGE = 'en';
const DESCRIPTION_TYPE = 'STORE';
const FROM_STATUS = 'needs_review';
const TO_STATUS = 'canonical';
/** 승인된 대상 수. 다르면 중단(대상이 변했다는 뜻). */
const EXPECTED = 686;

async function main(): Promise<void> {
  const apply =
    process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_EN_CANONICAL_CONFIRM === 'YES';
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
  });
  await ds.initialize();

  let updated = 0;
  try {
    // ── 1) 대상 + 사전 조건 ──
    const [pre]: {
      target: string;
      ko_canonical: string;
      pairs: string;
      same_ref: string;
      existing_en_canonical: string;
      unclean: string;
    }[] = await ds.query(
      `SELECT
         (SELECT count(*) FROM shared_product_descriptions
          WHERE source_type=$1 AND description_type=$2 AND language=$3 AND status=$4 AND deleted_at IS NULL)::text AS target,
         (SELECT count(*) FROM shared_product_descriptions
          WHERE source_type=$1 AND description_type=$2 AND language='ko' AND status='canonical' AND deleted_at IS NULL)::text AS ko_canonical,
         (SELECT count(*) FROM shared_product_descriptions ko
            JOIN shared_product_descriptions en
              ON en.master_id=ko.master_id AND en.language=$3 AND en.description_type=$2
             AND en.status=$4 AND en.deleted_at IS NULL
          WHERE ko.source_type=$1 AND ko.status='canonical' AND ko.language='ko'
            AND ko.description_type=$2 AND ko.deleted_at IS NULL)::text AS pairs,
         (SELECT count(*) FROM shared_product_descriptions ko
            JOIN shared_product_descriptions en
              ON en.master_id=ko.master_id AND en.language=$3 AND en.description_type=$2
             AND en.status=$4 AND en.deleted_at IS NULL AND en.source_ref_id=ko.source_ref_id
          WHERE ko.source_type=$1 AND ko.status='canonical' AND ko.language='ko'
            AND ko.description_type=$2 AND ko.deleted_at IS NULL)::text AS same_ref,
         (SELECT count(*) FROM shared_product_descriptions s
          WHERE s.description_type=$2 AND s.language=$3 AND s.status='canonical' AND s.deleted_at IS NULL
            AND s.master_id IN (SELECT master_id FROM shared_product_descriptions
                                WHERE source_type=$1 AND language=$3 AND status=$4 AND deleted_at IS NULL))::text AS existing_en_canonical,
         (SELECT count(*) FROM shared_product_descriptions
          WHERE source_type=$1 AND language=$3 AND status=$4 AND deleted_at IS NULL
            AND (content ~ '[가-힣]' OR content LIKE '%&gt;%' OR content LIKE '%<table%' OR content NOT LIKE '%sd-card%'))::text AS unclean`,
      [SOURCE_TYPE, DESCRIPTION_TYPE, LANGUAGE, FROM_STATUS],
    );

    const target = Number(pre.target);
    const checks = [
      { name: '영문 needs_review 686', ok: target === EXPECTED, got: target },
      { name: '한국어 canonical 686', ok: Number(pre.ko_canonical) === EXPECTED, got: Number(pre.ko_canonical) },
      { name: 'ko↔en master 1:1', ok: Number(pre.pairs) === EXPECTED, got: Number(pre.pairs) },
      { name: 'source_ref_id 일치', ok: Number(pre.same_ref) === EXPECTED, got: Number(pre.same_ref) },
      { name: '기존 STORE/en/canonical 충돌 0', ok: Number(pre.existing_en_canonical) === 0, got: Number(pre.existing_en_canonical) },
      { name: '콘텐츠 청결(한글·주석·table·sd-card)', ok: Number(pre.unclean) === 0, got: Number(pre.unclean) },
    ];

    // ── 2) apply ──
    if (apply) {
      const bad = checks.filter((c) => !c.ok);
      if (bad.length) throw new Error(`사전 조건 실패 — 중단: ${bad.map((b) => `${b.name}(=${b.got})`).join(', ')}`);

      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        // 상태만 변경 — content·summary 미포함
        const res = await qr.query(
          `UPDATE shared_product_descriptions
              SET status=$5, updated_at=now()
            WHERE source_type=$1 AND description_type=$2 AND language=$3
              AND status=$4 AND deleted_at IS NULL
          RETURNING id`,
          [SOURCE_TYPE, DESCRIPTION_TYPE, LANGUAGE, FROM_STATUS, TO_STATUS],
        );
        // TypeORM 은 UPDATE…RETURNING 을 `[rows, affected]` 로 돌려준다(INSERT 는 rows 배열).
        // 두 형태를 모두 받아 실제 행 수를 센다 — res.length 를 그대로 쓰면 2 가 나온다.
        const rows: unknown[] = Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as unknown[]) : (res as unknown[]);
        updated = Array.isArray(rows) ? rows.length : 0;
        if (updated !== EXPECTED) throw new Error(`UPDATE 수 불일치: ${updated} ≠ ${EXPECTED} — 롤백`);

        // canonical 유일성 계약 = (master, description_type, COALESCE(language,'ko')) 당 1개
        const [{ dup }]: { dup: string }[] = await qr.query(
          `SELECT count(*)::text AS dup FROM (
             SELECT master_id, description_type, COALESCE(language,'ko') AS lang
             FROM shared_product_descriptions
             WHERE deleted_at IS NULL AND status='canonical'
             GROUP BY 1,2,3 HAVING count(*) > 1) x`,
        );
        if (Number(dup) > 0) throw new Error(`canonical 중복 ${dup} — 롤백`);

        // 한국어 canonical 불변 확인
        const [{ ko }]: { ko: string }[] = await qr.query(
          `SELECT count(*)::text AS ko FROM shared_product_descriptions
           WHERE source_type=$1 AND language='ko' AND status='canonical' AND deleted_at IS NULL`,
          [SOURCE_TYPE],
        );
        if (Number(ko) !== EXPECTED) throw new Error(`한국어 canonical 변동: ${ko} ≠ ${EXPECTED} — 롤백`);

        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    console.log('───────────────────────────────────────────────');
    console.log(`OTC 영문 canonical 전환 (${mode})`);
    console.log('───────────────────────────────────────────────');
    for (const c of checks) console.log(`  ${c.ok ? '✅' : '❌'} ${c.name.padEnd(34)} = ${c.got}`);
    console.log(`전환 대상            : ${target} (${FROM_STATUS} → ${TO_STATUS})`);
    console.log(`INSERT / DELETE      : 0 / 0 (문 없음)`);
    console.log(`본문 수정            : 0 (SET = status, updated_at)`);
    console.log(`dbWrite(UPDATE)      : ${apply ? updated : 0}`);
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
