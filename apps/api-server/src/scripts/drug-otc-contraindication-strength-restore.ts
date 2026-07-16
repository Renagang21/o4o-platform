/**
 * OTC 금기 강도 복원 — 세티리진 정 72 + 에르도스테인 캡슐 67 = 139 master (ko+en = 278 rows)
 *
 * WO-O4O-OTC-CONTRAINDICATION-STRENGTH-RESTORE-139-V1
 * 근거: CHECK-O4O-OTC-AUTO-CANONICAL-SAFETY-OMISSION-AUDIT-V1 §3-1
 *
 * ⚠️ **공개 중인 canonical 콘텐츠를 UPDATE 한다.**
 *
 * 문제:
 *   허가 원문이 "…이 약을 복용하지 마십시오"(금기) 인데 공개 설명서가 "주의합니다"(주의) 로 낮췄다.
 *   영문도 같은 자리에서 "Take care if…" 로 낮췄다.
 *
 * 정합 근거(추측 아님):
 *   - ko: 같은 성분·함량의 **에르도스테인 300mg 정** draft 는 동일 항목을 "복용하지 않습니다" 로 쓴다.
 *   - en: 37그룹 중 **29그룹이 "Do not take this if…"**. "Take care if…" 는 이 2그룹뿐이다.
 *   → 이 2그룹만 이탈했다. 저장소 안의 다수 문형으로 되돌리는 것이다.
 *
 * 변경 범위(엄격):
 *   caution **첫 문장의 강도 표현만**. 대상 열거·순서·효능·용법·수치·요약표 전부 불변.
 *   "운전·기계 조작에 주의" / "take care when driving" 은 금기가 아니므로 **건드리지 않는다**.
 *
 * 변경 증명(2단계):
 *   ① 현재 draft(구 문구)로 재생성한 HTML === 저장된 HTML  → 빌더가 안정적임을 먼저 증명
 *   ② 새 문구로 재생성한 HTML === ①의 결과에서 허용 문구만 치환한 것 → 그 외 차이 0
 *   한 건이라도 어긋나면 전체 중단.
 *
 * 안전:
 *   - INSERT·DELETE 문 없음. UPDATE 만.
 *   - 대상 수 ko 139 / en 139 아니면 중단 · 단일 트랜잭션 · 커밋 전 사후검증 롤백.
 *   - `content` 만 갱신(+updated_at). status·language·master_id·source_ref_id 미변경.
 *   - 대상 외 그룹(547 master)은 SELECT 조차 UPDATE 하지 않는다 — 지문으로 확인.
 *
 * DB write 게이트: `--apply` AND `DRUG_OTC_CONTRA_RESTORE_CONFIRM=YES`
 *
 * Usage:
 *   DB_HOST=127.0.0.1 DB_PORT=<proxy> ... npx tsx src/scripts/drug-otc-contraindication-strength-restore.ts [--apply]
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
const CHUNK = 200;

const TRANSLATIONS_PATH =
  process.env.OTC_EN_TRANSLATIONS_PATH ??
  path.resolve(
    process.cwd(),
    '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-v1.json',
  );

/** 그룹별 허용 치환 — 이 문자열 외에는 어떤 변경도 하지 않는다. */
interface Fix {
  groupKey: string;
  koRows: number;
  enRows: number;
  ko: { from: string; to: string };
  en: { from: string; to: string };
}

const FIXES: Fix[] = [
  {
    groupKey: '세티리진염산염|10밀리그램|정',
    koRows: 72,
    enRows: 72,
    ko: {
      from: '이 약 또는 히드록시진·피페라진 유도체에 과민증이 있거나 신부전인 경우 주의합니다.',
      to: '이 약 또는 히드록시진·피페라진 유도체에 과민증이 있거나 신부전인 경우 복용하지 않습니다.',
    },
    en: {
      from: 'Take care if you have ever reacted to this medicine or to hydroxyzine or piperazine derivatives, or if you have kidney failure.',
      to: 'Do not take this if you have ever reacted to it or to hydroxyzine or piperazine derivatives, or if you have kidney failure.',
    },
  },
  {
    groupKey: '에르도스테인|300밀리그램|캡슐',
    koRows: 67,
    enRows: 67,
    ko: {
      from: '이 약에 과민증이 있거나 소화성궤양, 중증 신장장애, 간경변, 시스타티오닌 합성효소 결핍이 있는 경우 주의합니다.',
      to: '이 약에 과민증이 있거나 소화성궤양, 중증 신장장애, 간경변, 시스타티오닌 합성효소 결핍이 있는 경우 복용하지 않습니다.',
    },
    en: {
      from: 'Take care if you have ever reacted to this medicine, or if you have a peptic ulcer, severe kidney problems, cirrhosis of the liver, or cystathionine synthase deficiency.',
      to: 'Do not take this if you have ever reacted to it, or if you have a peptic ulcer, severe kidney problems, cirrhosis of the liver, or cystathionine synthase deficiency.',
    },
  },
];

