/**
 * OTC 설명서 sd-warn 소급 적용 — 공개 중인 ko 686 + en 686 = 1,372건
 *
 * WO-O4O-OTC-SD-WARN-BACKFILL-1372-V1
 * 선행: WO-O4O-SD-WARNING-CLASS-CONTRACT-AND-BUILDER-V1 (계약 CR-020 V1.2 · 렌더러 · 빌더)
 *
 * ⚠️ **공개 중인 canonical 콘텐츠를 UPDATE 한다.**
 *
 * 변경 증명(핵심):
 *   저장본에서 `class="sd-who"` → `class="sd-warn"` 로 **치환한 문자열**이
 *   **신규 빌더 재생성 결과와 완전히 같아야** 한다.
 *     stored.replace('class="sd-who"', 'class="sd-warn"') === regenerated
 *   같으면 "허용된 클래스 변경 외 차이 0" 이 증명된다. 한 건이라도 다르면 **전체 중단**.
 *   → 빌더가 그동안 다른 부분까지 바뀌었다면 여기서 잡힌다.
 *
 * 안전:
 *   - INSERT·DELETE 문 없음. UPDATE 만.
 *   - 대상 1,372 아니면 중단 · 불일치 1건이라도 있으면 중단 · 단일 트랜잭션.
 *   - `content` 만 갱신(+updated_at). status·language·master_id·source_ref_id 미변경.
 *
 * DB write 게이트: `--apply` AND `DRUG_OTC_SD_WARN_BACKFILL_CONFIRM=YES`
 *
 * Usage:
 *   DB_HOST=127.0.0.1 DB_PORT=<proxy> DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-sd-warn-backfill.ts [--apply]
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import {
  buildDrugOtcEnConsumerHtml,
  type DrugOtcEnTranslation,
} from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';
import type { SharedProductDescriptionSourceType } from '../modules/neture/entities/SharedProductDescription.entity.js';

const SOURCE_TYPE: SharedProductDescriptionSourceType = 'mfds_drug_otc';
const EXPECTED_KO = 686;
const EXPECTED_EN = 686;
const EXPECTED_TOTAL = EXPECTED_KO + EXPECTED_EN;
const FROM = 'class="sd-who"';
const TO = 'class="sd-warn"';
const CHUNK = 200;

const TRANSLATIONS_PATH =
  process.env.OTC_EN_TRANSLATIONS_PATH ??
  path.resolve(
    process.cwd(),
    '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-v1.json',
  );

interface Row {
  id: string;
  language: string;
  content: string;
  candidate_id: string;
  title: string;
  group_key: string;
  content_json: Record<string, unknown>;
}

async function main(): Promise<void> {
  const apply =
    process.argv.slice(2).includes('--apply') &&
    process.env.DRUG_OTC_SD_WARN_BACKFILL_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const enFile = JSON.parse(fs.readFileSync(TRANSLATIONS_PATH, 'utf8')) as {
    translations: DrugOtcEnTranslation[];
  };
  const enByGroup = new Map(enFile.translations.map((t) => [t.groupKey, t]));

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
    // ── 1) 대상 + 재생성 소스 로드 ──
    const rows: Row[] = await ds.query(
      `SELECT s.id::text, s.language, s.content, s.source_ref_id::text AS candidate_id,
              d.title, d.content_json->>'groupKey' AS group_key, d.content_json
       FROM shared_product_descriptions s
       JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
       WHERE s.source_type = $1 AND s.description_type = 'STORE'
         AND s.status = 'canonical' AND s.deleted_at IS NULL
       ORDER BY s.language, s.id`,
      [SOURCE_TYPE],
    );

    const ko = rows.filter((r) => r.language === 'ko');
    const en = rows.filter((r) => r.language === 'en');

    // ── 2) 사전 검증 ──
    const hasWho = rows.filter((r) => r.content.includes(FROM)).length;
    const hasWarn = rows.filter((r) => r.content.includes(TO)).length;
    const [{ pairs }]: { pairs: string }[] = await ds.query(
      `SELECT count(*)::text AS pairs
       FROM shared_product_descriptions k
       JOIN shared_product_descriptions e ON e.master_id=k.master_id AND e.language='en'
        AND e.description_type='STORE' AND e.status='canonical' AND e.deleted_at IS NULL
       WHERE k.source_type=$1 AND k.language='ko' AND k.description_type='STORE'
         AND k.status='canonical' AND k.deleted_at IS NULL`,
      [SOURCE_TYPE],
    );
    const [{ dup }]: { dup: string }[] = await ds.query(
      `SELECT count(*)::text AS dup FROM (
         SELECT master_id, description_type, COALESCE(language,'ko') AS lang
         FROM shared_product_descriptions WHERE deleted_at IS NULL AND status='canonical'
         GROUP BY 1,2,3 HAVING count(*) > 1) x`,
    );

    const pre = [
      { name: 'ko 686', ok: ko.length === EXPECTED_KO, got: ko.length },
      { name: 'en 686', ok: en.length === EXPECTED_EN, got: en.length },
      { name: '대상 전부 sd-who', ok: hasWho === EXPECTED_TOTAL, got: hasWho },
      { name: '대상의 sd-warn 0', ok: hasWarn === 0, got: hasWarn },
      { name: 'ko↔en 연결 686쌍', ok: Number(pairs) === EXPECTED_KO, got: Number(pairs) },
      { name: 'canonical 중복 0', ok: Number(dup) === 0, got: Number(dup) },
    ];

    // ── 3) 재생성 + 변경 증명 ──
    const planned: { id: string; content: string }[] = [];
    const mismatches: { id: string; language: string; group: string; reason: string }[] = [];

    for (const r of rows) {
      let regenerated: string;
      if (r.language === 'ko') {
        const built = buildDrugOtcConsumerHtml(r.content_json as never, { title: r.title });
        if (built.missing.length) {
          mismatches.push({ id: r.id, language: r.language, group: r.group_key, reason: `INCOMPLETE:${built.missing.join(',')}` });
          continue;
        }
        regenerated = built.html;
      } else {
        const t = enByGroup.get(r.group_key);
        if (!t) {
          mismatches.push({ id: r.id, language: r.language, group: r.group_key, reason: 'NO_TRANSLATION' });
          continue;
        }
        const built = buildDrugOtcEnConsumerHtml(t);
        if (built.missing.length) {
          mismatches.push({ id: r.id, language: r.language, group: r.group_key, reason: `INCOMPLETE:${built.missing.join(',')}` });
          continue;
        }
        regenerated = built.html;
      }

      // **변경 증명**: 저장본의 클래스만 치환한 결과 === 재생성 결과
      const substituted = r.content.split(FROM).join(TO);
      if (substituted !== regenerated) {
        mismatches.push({ id: r.id, language: r.language, group: r.group_key, reason: 'DIFF_BEYOND_CLASS' });
        continue;
      }
      planned.push({ id: r.id, content: regenerated });
    }

    // ── 4) apply ──
    if (apply) {
      const bad = pre.filter((c) => !c.ok);
      if (bad.length) throw new Error(`사전 검증 실패 — 중단: ${bad.map((b) => `${b.name}(=${b.got})`).join(', ')}`);
      if (mismatches.length)
        throw new Error(`허용 외 차이 ${mismatches.length}건 — 전체 중단 (예: ${mismatches[0].group}/${mismatches[0].reason})`);
      if (planned.length !== EXPECTED_TOTAL)
        throw new Error(`대상 수 불일치: ${planned.length} ≠ ${EXPECTED_TOTAL} — 중단`);

      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (let i = 0; i < planned.length; i += CHUNK) {
          const part = planned.slice(i, i + CHUNK);
          const res = await qr.query(
            `UPDATE shared_product_descriptions s
                SET content = v.content, updated_at = now()
               FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS content) v
              WHERE s.id = v.id
             RETURNING s.id`,
            [part.map((p) => p.id), part.map((p) => p.content)],
          );
          const r2: unknown[] = Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as unknown[]) : (res as unknown[]);
          updated += Array.isArray(r2) ? r2.length : 0;
        }
        if (updated !== EXPECTED_TOTAL) throw new Error(`UPDATE 수 불일치: ${updated} ≠ ${EXPECTED_TOTAL} — 롤백`);

        // 커밋 전 사후검증
        const [chk]: { warn: string; who: string; ko: string; en: string }[] = await qr.query(
          `SELECT
             count(*) FILTER (WHERE content LIKE '%class="sd-warn"%')::text AS warn,
             count(*) FILTER (WHERE content LIKE '%class="sd-who"%')::text  AS who,
             count(*) FILTER (WHERE language='ko')::text AS ko,
             count(*) FILTER (WHERE language='en')::text AS en
           FROM shared_product_descriptions
           WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`,
          [SOURCE_TYPE],
        );
        if (Number(chk.warn) !== EXPECTED_TOTAL) throw new Error(`sd-warn ${chk.warn} ≠ ${EXPECTED_TOTAL} — 롤백`);
        if (Number(chk.who) !== 0) throw new Error(`sd-who 잔여 ${chk.who} — 롤백`);
        if (Number(chk.ko) !== EXPECTED_KO || Number(chk.en) !== EXPECTED_EN)
          throw new Error(`건수 변동 ko=${chk.ko} en=${chk.en} — 롤백`);

        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    console.log('───────────────────────────────────────────────');
    console.log(`OTC sd-warn 소급 (${mode})`);
    console.log('───────────────────────────────────────────────');
    for (const c of pre) console.log(`  ${c.ok ? '✅' : '❌'} ${c.name.padEnd(22)} = ${c.got}`);
    console.log(`재생성 대상          : ${rows.length} (ko ${ko.length} / en ${en.length})`);
    console.log(`허용 변경만 확인됨   : ${planned.length}`);
    console.log(`허용 외 차이         : ${mismatches.length}${mismatches.length ? ' — ' + mismatches.slice(0, 3).map((m) => `${m.group}/${m.reason}`).join(', ') : ''}`);
    console.log(`INSERT / DELETE      : 0 / 0 (문 없음)`);
    console.log(`dbWrite(UPDATE)      : ${apply ? updated : 0}`);
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
