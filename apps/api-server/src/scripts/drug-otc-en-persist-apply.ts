/**
 * OTC 영문 설명서 저장 apply — 37그룹 번역 → 681 master 전개
 *
 * WO-O4O-OTC-EN-PERSIST-APPLY-681-V1
 * 선행: WO-O4O-OTC-EN-GROUP-TO-MASTER-FANOUT-DESIGN-V1 (전개 구조) ·
 *       WO-O4O-OTC-EN-TRANSLATION-BATCH-37-V1 (번역 37건) · 사람 검수 완료
 *
 * 구조: **번역은 그룹당 1개(JSON) · 저장은 연결 master 전체에 전개.**
 *   멤버십 SSOT = 저장된 **한국어 canonical 행** → ko/en 축이 어긋날 수 없다.
 *
 * 저장 계약:
 *   description_type='STORE' · language='en' · status='needs_review' · source_type='mfds_drug_otc'
 *   source_ref_id = **한국어 canonical 의 값 그대로**(draft candidate_id) → ko↔en 연결 유지.
 *   canonical 유일 인덱스는 status='canonical' 에만 걸리므로 ko canonical 과 충돌하지 않는다.
 *
 * 안전:
 *   - **UPDATE·DELETE 문이 이 파일에 없다.** INSERT 만 존재.
 *   - 기존 en 보유 master 는 전개 단계에서 제외 + INSERT 시 `NOT EXISTS` 재확인(이중).
 *   - 그룹 간 master 중복 시 중단. 예상 수량(그룹 37 / INSERT 681) 불일치 시 중단.
 *   - content = 번역 JSON → sd-* HTML. `bodyMarkdown` 을 읽지 않는다(CR-021).
 *
 * DB write 게이트: `--apply` AND `DRUG_OTC_EN_PERSIST_CONFIRM=YES`
 *
 * Usage:
 *   DB_HOST=127.0.0.1 DB_PORT=<proxy> DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-en-persist-apply.ts [--apply]
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  loadEnFanoutRows,
  buildEnFanoutPlan,
} from '../modules/neture/drug-import/drug-otc-en-fanout.js';
import {
  buildDrugOtcEnConsumerHtml,
  type DrugOtcEnTranslation,
} from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';
import type { SharedProductDescriptionSourceType } from '../modules/neture/entities/SharedProductDescription.entity.js';

const SOURCE_TYPE: SharedProductDescriptionSourceType = 'mfds_drug_otc';
const LANGUAGE = 'en';
const DESCRIPTION_TYPE = 'STORE';
/** 검수 상태로 저장한다 — canonical 공개 전환은 별도 작업. */
const STATUS = 'needs_review';
/** 승인된 예상치. 다르면 중단(대상이 변했다는 뜻). */
const EXPECTED_GROUPS = 37;
const EXPECTED_INSERT = 681;

const TRANSLATIONS_PATH =
  process.env.OTC_EN_TRANSLATIONS_PATH ??
  path.resolve(
    process.cwd(),
    '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-v1.json',
  );

interface TranslationsFile {
  version: string;
  guideVersion: string;
  glossaryVersion: string;
  translations: DrugOtcEnTranslation[];
}