const EXPECTED_KO = FIXES.reduce((s, f) => s + f.koRows, 0); // 139
const EXPECTED_EN = FIXES.reduce((s, f) => s + f.enRows, 0); // 139
const EXPECTED_TOTAL = EXPECTED_KO + EXPECTED_EN; // 278

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

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
    process.env.DRUG_OTC_CONTRA_RESTORE_CONFIRM === 'YES';
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
    const keys = FIXES.map((f) => f.groupKey);

    // ── 0) 멱등 가드 — 이미 적용된 상태면 no-op 으로 정상 종료 ──
    const [{ weak, strong }]: { weak: string; strong: string }[] = await ds.query(
      `SELECT
         count(*) FILTER (WHERE s.content LIKE '%경우 주의합니다%' OR s.content LIKE '%Take care if you have ever reacted%')::text AS weak,
         count(*) FILTER (WHERE s.content LIKE '%복용하지 않습니다%' OR s.content LIKE '%Do not take this if you have ever reacted%')::text AS strong
       FROM shared_product_descriptions s
       JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
       WHERE s.source_type=$1 AND s.description_type='STORE' AND s.status='canonical'
         AND s.deleted_at IS NULL AND d.content_json->>'groupKey' = ANY($2::text[])`,
      [SOURCE_TYPE, keys],
    );
    if (Number(weak) === 0 && Number(strong) === EXPECTED_TOTAL) {
      console.log('───────────────────────────────────────────────');
      console.log(`OTC 금기 강도 복원 (${mode}) — **이미 적용됨 (no-op)**`);
      console.log(`  약화 표현 잔여 : 0`);
      console.log(`  금기 강도      : ${strong} / ${EXPECTED_TOTAL}`);
      console.log(`  dbWrite        : 0`);
      return;
    }

    // ── 1) 대상 로드 ──
    const rows: Row[] = await ds.query(
      `SELECT s.id::text, s.language, s.content, s.source_ref_id::text AS candidate_id,
              d.title, d.content_json->>'groupKey' AS group_key, d.content_json
         FROM shared_product_descriptions s
         JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
        WHERE s.source_type = $1 AND s.description_type = 'STORE'
          AND s.status = 'canonical' AND s.deleted_at IS NULL
          AND d.content_json->>'groupKey' = ANY($2::text[])
        ORDER BY s.language, s.id`,
      [SOURCE_TYPE, keys],
    );
    const ko = rows.filter((r) => r.language === 'ko');
    const en = rows.filter((r) => r.language === 'en');

    // ── 2) 사전 검증 ──
    const checks: { name: string; ok: boolean; got: string | number }[] = [];
    checks.push({ name: 'ko 139', ok: ko.length === EXPECTED_KO, got: ko.length });
    checks.push({ name: 'en 139', ok: en.length === EXPECTED_EN, got: en.length });
    for (const f of FIXES) {
      const k = ko.filter((r) => r.group_key === f.groupKey).length;
      const e = en.filter((r) => r.group_key === f.groupKey).length;
      checks.push({ name: `${f.groupKey.split('|')[0]} ko`, ok: k === f.koRows, got: k });
      checks.push({ name: `${f.groupKey.split('|')[0]} en`, ok: e === f.enRows, got: e });
      // draft 의 caution 이 구 문구를 정확히 담고 있는가
      const draft = rows.find((r) => r.group_key === f.groupKey);
      const cau = String(draft?.content_json?.caution ?? '');
      checks.push({
        name: `${f.groupKey.split('|')[0]} ko 구문구 존재`,
        ok: cau.includes(f.ko.from),
        got: cau.includes(f.ko.from) ? 'yes' : 'NO',
      });
      const t = enByGroup.get(f.groupKey);
      checks.push({
        name: `${f.groupKey.split('|')[0]} en 구문구 존재`,
        ok: !!t && t.caution.includes(f.en.from),
        got: t && t.caution.includes(f.en.from) ? 'yes' : 'NO',
      });
    }
    // 대상 외 그룹은 건드리지 않음 — 전체 686/686 중 나머지 확인용
    const [{ total_ko, total_en }]: { total_ko: string; total_en: string }[] = await ds.query(
      `SELECT count(*) FILTER (WHERE language='ko')::text AS total_ko,
              count(*) FILTER (WHERE language='en')::text AS total_en
         FROM shared_product_descriptions
        WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`,
      [SOURCE_TYPE],
    );
    checks.push({ name: '전체 ko 686', ok: Number(total_ko) === 686, got: Number(total_ko) });
    checks.push({ name: '전체 en 686', ok: Number(total_en) === 686, got: Number(total_en) });

    // ── 3) 재생성 + 변경 증명 ──
    const planned: { id: string; content: string }[] = [];
    const mismatches: { id: string; group: string; lang: string; reason: string }[] = [];

    for (const r of rows) {
      const f = FIXES.find((x) => x.groupKey === r.group_key)!;

      if (r.language === 'ko') {
        // ① 구 문구로 재생성 === 저장본 (빌더 안정성 증명)
        const oldBuilt = buildDrugOtcConsumerHtml(r.content_json as never, { title: r.title });
        if (oldBuilt.missing.length || oldBuilt.html !== r.content) {
          mismatches.push({ id: r.id, group: r.group_key, lang: 'ko', reason: 'BUILDER_DRIFT' });
          continue;
        }
        // ② 새 문구로 재생성
        const cau = String(r.content_json.caution ?? '');
        if (!cau.includes(f.ko.from)) {
          mismatches.push({ id: r.id, group: r.group_key, lang: 'ko', reason: 'NO_OLD_PHRASE' });
          continue;
        }
        const nextJson = { ...r.content_json, caution: cau.split(f.ko.from).join(f.ko.to) };
        const newBuilt = buildDrugOtcConsumerHtml(nextJson as never, { title: r.title });
        if (newBuilt.missing.length) {
          mismatches.push({ id: r.id, group: r.group_key, lang: 'ko', reason: 'INCOMPLETE' });
          continue;
        }
        // ③ 허용 치환 외 차이 0 — HTML 수준에서도 문구만 바뀌었는가
        if (r.content.split(esc(f.ko.from)).join(esc(f.ko.to)) !== newBuilt.html) {
          mismatches.push({ id: r.id, group: r.group_key, lang: 'ko', reason: 'DIFF_BEYOND_PHRASE' });
          continue;
        }
        planned.push({ id: r.id, content: newBuilt.html });
      } else {
        const t = enByGroup.get(r.group_key);
        if (!t) {
          mismatches.push({ id: r.id, group: r.group_key, lang: 'en', reason: 'NO_TRANSLATION' });
          continue;
        }
        const oldBuilt = buildDrugOtcEnConsumerHtml(t);
        if (oldBuilt.missing.length || oldBuilt.html !== r.content) {
          mismatches.push({ id: r.id, group: r.group_key, lang: 'en', reason: 'BUILDER_DRIFT' });
          continue;
        }
        if (!t.caution.includes(f.en.from)) {
          mismatches.push({ id: r.id, group: r.group_key, lang: 'en', reason: 'NO_OLD_PHRASE' });
          continue;
        }
        const nextT: DrugOtcEnTranslation = {
          ...t,
          caution: t.caution.split(f.en.from).join(f.en.to),
        };
        const newBuilt = buildDrugOtcEnConsumerHtml(nextT);
        if (newBuilt.missing.length) {
          mismatches.push({ id: r.id, group: r.group_key, lang: 'en', reason: 'INCOMPLETE' });
          continue;
        }
        if (r.content.split(esc(f.en.from)).join(esc(f.en.to)) !== newBuilt.html) {
          mismatches.push({ id: r.id, group: r.group_key, lang: 'en', reason: 'DIFF_BEYOND_PHRASE' });
          continue;
        }
        planned.push({ id: r.id, content: newBuilt.html });
      }
    }

    // ── 4) apply ──
    if (apply) {
      const bad = checks.filter((c) => !c.ok);
      if (bad.length)
        throw new Error(`사전 검증 실패 — 중단: ${bad.map((b) => `${b.name}(=${b.got})`).join(', ')}`);
      if (mismatches.length)
        throw new Error(
          `허용 외 차이 ${mismatches.length}건 — 전체 중단 (예: ${mismatches[0].group}/${mismatches[0].lang}/${mismatches[0].reason})`,
        );
      if (planned.length !== EXPECTED_TOTAL)
        throw new Error(`대상 수 불일치: ${planned.length} ≠ ${EXPECTED_TOTAL} — 중단`);

      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        // 4-1) draft 소스 갱신 (2행) — 렌더 소스 = 구조화 필드이므로 여기가 SSOT
        for (const f of FIXES) {
          const res = await qr.query(
            `UPDATE product_candidate_description_drafts
                SET content_json = jsonb_set(content_json, '{caution}',
                      to_jsonb(replace(content_json->>'caution', $2, $3)), false),
                    updated_at = now()
              WHERE source_label = 'MFDS_DRUG_OTC'
                AND content_json->>'groupKey' = $1
                AND content_json->>'caution' LIKE '%' || $2 || '%'
             RETURNING id`,
            [f.groupKey, f.ko.from, f.ko.to],
          );
          const rr: unknown[] = Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as unknown[]) : (res as unknown[]);
          if (rr.length !== 1) throw new Error(`draft 갱신 수 이상: ${f.groupKey} → ${rr.length} ≠ 1 — 롤백`);
        }

        // 4-2) 공개 SPD 갱신 (278행)
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
        if (updated !== EXPECTED_TOTAL)
          throw new Error(`UPDATE 수 불일치: ${updated} ≠ ${EXPECTED_TOTAL} — 롤백`);

        // 4-3) 커밋 전 사후검증
        const [chk]: { weak: string; strong: string; ko: string; en: string }[] = await qr.query(
          `SELECT
             count(*) FILTER (WHERE content LIKE '%경우 주의합니다%' OR content LIKE '%Take care if you have ever reacted%')::text AS weak,
             count(*) FILTER (WHERE content LIKE '%복용하지 않습니다%' OR content LIKE '%Do not take this if you have ever reacted%')::text AS strong,
             count(*) FILTER (WHERE s.language='ko')::text AS ko,
             count(*) FILTER (WHERE s.language='en')::text AS en
           FROM shared_product_descriptions s
           JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
           WHERE s.source_type=$1 AND s.description_type='STORE' AND s.status='canonical'
             AND s.deleted_at IS NULL AND d.content_json->>'groupKey' = ANY($2::text[])`,
          [SOURCE_TYPE, keys],
        );
        if (Number(chk.weak) !== 0) throw new Error(`약화 표현 잔여 ${chk.weak} — 롤백`);
        if (Number(chk.strong) !== EXPECTED_TOTAL)
          throw new Error(`금기 강도 ${chk.strong} ≠ ${EXPECTED_TOTAL} — 롤백`);
        if (Number(chk.ko) !== EXPECTED_KO || Number(chk.en) !== EXPECTED_EN)
          throw new Error(`건수 변동 ko=${chk.ko} en=${chk.en} — 롤백`);

        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }

      // 4-4) 영문 SSOT 파일 갱신 — DB 커밋 성공 후에만.
      //      이 파일이 en 재생성의 소스이므로 갱신하지 않으면 다음 재생성 때 되돌아간다.
      for (const f of FIXES) {
        const t = enByGroup.get(f.groupKey)!;
        t.caution = t.caution.split(f.en.from).join(f.en.to);
      }
      // indent 2 = 현재 파일 포맷(round-trip 바이트 일치 확인함) → diff 가 해당 2줄로만 남는다.
      fs.writeFileSync(TRANSLATIONS_PATH, JSON.stringify(enFile, null, 2) + '\n', 'utf8');
      console.log(`영문 SSOT 갱신       : ${path.basename(TRANSLATIONS_PATH)} (2 그룹)`);
    }

    console.log('───────────────────────────────────────────────');
    console.log(`OTC 금기 강도 복원 (${mode})`);
    console.log('───────────────────────────────────────────────');
    for (const c of checks) console.log(`  ${c.ok ? '✅' : '❌'} ${c.name.padEnd(26)} = ${c.got}`);
    console.log(`재생성 대상          : ${rows.length} (ko ${ko.length} / en ${en.length})`);
    console.log(`허용 변경만 확인됨   : ${planned.length}`);
    console.log(
      `허용 외 차이         : ${mismatches.length}${mismatches.length ? ' — ' + mismatches.slice(0, 3).map((m) => `${m.group}/${m.lang}/${m.reason}`).join(', ') : ''}`,
    );
    console.log(`INSERT / DELETE      : 0 / 0 (문 없음)`);
    console.log(`dbWrite(UPDATE)      : ${apply ? updated + ' rows + draft 2' : 0}`);
    if (!apply && planned.length) {
      console.log(`\n지문(적용 후 예상): ko=${md5(planned.filter((_, i) => i < ko.length).map((p) => p.content).join('\n'))}`);
    }
  } finally {
    await ds.destroy();
  }
}

/** HTML 이스케이프 — 빌더가 텍스트를 그대로 넣는지 확인용(현재 문구엔 특수문자 없음). */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
