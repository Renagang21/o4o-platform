/**
 * WO-O4O-OTC-BACILLUS-LICHENIFORMIS-250MG-EN-COMPLETE-DA-V1 (범용 en-complete runner)
 *
 * ko canonical LIVE 그룹의 영어 STORE 설명서를 en needs_review 전개 → canonical 완결.
 *   트리메부틴 en 완결(drug-otc-trimebutine-100mg-en.ts) 검증본을 그룹 registry 로 일반화.
 *   후속 그룹(디오스민 등)은 EN_REGISTRY 에 최소 등재로 재사용.
 *
 * ★ 스코프 안전(트리메부틴/바실루스 실증): candidate/source_ref_id 는 여러 fp 그룹에 **공유**될 수 있고
 *   대상 밖(out) master 가 이미 en canonical 을 가질 수 있다. → **대상은 grounded-upgrade runner 산출
 *   master_id 리스트로만 스코프**(source_ref_id 스코프 금지). 동일 약물이면(대상 ko == out ko) out 의
 *   검토완료 en 을 재구성, **build == live out en byte-identical** 을 게이트로 새 medical fact 0 증명.
 *
 * 정책: BULK-TRANSLATION-EXECUTION-GUIDE §0-B(grounded ko canonical 충실 번역=허용) · §3~§6.
 *   INSERT/상태전환만 · 단일 TX · 이중게이트 · dry-run 우선 · ko canonical UPDATE 0.
 *
 * dry-run 기본. apply 이중게이트: --apply + DRUG_OTC_EN_COMPLETE_CONFIRM=YES.
 *   apply = STEP1 en needs_review INSERT(TX1) → STEP2 canonical flip(TX2, 지문 불변 증명).
 *   재실행 = ALREADY_COMPLETE no-op(대상 en 이미 canonical·내용 build 일치 감지).
 *
 * Usage(apps/api-server): npx tsx src/scripts/drug-otc-en-complete-runner.ts --group=<key> [--apply]
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const TRANSLATIONS_DIR = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations');

// query() RETURNING 정규화(Gotcha #3): [rows, affected] | rows | [].
const retRows = <T = { id?: string }>(res: unknown): T[] =>
  (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];

interface EnCompleteConfig {
  key: string;              // groupKey (번역 JSON 매칭)
  candidate: string;        // authored source_ref_id (write-owner) — 스코프 아님, write 값
  sourceType: string;       // authored source_type (mfds_drug_otc | nutrition_combo)
  expected: number;         // 대상 master 수 (= ko canonical)
  koRunBase: string;        // grounded-upgrade runner 산출 stem (data/<koRunBase>.run.json → rollback_master_ids)
  translationFile: string;  // translations/ 파일명
  outBase: string;          // 산출 JSON stem
}

/** 등록 그룹 = ko canonical LIVE 확인분만. 후속은 스코프 조사 후 최소 등재. */
const EN_REGISTRY: Record<string, EnCompleteConfig> = {
  // 트리메부틴(검증 완료 · 재실행 regression: ALREADY_COMPLETE 기대)
  'trimebutine-100mg-jeong': {
    key: '트리메부틴말레산염|100밀리그램|정',
    candidate: '003beef8-82c4-4897-a176-d0ea8a695699',
    sourceType: 'mfds_drug_otc', expected: 66,
    koRunBase: 'otc-grounded-upgrade-trimebutine-100mg-jeong',
    translationFile: 'otc-en-translations-trimebutine-100mg-v1.json',
    outBase: 'otc-en-complete-trimebutine-100mg',
  },
  // 바실루스리케니포르미스균 250mg 캡슐 (WO-...-BACILLUS-...-EN-COMPLETE-DA-V1)
  //   source_ref_id 022f4af0 = 64 ko 공유(56 target + 8 out56). out56 8 이미 en canonical LIVE.
  //   56 ko == 8 ko(동일 약물) → out56 en 재구성. 56 master_id 스코프.
  'bacillus-liche-250mg-capsule': {
    key: '바실루스리케니포르미스균|250밀리그램|캡슐',
    candidate: '022f4af0-1219-428b-bd69-fa39a5e7fe7f',
    sourceType: 'mfds_drug_otc', expected: 56,
    koRunBase: 'otc-grounded-upgrade-bacillus-liche-250mg-capsule',
    translationFile: 'otc-en-translations-bacillus-liche-250mg-v1.json',
    outBase: 'otc-en-complete-bacillus-liche-250mg',
  },
  // 로라타딘 10mg 정 (WO-O4O-OTC-LORATADINE-10MG-EN-COMPLETE-GA-V1 · 에이전트 가)
  //   source_ref 0a7dee0b = 51 ko 공유(38 target + 13 out). out13 이미 en canonical LIVE(md5 056512e1).
  //   38 ko == 13 ko(동일 약물) → out13 en 재구성. 38 master_id 스코프(source_ref 스코프 금지).
  'loratadine-10mg-jeong': {
    key: '로라타딘|10밀리그램|정',
    candidate: '0a7dee0b-e578-4015-967a-fad092071eef',
    sourceType: 'mfds_drug_otc', expected: 38,
    koRunBase: 'otc-grounded-upgrade-loratadine-10mg-jeong',
    translationFile: 'otc-en-translations-loratadine-10mg-v1.json',
    outBase: 'otc-en-complete-loratadine-10mg',
  },
};