async function main(): Promise<void> {
  const apply =
    process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_EN_PERSIST_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const file = JSON.parse(fs.readFileSync(TRANSLATIONS_PATH, 'utf8')) as TranslationsFile;
  const byGroup = new Map(file.translations.map((t) => [t.groupKey, t]));

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

  let inserted = 0;
  try {
    // ── 1) 전개 (dry-run·apply 공용) ──
    const plan = buildEnFanoutPlan(await loadEnFanoutRows(ds, { sourceType: SOURCE_TYPE }));
    if (plan.crossGroupDuplicateMasters.length)
      throw new Error(
        `그룹 간 master 중복 ${plan.crossGroupDuplicateMasters.length}건 — 중단 (예: ${plan.crossGroupDuplicateMasters[0]})`,
      );

    // ── 2) 번역 매칭 + HTML 생성 ──
    const writable: { groupKey: string; candidateId: string; masterIds: string[]; html: string; summary: string | null }[] = [];
    const held: { groupKey: string; reason: string }[] = [];

    for (const u of plan.persistUnits) {
      const t = byGroup.get(u.groupKey);
      if (!t) {
        held.push({ groupKey: u.groupKey, reason: 'NO_TRANSLATION: 번역 파일에 없음' });
        continue;
      }
      const built = buildDrugOtcEnConsumerHtml(t);
      if (built.missing.length) {
        held.push({ groupKey: u.groupKey, reason: `INCOMPLETE: ${built.missing.join(',')}` });
        continue;
      }
      if (u.targetMasterIds.length === 0) {
        held.push({ groupKey: u.groupKey, reason: 'NO_TARGET: 전개 master 전부 기존 en 보유' });
        continue;
      }
      writable.push({
        groupKey: u.groupKey,
        candidateId: u.candidateId,
        masterIds: u.targetMasterIds,
        html: built.html,
        summary: t.summaryTable['Main symptoms'] ?? null,
      });
    }

    const expectedInsert = writable.reduce((n, w) => n + w.masterIds.length, 0);

    // ── 3) apply (이중 게이트 + 승인 수량 일치) ──
    if (apply) {
      if (plan.totals.groups !== EXPECTED_GROUPS)
        throw new Error(`그룹 수 불일치: ${plan.totals.groups} ≠ 승인된 ${EXPECTED_GROUPS} — 중단`);
      if (expectedInsert !== EXPECTED_INSERT)
        throw new Error(`예상 INSERT 불일치: ${expectedInsert} ≠ 승인된 ${EXPECTED_INSERT} — 중단`);
      if (held.length) throw new Error(`보류 그룹 ${held.length}건 존재 — 중단 (${held[0].reason})`);

      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (const w of writable) {
          const res = await qr.query(
            // $7·$8 은 SELECT 목록과 WHERE 비교에 동시에 쓰여 타입 추론이 충돌한다 → 명시 캐스트.
            `INSERT INTO shared_product_descriptions
               (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             SELECT mid, $3, $4, $2, $5::uuid, $6, $7::varchar, $8::varchar, now(), now()
             FROM unnest($1::uuid[]) mid
             WHERE NOT EXISTS(
               SELECT 1 FROM shared_product_descriptions s
               WHERE s.master_id = mid AND s.description_type = $8::varchar
                 AND s.language = $7::varchar AND s.deleted_at IS NULL)
             RETURNING id`,
            [w.masterIds, SOURCE_TYPE, w.html, w.summary, w.candidateId, STATUS, LANGUAGE, DESCRIPTION_TYPE],
          );
          inserted += Array.isArray(res) ? res.length : 0;
        }
        if (inserted !== EXPECTED_INSERT)
          throw new Error(`INSERT 수 불일치: ${inserted} ≠ ${EXPECTED_INSERT} — 롤백`);

        // canonical 유일성 계약 = (master, description_type, COALESCE(language,'ko')) 당 1개
        const [{ dup }]: { dup: string }[] = await qr.query(
          `SELECT count(*)::text AS dup FROM (
             SELECT master_id, description_type, COALESCE(language,'ko') AS lang
             FROM shared_product_descriptions
             WHERE deleted_at IS NULL AND status='canonical'
             GROUP BY 1,2,3 HAVING count(*) > 1) x`,
        );
        if (Number(dup) > 0) throw new Error(`canonical 중복 ${dup} — 롤백`);

        // en STORE 중복 0
        const [{ endup }]: { endup: string }[] = await qr.query(
          `SELECT count(*)::text AS endup FROM (
             SELECT master_id FROM shared_product_descriptions
             WHERE deleted_at IS NULL AND description_type='STORE' AND language='en'
             GROUP BY master_id HAVING count(*) > 1) x`,
        );
        if (Number(endup) > 0) throw new Error(`en STORE 중복 ${endup} — 롤백`);

        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    console.log('───────────────────────────────────────────────');
    console.log(`OTC 영문 저장 (${mode})`);
    console.log('───────────────────────────────────────────────');
    console.log(`번역 파일            : ${path.basename(TRANSLATIONS_PATH)} (${file.translations.length}건, ${file.guideVersion} / ${file.glossaryVersion})`);
    console.log(`그룹(ko canonical)   : ${plan.totals.groups}`);
    console.log(`전체 master          : ${plan.totals.masters}`);
    console.log(`기존 en 제외         : ${plan.totals.existingEn}`);
    console.log(`그룹 간 master 중복  : ${plan.crossGroupDuplicateMasters.length}`);
    console.log(`보류 그룹            : ${held.length}${held.length ? ' — ' + held.map((h) => h.groupKey).join(', ') : ''}`);
    console.log(`예상 INSERT rows     : ${expectedInsert}`);
    console.log(`예상 UPDATE rows     : 0 (UPDATE 문 없음)`);
    console.log(`status               : ${STATUS} (canonical 공개 전환은 별도 작업)`);
    console.log(`dbWrite              : ${apply ? inserted : 0}`);
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
