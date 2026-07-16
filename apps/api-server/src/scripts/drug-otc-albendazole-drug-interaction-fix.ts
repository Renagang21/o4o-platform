/**
 * 알벤다졸 병용금지 8종 보완 — ko 33 + en 33 = 66 rows + draft 1 + EN JSON
 *
 * WO 연속: WO-O4O-OTC-ALBENDAZOLE-STRONGYLOIDES-DOSAGE-FIX-V1 후속(같은 그룹 누락)
 * 근거: CHECK-O4O-OTC-AUTO-CANONICAL-SAFETY-OMISSION-AUDIT-V1 §2-2
 *
 * 문제: 8/8 원문 공통 "테오필린, 시메티딘, 프라지콴텔, 덱사메타손, 리토나비르, 페니토인,
 *   카르바마제핀, 페노바르비탈과 함께 복용하지 마십시오" 가 DRAFT 주의사항에 전면 누락.
 *   (현재 주의사항에 상호작용 언급 자체가 없음)
 *
 * ⚠️ 공개 중인 canonical UPDATE 66 rows + draft 1 + EN JSON. INSERT·DELETE 0.
 *
 * 변경 증명: 분선충 보완과 동일 방식.
 *   ① regenerate(현재 draft) === 저장본 (drift 0)
 *   ② after.split(추가문장).join('') === before  → 추가 문장 외 차이 0
 *
 * DB write 게이트: `--apply` AND `DRUG_OTC_ALBENDAZOLE_INT_CONFIRM=YES`
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

// caution 삽입 앵커(이 문장 앞에 추가문장을 끼운다). 추가문장에 <>& 없음 → esc 항등.
const KO_ANCHOR = '간장애·신장애가 있으면 복용 전 약사와 상담하세요.';
const KO_ADDED =
  '테오필린, 시메티딘, 프라지콴텔, 덱사메타손, 리토나비르, 페니토인, 카르바마제핀, 페노바르비탈과 함께 복용하지 않습니다. ';
const EN_ANCHOR = 'Talk to a pharmacist before taking it if you have liver or kidney problems.';
const EN_ADDED =
  'Do not take it together with theophylline, cimetidine, praziquantel, dexamethasone, ritonavir, phenytoin, carbamazepine or phenobarbital. ';

// 멱등/사후 판정용 마커(추가문장 고유 부분)
const KO_MARK = '카르바마제핀, 페노바르비탈과 함께 복용하지 않습니다';
const EN_MARK = 'carbamazepine or phenobarbital';

// 삽입분에서 태그·공백을 제거했을 때 나와야 하는 정확한 텍스트(마침표 포함, 후행 공백 없음).
const KO_CORE = KO_ADDED.trim();
const EN_CORE = EN_ADDED.trim();

const TRANSLATIONS_PATH =
  process.env.OTC_EN_TRANSLATIONS_PATH ??
  path.resolve(
    process.cwd(),
    '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-v1.json',
  );

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

// ko 빌더는 caution 을 문단(=단일 li)으로, en 빌더는 문장별 li 로 낸다.
// 두 경우 모두 "단일 연속 삽입"만 허용한다: before/after 의 공통 prefix·suffix 로 삽입분을 격리하고,
// 그 삽입분에서 li 태그·공백을 제거한 텍스트가 기대 문구(약물 나열)와 정확히 같아야 한다.
function singleInsertionProof(
  before: string,
  after: string,
  expectedCore: string,
): { ok: boolean; reason?: string } {
  if (before === after) return { ok: false, reason: 'NO_CHANGE' };
  let p = 0;
  while (p < before.length && p < after.length && before[p] === after[p]) p++;
  let s = 0;
  while (
    s < before.length - p &&
    s < after.length - p &&
    before[before.length - 1 - s] === after[after.length - 1 - s]
  )
    s++;
  // before = prefix + suffix (삽입 외 변경 0) — after 는 그 사이에만 삽입분이 있다.
  if (before.slice(0, p) + before.slice(before.length - s) !== before)
    return { ok: false, reason: 'BEFORE_NOT_PREFIX_SUFFIX' };
  if (after.length <= before.length) return { ok: false, reason: 'NOT_INSERTION' };
  const insertion = after.slice(p, after.length - s);
  const core = insertion.replace(/<\/?li>/g, '').replace(/\s+/g, ' ').trim();
  if (core !== expectedCore) return { ok: false, reason: `CORE_MISMATCH:${core.slice(0, 40)}` };
  return { ok: true };
}

interface Row {
  id: string;
  language: string;
  content: string;
  title: string;
  content_json: Record<string, unknown>;
}

async function main(): Promise<void> {
  const apply =
    process.argv.slice(2).includes('--apply') &&
    process.env.DRUG_OTC_ALBENDAZOLE_INT_CONFIRM === 'YES';
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
    // ── 0) 멱등 가드 ──
    const [{ ko_done, en_done }]: { ko_done: string; en_done: string }[] = await ds.query(
      `SELECT
         count(*) FILTER (WHERE s.language='ko' AND s.content LIKE '%' || $3 || '%')::text AS ko_done,
         count(*) FILTER (WHERE s.language='en' AND s.content LIKE '%' || $4 || '%')::text AS en_done
       FROM shared_product_descriptions s
       JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
       WHERE s.source_type=$1 AND s.description_type='STORE' AND s.status='canonical'
         AND s.deleted_at IS NULL AND d.content_json->>'groupKey'=$2`,
      [SOURCE_TYPE, GROUP_KEY, KO_MARK, EN_MARK],
    );
    if (Number(ko_done) === EXPECTED_KO && Number(en_done) === EXPECTED_EN) {
      console.log(`알벤다졸 병용금지 (${mode}) — **이미 적용됨 (no-op)** · dbWrite 0`);
      return;
    }

    // ── 1) 대상 로드 ──
    const rows: Row[] = await ds.query(
      `SELECT s.id::text, s.language, s.content, d.title, d.content_json
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
    const draftCaution = String(draftJson.caution ?? '');

    // ── 2) 사전 검증 ──
    const checks: { name: string; ok: boolean; got: string | number }[] = [
      { name: 'ko 33', ok: ko.length === EXPECTED_KO, got: ko.length },
      { name: 'en 33', ok: en.length === EXPECTED_EN, got: en.length },
      { name: '주의에 병용 언급 없음', ok: !/테오필린|병용|함께 복용/.test(draftCaution), got: /테오필린/.test(draftCaution) ? 'ALREADY' : 'ok' },
      { name: 'ko 앵커 존재', ok: draftCaution.includes(KO_ANCHOR), got: draftCaution.includes(KO_ANCHOR) ? 'yes' : 'NO' },
      { name: 'EN 번역 존재', ok: !!enT, got: enT ? 'yes' : 'NO' },
      { name: 'EN 앵커 존재', ok: !!enT && enT.caution.includes(EN_ANCHOR), got: enT && enT.caution.includes(EN_ANCHOR) ? 'yes' : 'NO' },
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

    // ── 3) 신규 draft/translation ──
    const newDraftJson = { ...draftJson, caution: draftCaution.replace(KO_ANCHOR, KO_ADDED + KO_ANCHOR) };
    const newEnT: DrugOtcEnTranslation | null = enT
      ? { ...enT, caution: enT.caution.replace(EN_ANCHOR, EN_ADDED + EN_ANCHOR) }
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
        if (newBuilt.missing.length) { mismatches.push({ id: r.id, lang: 'ko', reason: 'INCOMPLETE' }); continue; }
        const pf = singleInsertionProof(r.content, newBuilt.html, KO_CORE);
        if (!pf.ok) { mismatches.push({ id: r.id, lang: 'ko', reason: pf.reason! }); continue; }
        planned.push({ id: r.id, content: newBuilt.html });
      } else {
        if (!enT || !newEnT) { mismatches.push({ id: r.id, lang: 'en', reason: 'NO_TRANSLATION' }); continue; }
        const oldBuilt = buildDrugOtcEnConsumerHtml(enT);
        if (oldBuilt.missing.length || oldBuilt.html !== r.content) {
          mismatches.push({ id: r.id, lang: 'en', reason: 'BUILDER_DRIFT' });
          continue;
        }
        const newBuilt = buildDrugOtcEnConsumerHtml(newEnT);
        if (newBuilt.missing.length) { mismatches.push({ id: r.id, lang: 'en', reason: 'INCOMPLETE' }); continue; }
        const pf = singleInsertionProof(r.content, newBuilt.html, EN_CORE);
        if (!pf.ok) { mismatches.push({ id: r.id, lang: 'en', reason: pf.reason! }); continue; }
        planned.push({ id: r.id, content: newBuilt.html });
      }
    }

    // ── 5) apply ──
    if (apply) {
      const bad = checks.filter((c) => !c.ok);
      if (bad.length) throw new Error(`사전 검증 실패: ${bad.map((b) => `${b.name}(=${b.got})`).join(', ')}`);
      if (mismatches.length)
        throw new Error(`허용 외 차이 ${mismatches.length}건 — 중단 (예: ${mismatches[0].lang}/${mismatches[0].reason})`);
      if (planned.length !== EXPECTED_TOTAL) throw new Error(`대상 수 불일치: ${planned.length} ≠ ${EXPECTED_TOTAL}`);

      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        const dr = await qr.query(
          `UPDATE product_candidate_description_drafts
              SET content_json = jsonb_set(content_json, '{caution}', to_jsonb($2::text), false), updated_at = now()
            WHERE source_label='MFDS_DRUG_OTC' AND content_json->>'groupKey'=$1 AND content_json->>'caution'=$3
           RETURNING id`,
          [GROUP_KEY, String(newDraftJson.caution), draftCaution],
        );
        const drr: unknown[] = Array.isArray(dr) && Array.isArray(dr[0]) ? (dr[0] as unknown[]) : (dr as unknown[]);
        if (drr.length !== 1) throw new Error(`draft 갱신 수 이상: ${drr.length} ≠ 1 — 롤백`);

        for (let i = 0; i < planned.length; i += CHUNK) {
          const part = planned.slice(i, i + CHUNK);
          const res = await qr.query(
            `UPDATE shared_product_descriptions s SET content = v.content, updated_at = now()
               FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS content) v
              WHERE s.id = v.id RETURNING s.id`,
            [part.map((p) => p.id), part.map((p) => p.content)],
          );
          const rr: unknown[] = Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as unknown[]) : (res as unknown[]);
          updated += rr.length;
        }
        if (updated !== EXPECTED_TOTAL) throw new Error(`UPDATE 수 불일치: ${updated} ≠ ${EXPECTED_TOTAL} — 롤백`);

        const [chk]: { ko_int: string; en_int: string; ko: string; en: string }[] = await qr.query(
          `SELECT
             count(*) FILTER (WHERE s.language='ko' AND s.content LIKE '%' || $3 || '%')::text AS ko_int,
             count(*) FILTER (WHERE s.language='en' AND s.content LIKE '%' || $4 || '%')::text AS en_int,
             count(*) FILTER (WHERE s.language='ko')::text AS ko, count(*) FILTER (WHERE s.language='en')::text AS en
           FROM shared_product_descriptions s
           JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
           WHERE s.source_type=$1 AND s.description_type='STORE' AND s.status='canonical'
             AND s.deleted_at IS NULL AND d.content_json->>'groupKey'=$2`,
          [SOURCE_TYPE, GROUP_KEY, KO_MARK, EN_MARK],
        );
        if (Number(chk.ko_int) !== EXPECTED_KO || Number(chk.en_int) !== EXPECTED_EN)
          throw new Error(`병용금지 삽입 ko=${chk.ko_int} en=${chk.en_int} — 롤백`);
        if (Number(chk.ko) !== EXPECTED_KO || Number(chk.en) !== EXPECTED_EN)
          throw new Error(`건수 변동 ko=${chk.ko} en=${chk.en} — 롤백`);

        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }

      if (newEnT) {
        enT!.caution = newEnT.caution;
        fs.writeFileSync(TRANSLATIONS_PATH, JSON.stringify(enFile, null, 2) + '\n', 'utf8');
        console.log(`EN JSON 갱신: ${path.basename(TRANSLATIONS_PATH)}`);
      }
    }

    console.log('───────────────────────────────────────────────');
    console.log(`알벤다졸 병용금지 8종 보완 (${mode})`);
    console.log('───────────────────────────────────────────────');
    for (const c of checks) console.log(`  ${c.ok ? '✅' : '❌'} ${c.name.padEnd(20)} = ${c.got}`);
    console.log(`재생성 대상        : ${rows.length} (ko ${ko.length} / en ${en.length})`);
    console.log(`허용 변경만 확인됨 : ${planned.length}`);
    console.log(`허용 외 차이       : ${mismatches.length}${mismatches.length ? ' — ' + mismatches.slice(0, 3).map((m) => `${m.lang}/${m.reason}`).join(', ') : ''}`);
    console.log(`dbWrite            : ${apply ? updated + ' rows + draft 1' : 0}`);
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
