/**
 * WO-O4O-OTC-NUTRITION-COMBO-EN-ONLY-3H-PILOT-NA-V1 (에이전트 나) — 자기 전용 EN-only 러너.
 *
 * nutrition_combo(source_type=mfds_drug_otc_nutrition_combo) ko canonical 그룹의 **영문 STORE 설명서**를
 * fresh 번역(ko canonical 유일 원문 · sibling EN 재사용 아님)으로 en needs_review → canonical 완결한다.
 *
 * ★ 계약(공용 en-complete 러너와의 차이):
 *   - en-complete 러너는 out-of-scope sibling EN byte-identical 재사용 전용(no-sibling 시 ABORT).
 *     nutrition_combo 는 EN 전례 0(sibling 없음) → 본 러너는 **fresh 번역** 경로.
 *   - fact-0 보증 = byte-identical 게이트가 아니라 (a) ko 유일 원문 충실 번역 (b) TEST-LOG 대조
 *     (c) 구조 게이트(한글0·table0·주석0·sd-warn) (d) ko canonical 불변(count+지문 사후검증).
 *   - 빌더 = 공용 buildDrugOtcEnConsumerHtml(sd-* 계약, CR-020). ko 의 legacy <table> 구조는 승계하지 않고
 *     sd-* 로 conformant 하게 생성(ko 는 미변경).
 *
 * 스코프: 대상 master_id = (source_ref_id, source_type, ko canonical) 전체 — 그룹 고정. source_ref 스코프가
 *   곧 그룹 스코프(combo 는 source_ref 당 단일 그룹, en 0). config 의 expected 와 실측 일치 게이트.
 *
 * 안전: INSERT/flip 만(UPDATE ko 0·DELETE 0·audit 0). 단일 그룹 TX. 이중게이트.
 *   dry-run 기본. apply: --apply + DRUG_OTC_COMBO_EN_CONFIRM=YES.
 *   재실행 = ALREADY_COMPLETE no-op(대상 en 이미 canonical·build 일치).
 *
 * Usage(apps/api-server):
 *   DB_*... npx tsx src/scripts/otc-nutrition-combo-en-only-runner-na.ts --config=<config.json> --group=<key> [--apply]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const TRANSLATIONS_DIR = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations');
const retRows = <T = { id?: string }>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];
const arg = (k: string) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');

interface ComboEnConfig {
  key: string;            // groupKey (번역 JSON 매칭·표시)
  sourceRef: string;      // ko canonical source_ref_id (= en source_ref_id, write-owner)
  sourceType: string;     // mfds_drug_otc_nutrition_combo
  expected: number;       // 대상 master 수 (= ko canonical)
  translationFile: string;
  outBase: string;
}

async function run(cfg: ComboEnConfig, opts: { apply: boolean }): Promise<Record<string, unknown>> {
  const mode = opts.apply ? 'APPLY' : 'dry-run';
  const EXPECTED = cfg.expected;
  const enFile = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, cfg.translationFile), 'utf8')) as { translations: DrugOtcEnTranslation[]; summary?: string };
  const trs = enFile.translations.filter((t) => t.groupKey === cfg.key);
  const summaryField = enFile.summary ?? null;
  const report: any = {
    wo: 'WO-O4O-OTC-NUTRITION-COMBO-EN-ONLY-3H-PILOT-NA-V1', mode, status: 'INIT', dbWrite: 0,
    groupKey: cfg.key, writeOwner: { kind: 'nutrition_combo_source_ref', value: cfg.sourceRef, sourceType: cfg.sourceType },
    expected: EXPECTED, anomalies: [] as string[],
  };
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME || process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  try {
    // 대상 master_id = ko canonical (source_ref, source_type) — 그룹 고정
    const mrows = retRows<{ id: string }>(await ds.query(
      `SELECT master_id::text id FROM shared_product_descriptions
       WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE'
         AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL ORDER BY master_id`, [cfg.sourceRef, cfg.sourceType]));
    const masterIds = mrows.map((r) => r.id);
    report.targetMasters = masterIds.length;
    report.target_master_ids = masterIds;
    if (masterIds.length !== EXPECTED) report.anomalies.push(`대상 ko canonical ${masterIds.length} !== expected ${EXPECTED}`);
    if (trs.length !== 1) report.anomalies.push(`번역 그룹당 1건 아님 (${trs.length})`);

    // ko 지문(사전) — 불변 증명 기준
    const koBefore = retRows<{ h: string; n: string }>(await ds.query(
      `SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND source_type=$2 AND description_type='STORE'
         AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [masterIds, cfg.sourceType]));
    report.koFingerprintKinds = koBefore.length;
    report.koCanonicalBefore = koBefore.reduce((s, r) => s + parseInt(r.n, 10), 0);

    // 대상 en 상태
    const st = retRows<{ en_any: string; en_canon: string; en_nr: string }>(await ds.query(
      `SELECT count(*) FILTER (WHERE lang='en')::text en_any,
              count(*) FILTER (WHERE lang='en' AND status='canonical')::text en_canon,
              count(*) FILTER (WHERE lang='en' AND status='needs_review')::text en_nr
       FROM (SELECT COALESCE(language,'ko') lang, status FROM shared_product_descriptions
             WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND deleted_at IS NULL) x`, [masterIds]))[0];
    report.existingEnCanonical = parseInt(st.en_canon, 10);
    report.existingEnNeedsReview = parseInt(st.en_nr, 10);

    // build en + 구조 게이트
    const tr = trs[0];
    const built = trs.length === 1 ? buildDrugOtcEnConsumerHtml(tr) : { html: '', missing: ['no-translation'] };
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (/[가-힣]/.test(built.html)) report.anomalies.push('한글 포함');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    report.builtLen = built.html.length; report.builtMd5 = md5(built.html); report.summaryField = summaryField;
    report.plan = { STEP1_en_needs_review_INSERT: EXPECTED, STEP2_en_canonical_flip: EXPECTED, en_write_total: EXPECTED * 2 };

    // 완결 감지(no-op)
    const enTgt = retRows<{ h: string; n: string }>(await ds.query(
      `SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [masterIds]));
    report.enTargetMd5 = enTgt.length === 1 ? enTgt[0].h : (enTgt.length ? 'non-uniform' : null);
    const alreadyComplete = report.existingEnCanonical === EXPECTED && report.existingEnNeedsReview === 0 && report.enTargetMd5 === report.builtMd5;

    if (alreadyComplete) {
      report.status = 'ALREADY_COMPLETE';
      report.note = `대상 en 이미 canonical · build byte-identical(${report.builtMd5}) — write 0`;
    } else {
      if (report.existingEnCanonical !== 0) report.anomalies.push(`대상 내 기존 en canonical ${report.existingEnCanonical}`);
      if (report.existingEnNeedsReview !== 0) report.anomalies.push(`대상 내 기존 en needs_review ${report.existingEnNeedsReview}`);
      if (report.anomalies.length) { report.status = 'ABORT'; throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`); }

      if (opts.apply) {
        report.dbWrite = 1;
        const qr = ds.createQueryRunner(); await qr.connect();
        // STEP1: en needs_review INSERT (멱등)
        await qr.startTransaction();
        try {
          const ins = await qr.query(
            `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             SELECT mid, $3, $5, $2, $4::uuid, 'needs_review', 'en', 'STORE', now(), now()
             FROM unnest($1::uuid[]) mid
             WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))
             RETURNING id`, [masterIds, cfg.sourceType, built.html, cfg.sourceRef, summaryField]);
          report.step1_inserted = retRows(ins).length;
          const dup1 = retRows<{ n: string }>(await qr.query(
            `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND status IN ('needs_review','canonical') GROUP BY master_id HAVING count(*)>1) t`, [masterIds]))[0];
          if (parseInt(dup1.n, 10) > 0) throw new Error(`en STORE 중복 ${dup1.n} → ROLLBACK`);
          await qr.commitTransaction();
        } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
        // STEP2: flip + ko 불변 사후검증
        await qr.startTransaction();
        try {
          const flip = await qr.query(
            `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
             WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL
             RETURNING id::text`, [masterIds, cfg.sourceType, cfg.sourceRef]);
          report.step2_flipped = retRows(flip).length;
          const koAfter = retRows<{ h: string; n: string }>(await qr.query(
            `SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions
             WHERE master_id=ANY($1::uuid[]) AND source_type=$2 AND description_type='STORE'
               AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [masterIds, cfg.sourceType]));
          const post = retRows<{ en_canon: string; en_nr: string; dup: string }>(await qr.query(`
            SELECT (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL) en_canon,
                   (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL) en_nr,
                   (SELECT count(*)::text FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t) dup`, [masterIds]))[0];
          report.post = { enCanonical: parseInt(post.en_canon, 10), enNeedsReview: parseInt(post.en_nr, 10), dup: parseInt(post.dup, 10) };
          // ko 불변 증명: 지문·count 전후 동일
          const koOk = koAfter.length === koBefore.length && koAfter.every((a, i) => a.h === koBefore[i]?.h && a.n === koBefore[i]?.n);
          report.koUnchanged = koOk;
          if (!koOk) throw new Error(`ko canonical 변경 정황 → ROLLBACK`);
          if (report.post.enCanonical !== EXPECTED || report.post.enNeedsReview !== 0 || report.post.dup !== 0) throw new Error(`사후검증 실패 enCanon=${report.post.enCanonical} nr=${report.post.enNeedsReview} dup=${report.post.dup} → ROLLBACK`);
          if (report.step2_flipped !== EXPECTED) throw new Error(`flip ${report.step2_flipped} !== ${EXPECTED} → ROLLBACK`);
          await qr.commitTransaction();
        } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
        await qr.release();
        report.status = 'APPLIED';
      } else report.status = 'PASS';
    }
  } catch (e) {
    report.error = e instanceof Error ? e.message : String(e);
    if (report.status === 'INIT') report.status = 'FAIL';
  } finally { await ds.destroy(); }
  fs.writeFileSync(path.join(DATA_DIR, `${cfg.outBase}.run.json`), JSON.stringify(report, null, 2), 'utf8');
  return report;
}

async function main() {
  const configPath = arg('config'); const groupArg = arg('group');
  if (!configPath || !groupArg) { console.error('--config=<path> --group=<key> 필요'); process.exit(2); }
  const j = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), configPath), 'utf8'));
  const map: Record<string, ComboEnConfig> = j.en || j.groups || {};
  const cfg = map[groupArg];
  if (!cfg) { console.error(`config 에 group=${groupArg} 없음. 등록: ${Object.keys(map).join(', ')}`); process.exit(2); }
  const apply = process.argv.includes('--apply') && process.env.DRUG_OTC_COMBO_EN_CONFIRM === 'YES';
  const report = await run(cfg, { apply });
  console.log(JSON.stringify(report, null, 2));
  console.log(`[${report.mode}] group=${cfg.key} status=${report.status} · 대상 ${report.targetMasters} · write ${report.dbWrite ? (report as any).step2_flipped ? 'applied' : '1' : 0} · 이상 ${(report.anomalies as string[]).length}`);
  if (report.status === 'ABORT' || report.status === 'FAIL') process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