async function runEnComplete(cfg: EnCompleteConfig, opts: { apply: boolean }): Promise<Record<string, unknown>> {
  const mode = opts.apply ? 'APPLY' : 'dry-run';
  const EXPECTED = cfg.expected;
  const outFile = `${cfg.outBase}.run.json`;

  const masterIds: string[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${cfg.koRunBase}.run.json`), 'utf8')).rollback_master_ids;
  const enFile = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, cfg.translationFile), 'utf8')) as { translations: DrugOtcEnTranslation[]; summary?: string };
  const trs = enFile.translations.filter((t) => t.groupKey === cfg.key);
  const summaryField = enFile.summary ?? null;

  const report: any = {
    wo: 'WO-O4O-OTC-BACILLUS-LICHENIFORMIS-250MG-EN-COMPLETE-DA-V1', mode, status: 'INIT', dbWrite: 0,
    groupKey: cfg.key, writeOwner: { kind: 'authored_source_ref_id', value: cfg.candidate, sourceType: cfg.sourceType },
    expected: EXPECTED, targetMasters: masterIds.length, anomalies: [] as string[],
  };

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  try {
    if (masterIds.length !== EXPECTED) report.anomalies.push(`target master ${masterIds.length} !== ${EXPECTED}`);
    if (new Set(masterIds).size !== masterIds.length) report.anomalies.push('target master 중복');
    if (trs.length !== 1) report.anomalies.push(`번역 그룹당 1건 아님 (${trs.length})`);

    // 대상(EXPECTED) 상태: ko canonical / en STORE
    const st = retRows<{ ko_canon: string; en_any: string; en_canon: string; en_nr: string }>(await ds.query(`
      SELECT
        count(*) FILTER (WHERE lang='ko' AND status='canonical' AND source_type=$2)::text ko_canon,
        count(*) FILTER (WHERE lang='en')::text en_any,
        count(*) FILTER (WHERE lang='en' AND status='canonical')::text en_canon,
        count(*) FILTER (WHERE lang='en' AND status='needs_review')::text en_nr
      FROM (SELECT s.master_id, COALESCE(s.language,'ko') lang, s.status, s.source_type
            FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL) x`,
      [masterIds, cfg.sourceType]))[0];
    report.koCanonical = parseInt(st.ko_canon, 10);
    report.existingEnAny = parseInt(st.en_any, 10);
    report.existingEnCanonical = parseInt(st.en_canon, 10);
    report.existingEnNeedsReview = parseInt(st.en_nr, 10);
    if (report.koCanonical !== EXPECTED) report.anomalies.push(`대상 ko canonical ${report.koCanonical} !== ${EXPECTED}`);

    // 일관성 참조: 동일 약물 out(source_ref_id 공유, 대상 밖) en canonical 지문
    const ref = retRows<{ h: string; n: string }>(await ds.query(`
      SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions
      WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1`, [cfg.candidate, masterIds]));
    report.referenceEn = ref.map((r) => ({ md5: r.h, n: parseInt(r.n, 10) }));

    // build en + 게이트
    const tr = trs[0];
    const built = trs.length === 1 ? buildDrugOtcEnConsumerHtml(tr) : { html: '', missing: ['no-translation'] };
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (/[가-힣]/.test(built.html)) report.anomalies.push('한글 포함');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    report.builtLen = built.html.length; report.builtMd5 = md5(built.html);

    // 일관성 게이트: build == live out en (동일 약물 → byte-identical, 새 fact 0 증명)
    if (ref.length === 1) {
      report.consistencyMatch = report.builtMd5 === ref[0].h;
      if (!report.consistencyMatch) report.anomalies.push(`일관성 불일치: build md5 ${report.builtMd5} !== live out en ${ref[0].h}`);
    } else if (ref.length > 1) {
      report.consistencyMatch = false;
      report.anomalies.push(`out en canonical 지문 비균일 (${ref.length}종)`);
    } else {
      report.consistencyMatch = null;
      report.anomalies.push('out en canonical 참조 없음 (동일 약물 en 재사용 전제)');
    }

    report.summaryField = summaryField;
    report.plan = { STEP1_en_needs_review_INSERT: EXPECTED, STEP2_en_canonical_flip: EXPECTED, en_write_total: EXPECTED * 2 };

    // 완결 감지(재실행 no-op): 대상 이미 en canonical · 내용 build byte-identical
    const enTgt = retRows<{ h: string; n: string }>(await ds.query(
      `SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [masterIds]));
    report.enTargetMd5 = enTgt.length === 1 ? enTgt[0].h : (enTgt.length ? 'non-uniform' : null);
    const alreadyComplete = report.existingEnCanonical === EXPECTED && report.existingEnNeedsReview === 0
      && report.koCanonical === EXPECTED && report.consistencyMatch === true && report.enTargetMd5 === report.builtMd5;

    if (alreadyComplete) {
      report.status = 'ALREADY_COMPLETE';
      report.note = `대상 en 이미 canonical · 내용 build byte-identical(${report.builtMd5}) — write 0, 정상 종료`;
    } else {
      if (report.existingEnCanonical !== 0) report.anomalies.push(`대상 내 기존 en canonical ${report.existingEnCanonical} (부분/충돌)`);
      if (report.existingEnNeedsReview !== 0) report.anomalies.push(`대상 내 기존 en needs_review ${report.existingEnNeedsReview}`);
      if (report.anomalies.length) { report.status = 'ABORT'; throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`); }

      if (opts.apply) {
        report.dbWrite = 1;
        const qr = ds.createQueryRunner(); await qr.connect();
        // STEP1: en needs_review INSERT (멱등 WHERE NOT EXISTS)
        await qr.startTransaction();
        try {
          const ins = await qr.query(
            `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             SELECT mid, $3, $5, $2, $4::uuid, 'needs_review', 'en', 'STORE', now(), now()
             FROM unnest($1::uuid[]) mid
             WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))
             RETURNING id`, [masterIds, cfg.sourceType, built.html, cfg.candidate, summaryField]);
          report.step1_inserted = retRows(ins).length;
          const dup1 = retRows<{ n: string }>(await qr.query(
            `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND status IN ('needs_review','canonical') GROUP BY master_id HAVING count(*)>1) t`, [masterIds]))[0];
          if (parseInt(dup1.n, 10) > 0) throw new Error(`en STORE 중복 ${dup1.n} → ROLLBACK`);
          await qr.commitTransaction();
        } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }

        // STEP2: needs_review → canonical flip (지문 불변)
        await qr.startTransaction();
        try {
          const before = retRows<{ id: string; content: string; summary: string | null }>(await qr.query(
            `SELECT id::text id, content, summary FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL`,
            [masterIds, cfg.sourceType, cfg.candidate]));
          const fpBefore = new Map(before.map((r) => [r.id, `${r.content.length}:${md5(r.content)}:${r.summary ?? ''}`]));
          const flip = await qr.query(
            `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
             WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL
             RETURNING id::text`, [masterIds, cfg.sourceType, cfg.candidate]);
          report.step2_flipped = retRows(flip).length;
          const after = retRows<{ id: string; content: string; summary: string | null }>(await qr.query(
            `SELECT id::text id, content, summary FROM shared_product_descriptions WHERE id=ANY($1::uuid[])`, [[...fpBefore.keys()]]));
          let fpOk = 0;
          for (const a of after) if (fpBefore.get(a.id) === `${a.content.length}:${md5(a.content)}:${a.summary ?? ''}`) fpOk += 1;
          report.fingerprintOk = fpOk;
          const post = retRows<{ en_canon: string; en_nr: string; dup: string; ko_canon: string }>(await qr.query(`
            SELECT
              (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL) en_canon,
              (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL) en_nr,
              (SELECT count(*)::text FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t) dup,
              (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='ko' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL) ko_canon`,
            [masterIds, cfg.sourceType]))[0];
          report.post = { enCanonical: parseInt(post.en_canon, 10), enNeedsReview: parseInt(post.en_nr, 10), dup: parseInt(post.dup, 10), koCanonical: parseInt(post.ko_canon, 10) };
          if (report.fingerprintOk !== before.length) throw new Error(`지문 불일치 ${report.fingerprintOk}/${before.length} → ROLLBACK`);
          if (report.post.enCanonical !== EXPECTED || report.post.enNeedsReview !== 0 || report.post.dup !== 0 || report.post.koCanonical !== EXPECTED)
            throw new Error(`사후검증 실패 enCanon=${report.post.enCanonical} nr=${report.post.enNeedsReview} dup=${report.post.dup} koCanon=${report.post.koCanonical} → ROLLBACK`);
          await qr.commitTransaction();
        } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
        await qr.release();
        report.status = 'APPLIED';
      } else {
        report.status = 'PASS';
      }
    }
  } catch (e) {
    report.error = e instanceof Error ? e.message : String(e);
    if (report.status === 'INIT') report.status = 'FAIL';
  } finally {
    await ds.destroy();
  }

  fs.writeFileSync(path.join(DATA_DIR, outFile), JSON.stringify(report, null, 2), 'utf8');
  return report;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const groupArg = (argv.find((a) => a.startsWith('--group=')) || '').split('=')[1];
  if (!groupArg || !EN_REGISTRY[groupArg]) {
    console.error(`--group=<key> 필요. 등록: ${Object.keys(EN_REGISTRY).join(', ')}`);
    process.exit(2);
  }
  const cfg = EN_REGISTRY[groupArg];
  const apply = argv.includes('--apply') && process.env.DRUG_OTC_EN_COMPLETE_CONFIRM === 'YES';
  const report = await runEnComplete(cfg, { apply });
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${report.mode}] group=${cfg.key} status=${report.status} · 대상 ${cfg.expected} en → ${(report as any).post?.enCanonical ?? '-'} canonical · 이상 ${(report as any).anomalies?.length ?? 0}`);
  if (report.error) process.exit(1);
}

main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
