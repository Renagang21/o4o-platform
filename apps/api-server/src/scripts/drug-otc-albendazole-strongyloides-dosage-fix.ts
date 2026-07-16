/**
 * 알벤다졸 분선충 용법 보완 — ko 33 + en 33 = 66 rows + draft 1 + EN JSON
 *
 * WO-O4O-OTC-ALBENDAZOLE-STRONGYLOIDES-DOSAGE-FIX-V1
 * 근거: CHECK-O4O-OTC-AUTO-CANONICAL-SAFETY-OMISSION-AUDIT-V1 §3-3
 *
 * 문제: 효능에 "분선충" 이 있는데 용법에 그 용량이 없다 → 소비자가 단회 복용할 여지.
 * 원문(8/8 변형 공통): "분선충의 다른 기생충(조충)과 중증 혼합 감염 시 1일 1회 1정(400mg)씩 3일간 복용".
 *
 * ⚠️ 공개 중인 canonical UPDATE 66 rows + draft 1 + EN JSON. INSERT·DELETE 0.
 *
 * grounding 판단: 원문 용량은 **조충과의 중증 혼합감염 조건**에 한정된다. 조건 없이
 *   "분선충 400mg 3일간" 만 넣으면 단독 분선충에도 적용되는 것처럼 오도한다 → 조건을 살린다.
 *   이는 임의 추가가 아니라 허가 원문 범위의 충실한 반영이다(§CHECK 에 명시).
 *
 * 변경 증명:
 *   ① regenerate(현재 draft) === 저장본 (drift 0) — 빌더 안정성 먼저 증명
 *   ② after.replace(추가문장, '') === before — 추가 문장 외 차이 0
 *   한 건이라도 어긋나면 전체 중단/롤백.
 *
 * DB write 게이트: `--apply` AND `DRUG_OTC_ALBENDAZOLE_FIX_CONFIRM=YES`
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import {
  buildDrugOtcEnConsumerHtml,
  type DrugOtcEnTranslation,
} from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';
import type { SharedProductDescriptionSourceType } from '../modules/neture/entities/SharedProductDescription.entity.js';

const SOURCE_TYPE: SharedProductDescriptionSourceType = 'mfds_drug_otc';
const GROUP_KEY = '알벤다졸|400밀리그램|정';
const EXPECTED_KO = 33;
const EXPECTED_EN = 33;
const EXPECTED_TOTAL = EXPECTED_KO + EXPECTED_EN;
const CHUNK = 200;

// 삽입 앵커(이 문장 앞에 추가문장을 끼운다) + 추가문장. 추가문장에는 <>& 없음 → esc 항등.
const KO_ANCHOR = '삼키기 어려우면 씹거나 소량의 물과 함께 복용할 수 있습니다.';
const KO_ADDED =
  '분선충이 다른 기생충(조충)과 함께 중증으로 감염된 경우에는 1정(400mg)을 1일 1회 3일간 복용합니다. ';
const EN_ANCHOR =
  'If the tablet is hard to swallow, you may chew it or take it with a small amount of water.';
const EN_ADDED =
  'If threadworm occurs together with another parasite (tapeworm) as a severe infection, take one tablet (400 mg) once a day for 3 days. ';

const TRANSLATIONS_PATH =
  process.env.OTC_EN_TRANSLATIONS_PATH ??
  path.resolve(
    process.cwd(),
    '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-v1.json',
  );

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

interface Row {
  id: string;
  language: string;
  content: string;
  candidate_id: string;
  title: string;
  content_json: Record<string, unknown>;
}

async function main(): Promise<void> {
  const apply =
    process.argv.slice(2).includes('--apply') &&
    process.env.DRUG_OTC_ALBENDAZOLE_FIX_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const enFile = JSON.parse(fs.readFileSync(TRANSLATIONS_PATH, 'utf8')) as {
    translations: DrugOtcEnTranslation[];
  };
  const enT = enFile.translations.find((t) => t.groupKey === GROUP_KEY);

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
    // ── 0) 멱등 가드 — 이미 분선충 용법이 들어간 상태면 no-op ──
    const [{ ko_done, en_done }]: { ko_done: string; en_done: string }[] = await ds.query(
      `SELECT
         count(*) FILTER (WHERE s.language='ko' AND s.content LIKE '%다른 기생충(조충)과 함께 중증으로 감염%')::text AS ko_done,
         count(*) FILTER (WHERE s.language='en' AND s.content LIKE '%severe mixed infection%' OR (s.language='en' AND s.content LIKE '%as a severe infection%'))::text AS en_done
       FROM shared_product_descriptions s
       JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
       WHERE s.source_type=$1 AND s.description_type='STORE' AND s.status='canonical'
         AND s.deleted_at IS NULL AND d.content_json->>'groupKey'=$2`,
      [SOURCE_TYPE, GROUP_KEY],
    );
    if (Number(ko_done) === EXPECTED_KO && Number(en_done) === EXPECTED_EN) {
      console.log(`알벤다졸 분선충 용법 (${mode}) — **이미 적용됨 (no-op)** · dbWrite 0`);
      return;
    }

    // ── 1) 대상 로드 ──
    const rows: Row[] = await ds.query(
      `SELECT s.id::text, s.language, s.content, s.source_ref_id::text AS candidate_id,
              d.title, d.content_json
         FROM shared_product_descriptions s
         JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
        WHERE s.source_type=$1 AND s.description_type='STORE' AND s.status='canonical'
          AND s.deleted_at IS NULL AND d.content_json->>'groupKey'=$2
        ORDER BY s.language, s.id`,
      [SOURCE_TYPE, GROUP_KEY],
    );
    const ko = rows.filter((r) => r.language === 'ko');
    const en = rows.filter((r) => r.language === 'en');

    const draftJson = rows[0]?.content_json ?? {};
    const draftUsage = String(draftJson.usage ?? '');
    const draftEff = String(draftJson.efficacy ?? '');

    // ── 2) 사전 검증 ──
    const checks: { name: string; ok: boolean; got: string | number }[] = [
      { name: 'ko 33', ok: ko.length === EXPECTED_KO, got: ko.length },
      { name: 'en 33', ok: en.length === EXPECTED_EN, got: en.length },
      { name: '효능에 분선충', ok: /분선충/.test(draftEff), got: /분선충/.test(draftEff) ? 'yes' : 'NO' },
      { name: '용법에 분선충 없음', ok: !/분선충/.test(draftUsage), got: /분선충/.test(draftUsage) ? 'ALREADY' : 'ok' },
      { name: 'ko 앵커 존재', ok: draftUsage.includes(KO_ANCHOR), got: draftUsage.includes(KO_ANCHOR) ? 'yes' : 'NO' },
      { name: 'EN 번역 존재', ok: !!enT, got: enT ? 'yes' : 'NO' },
      { name: 'EN 효능 threadworm', ok: !!enT && /threadworm/i.test(enT.efficacy), got: enT && /threadworm/i.test(enT.efficacy) ? 'yes' : 'NO' },
      { name: 'EN 앵커 존재', ok: !!enT && enT.usage.includes(EN_ANCHOR), got: enT && enT.usage.includes(EN_ANCHOR) ? 'yes' : 'NO' },
    ];
    const [{ total_ko, total_en }]: { total_ko: string; total_en: string }[] = await ds.query(
      `SELECT count(*) FILTER (WHERE language='ko')::text AS total_ko,
              count(*) FILTER (WHERE language='en')::text AS total_en
         FROM shared_product_descriptions
        WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`,
      [SOURCE_TYPE],
    );
    checks.push({ name: '전체 ko 686', ok: Number(total_ko) === 686, got: Number(total_ko) });
    checks.push({ name: '전체 en 686', ok: Number(total_en) === 686, got: Number(total_en) });

    // ── 3) 신규 draft/translation 준비 ──
    const newDraftJson = {
      ...draftJson,
      usage: draftUsage.replace(KO_ANCHOR, KO_ADDED + KO_ANCHOR),
    };
    const newEnT: DrugOtcEnTranslation | null = enT
      ? { ...enT, usage: enT.usage.replace(EN_ANCHOR, EN_ADDED + EN_ANCHOR) }
      : null;

    // ── 4) 재생성 + 변경 증명 ──
    const planned: { id: string; content: string }[] = [];
    const mismatches: { id: string; lang: string; reason: string }[] = [];

    for (const r of rows) {
      if (r.language === 'ko') {
        const oldBuilt = buildDrugOtcConsumerHtml(r.content_json as never, { title: r.title });
        if (oldBuilt.missing.length || oldBuilt.html !== r.content) {
          mismatches.push({ id: r.id, lang: 'ko', reason: 'BUILDER_DRIFT' });
          continue;
        }
        const newBuilt = buildDrugOtcConsumerHtml(newDraftJson as never, { title: r.title });
        if (newBuilt.missing.length) {
          mismatches.push({ id: r.id, lang: 'ko', reason: 'INCOMPLETE' });
          continue;
        }
        // 추가문장 외 차이 0
        if (newBuilt.html.split(KO_ADDED).join('') !== r.content) {
          mismatches.push({ id: r.id, lang: 'ko', reason: 'DIFF_BEYOND_ADDED' });
          continue;
        }
        planned.push({ id: r.id, content: newBuilt.html });
      } else {
        if (!enT || !newEnT) {
          mismatches.push({ id: r.id, lang: 'en', reason: 'NO_TRANSLATION' });
          continue;
        }
        const oldBuilt = buildDrugOtcEnConsumerHtml(enT);
        if (oldBuilt.missing.length || oldBuilt.html !== r.content) {
          mismatches.push({ id: r.id, lang: 'en', reason: 'BUILDER_DRIFT' });
          continue;
        }
        const newBuilt = buildDrugOtcEnConsumerHtml(newEnT);
        if (newBuilt.missing.length) {
          mismatches.push({ id: r.id, lang: 'en', reason: 'INCOMPLETE' });
          continue;
        }
        if (newBuilt.html.split(EN_ADDED).join('') !== r.content) {
          mismatches.push({ id: r.id, lang: 'en', reason: 'DIFF_BEYOND_ADDED' });
          continue;
        }
        planned.push({ id: r.id, content: newBuilt.html });
      }
    }

    // ── 5) apply ──
    if (apply) {
      const bad = checks.filter((c) => !c.ok);
      if (bad.length) throw new Error(`사전 검증 실패: ${bad.map((b) => `${b.name}(=${b.got})`).join(', ')}`);
      if (mismatches.length)
        throw new Error(`허용 외 차이 ${mismatches.length}건 — 중단 (예: ${mismatches[0].lang}/${mismatches[0].reason})`);
      if (planned.length !== EXPECTED_TOTAL)
        throw new Error(`대상 수 불일치: ${planned.length} ≠ ${EXPECTED_TOTAL}`);

      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        // 5-1) draft usage 갱신 (1행)
        const dr = await qr.query(
          `UPDATE product_candidate_description_drafts
              SET content_json = jsonb_set(content_json, '{usage}', to_jsonb($2::text), false),
                  updated_at = now()
            WHERE source_label='MFDS_DRUG_OTC' AND content_json->>'groupKey'=$1
              AND content_json->>'usage' = $3
           RETURNING id`,
          [GROUP_KEY, String(newDraftJson.usage), draftUsage],
        );
        const drr: unknown[] = Array.isArray(dr) && Array.isArray(dr[0]) ? (dr[0] as unknown[]) : (dr as unknown[]);
        if (drr.length !== 1) throw new Error(`draft 갱신 수 이상: ${drr.length} ≠ 1 — 롤백`);

        // 5-2) SPD 66행
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
          const rr: unknown[] = Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as unknown[]) : (res as unknown[]);
          updated += rr.length;
        }
        if (updated !== EXPECTED_TOTAL) throw new Error(`UPDATE 수 불일치: ${updated} ≠ ${EXPECTED_TOTAL} — 롤백`);

        // 5-3) 커밋 전 사후검증
        const [chk]: { ko_dose: string; en_dose: string; ko_eff: string; en_eff: string; ko: string; en: string }[] =
          await qr.query(
            `SELECT
               count(*) FILTER (WHERE s.language='ko' AND s.content LIKE '%1일 1회 3일간%')::text AS ko_dose,
               count(*) FILTER (WHERE s.language='en' AND s.content LIKE '%once a day for 3 days%')::text AS en_dose,
               count(*) FILTER (WHERE s.language='ko' AND s.content LIKE '%분선충%')::text AS ko_eff,
               count(*) FILTER (WHERE s.language='en' AND s.content LIKE '%threadworm%')::text AS en_eff,
               count(*) FILTER (WHERE s.language='ko')::text AS ko,
               count(*) FILTER (WHERE s.language='en')::text AS en
             FROM shared_product_descriptions s
             JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
             WHERE s.source_type=$1 AND s.description_type='STORE' AND s.status='canonical'
               AND s.deleted_at IS NULL AND d.content_json->>'groupKey'=$2`,
            [SOURCE_TYPE, GROUP_KEY],
          );
        if (Number(chk.ko_dose) !== EXPECTED_KO || Number(chk.en_dose) !== EXPECTED_EN)
          throw new Error(`분선충 용량 ko=${chk.ko_dose} en=${chk.en_dose} — 롤백`);
        if (Number(chk.ko_eff) !== EXPECTED_KO || Number(chk.en_eff) !== EXPECTED_EN)
          throw new Error(`분선충 효능 소실 ko=${chk.ko_eff} en=${chk.en_eff} — 롤백`);
        if (Number(chk.ko) !== EXPECTED_KO || Number(chk.en) !== EXPECTED_EN)
          throw new Error(`건수 변동 ko=${chk.ko} en=${chk.en} — 롤백`);

        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }

      // 5-4) EN JSON 갱신 — DB 커밋 성공 후에만
      if (newEnT) {
        enT!.usage = newEnT.usage;
        fs.writeFileSync(TRANSLATIONS_PATH, JSON.stringify(enFile, null, 2) + '\n', 'utf8');
        console.log(`EN JSON 갱신: ${path.basename(TRANSLATIONS_PATH)}`);
      }
    }

    console.log('───────────────────────────────────────────────');
    console.log(`알벤다졸 분선충 용법 보완 (${mode})`);
    console.log('───────────────────────────────────────────────');
    for (const c of checks) console.log(`  ${c.ok ? '✅' : '❌'} ${c.name.padEnd(20)} = ${c.got}`);
    console.log(`재생성 대상        : ${rows.length} (ko ${ko.length} / en ${en.length})`);
    console.log(`허용 변경만 확인됨 : ${planned.length}`);
    console.log(`허용 외 차이       : ${mismatches.length}${mismatches.length ? ' — ' + mismatches.slice(0, 3).map((m) => `${m.lang}/${m.reason}`).join(', ') : ''}`);
    console.log(`dbWrite            : ${apply ? updated + ' rows + draft 1' : 0}`);
    console.log(`\n추가 문구(ko): ${KO_ADDED.trim()}`);
    console.log(`추가 문구(en): ${EN_ADDED.trim()}`);
    if (!apply && planned.length)
      console.log(`\n적용 후 예상 지문 ko=${md5(ko.map((r) => planned.find((p) => p.id === r.id)!.content).join('\n'))}`);
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
