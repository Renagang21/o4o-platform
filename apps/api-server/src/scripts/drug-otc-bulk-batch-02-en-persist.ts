/**
 * WO-O4O-OTC-BULK-BATCH-02-EN-TRANSLATION-PERSIST-66-V1 (에이전트 나)
 *
 * Batch 02 8그룹 영문 번역(그룹당 1건)을 ko canonical 66 master 에 en needs_review 전개.
 * dry-run 기본 / apply = 이중 게이트(`--apply` + DRUG_OTC_BATCH02_EN_CONFIRM=YES).
 *
 * - 번역 = data/otc-en-translations-batch-02-v1.json (그룹당 1건).
 * - master 집합 = 각 그룹 ko canonical(source_type=mfds_drug_otc, ko, STORE, source_ref_id=candidate) → ko↔en 정합.
 * - content = buildDrugOtcEnConsumerHtml(구조화 필드만, bodyMarkdown/translatorNote 미사용).
 * - INSERT only(en needs_review). WHERE NOT EXISTS(en STORE) → 충돌 0 + 멱등. 단일 TX.
 * - 불변: UPDATE 0 · DELETE 0 · ko canonical/draft 변경 0 · Batch01 변경 0.
 */
import { readFileSync } from 'node:fs';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const EN_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-en-translations-batch-02-v1.json';
const DATA_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-batch-02-ko-final-v1.json';
const SOURCE_TYPE = 'mfds_drug_otc';
const EXPECTED_TOTAL = 66;
const BATCH01 = [
  '나프록센나트륨|275밀리그램|정', '클로닉신리시네이트|125밀리그램|정', '이부프로펜|200밀리그램|정',
  '아스피린|100밀리그램|정', '알파칼시돌|0.5마이크로그램|연질캡슐', '디펜히드라민염산염|50밀리그램|연질캡슐',
  '독시라민숙신산염|25밀리그램|정', '메코발라민|500마이크로그램|캡슐', '결정글루코사민황산염|250밀리그램|캡슐',
  '이부프로펜|200밀리그램|연질캡슐',
];
const FORM_CASE = `CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐' WHEN pm.name LIKE '%캡슐%' THEN '캡슐' WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END`;
const grpBase = `pm.regulatory_type='DRUG' AND pm.drug_category='otc' AND pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND (${FORM_CASE})=$3`;
function readPw() { return readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim(); }

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_BATCH02_EN_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';
  const enFile = JSON.parse(readFileSync(EN_PATH, 'utf8')) as { translations: DrugOtcEnTranslation[] };
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8')) as { groups: Array<{ key: string; ingredient: string; dose: string; formKeyword: string; candidateId: string; newInsert: number }> };
  const byGk = new Map(enFile.translations.map((t) => [t.groupKey, t]));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD || readPw(), database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { wo: 'WO-O4O-OTC-BULK-BATCH-02-EN-TRANSLATION-PERSIST-66-V1', mode, groups: [], anomalies: [] as string[], totalKoMasters: 0, totalNewInsert: 0, inserted: 0 };
  const seen = new Set<string>();
  try {
    const perGroup: Array<{ key: string; candidateId: string; content: string; masterIds: string[] }> = [];
    // 번역 groupKey 중복 검사
    const gkCounts = new Map<string, number>();
    for (const t of enFile.translations) gkCounts.set(t.groupKey, (gkCounts.get(t.groupKey) ?? 0) + 1);

    for (const g of data.groups) {
      const tr = byGk.get(g.key);
      if (!tr) { report.anomalies.push(`${g.key}: 번역 없음`); continue; }
      if (gkCounts.get(g.key) !== 1) { report.anomalies.push(`${g.key}: 번역 그룹당 1건 아님`); continue; }
      // ko canonical master 집합 (source_ref_id=candidate)
      const ko: Array<{ master_id: string }> = await ds.query(
        `SELECT master_id::text FROM shared_product_descriptions
          WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND language='ko' AND deleted_at IS NULL AND source_ref_id=$2::uuid`,
        [SOURCE_TYPE, g.candidateId]);
      const masterIds = ko.map((r) => r.master_id);
      if (masterIds.length !== g.newInsert) report.anomalies.push(`${g.key}: ko canonical ${masterIds.length} !== ${g.newInsert}`);
      for (const m of masterIds) { if (seen.has(m)) report.anomalies.push(`${g.key}: master 중복 ${m.slice(0, 8)}`); seen.add(m); }
      // build en + 게이트
      const built = buildDrugOtcEnConsumerHtml(tr);
      if (built.missing.length) report.anomalies.push(`${g.key}: 필수필드 누락 ${built.missing.join(',')}`);
      if (!built.html) report.anomalies.push(`${g.key}: 빈 html`);
      if (/[가-힣]/.test(built.html)) report.anomalies.push(`${g.key}: 한글 포함`);
      if (built.html.includes('<table')) report.anomalies.push(`${g.key}: <table>`);
      if (built.html.includes('<!--')) report.anomalies.push(`${g.key}: 주석`);
      if (!built.html.includes('sd-warn')) report.anomalies.push(`${g.key}: sd-warn 없음`);
      if (/&amp;(amp|lt|gt|quot);/.test(built.html)) report.anomalies.push(`${g.key}: 이중 escape`);
      // newInsert = en STORE 없는 master만
      const ni: Array<{ n: string }> = await ds.query(
        `SELECT count(*)::text n FROM unnest($1::uuid[]) mid
          WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s
            WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))`, [masterIds]);
      const newInsert = parseInt(ni[0].n, 10);
      report.groups.push({ key: g.key, koMasters: masterIds.length, newInsert });
      report.totalKoMasters += masterIds.length; report.totalNewInsert += newInsert;
      perGroup.push({ key: g.key, candidateId: g.candidateId, content: built.html, masterIds });
    }

    // Batch01 교집합 0
    const b01 = new Set<string>();
    for (const key of BATCH01) {
      const [ing, dose, form] = key.split('|');
      const rr: Array<{ id: string }> = await ds.query(`SELECT pm.id::text FROM product_masters pm WHERE ${grpBase}`, [ing, dose, form]);
      rr.forEach((r) => b01.add(r.id));
    }
    const allTargets = [...seen];
    let inter = 0; for (const m of allTargets) if (b01.has(m)) inter++;
    report.overlap = { targets: allTargets.length, batch01: b01.size, intersection: inter };
    if (inter > 0) report.anomalies.push(`Batch01 교집합 ${inter}`);

    // ko canonical 지문 스냅샷 (대상 master + 전체) — INSERT en 만이므로 불변이어야
    const koFp = async () => {
      const r: Array<{ cnt: string; fp: string }> = await ds.query(
        `SELECT count(*)::text cnt, md5(string_agg(md5(content), ',' ORDER BY id)) fp FROM shared_product_descriptions
          WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND language='ko' AND deleted_at IS NULL AND master_id = ANY($2::uuid[])`,
        [SOURCE_TYPE, allTargets]);
      return { cnt: Number(r[0].cnt), fp: r[0].fp };
    };
    report.koBefore = await koFp();

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 12).join('\n  ')}`);
    if (report.totalKoMasters !== EXPECTED_TOTAL) throw new Error(`ko master 합 ${report.totalKoMasters} !== ${EXPECTED_TOTAL} → ABORT`);

    if (apply) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        for (const p of perGroup) {
          const res = await qr.query(
            `INSERT INTO shared_product_descriptions
               (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             SELECT mid, $3, NULL, $2, $4::uuid, 'needs_review', 'en', 'STORE', now(), now()
             FROM unnest($1::uuid[]) mid
             WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s
               WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))
             RETURNING id`,
            [p.masterIds, SOURCE_TYPE, p.content, p.candidateId]);
          const n = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0].length : res.length) : 0;
          report.groups.find((x: any) => x.key === p.key).inserted = n;
          report.inserted += n;
        }
        // post: master당 en STORE 중복 0
        const dup: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions
             WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND status IN ('needs_review','canonical')
             GROUP BY master_id HAVING count(*)>1) t`, [allTargets]);
        if (Number(dup[0].n) > 0) throw new Error(`en STORE 중복 ${dup[0].n} → ROLLBACK`);
        if (report.inserted !== EXPECTED_TOTAL) throw new Error(`inserted ${report.inserted} !== ${EXPECTED_TOTAL} → ROLLBACK`);
        // ko canonical 지문 불변
        const koAfter = await qr.query(
          `SELECT count(*)::text cnt, md5(string_agg(md5(content), ',' ORDER BY id)) fp FROM shared_product_descriptions
            WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND language='ko' AND deleted_at IS NULL AND master_id = ANY($2::uuid[])`,
          [SOURCE_TYPE, allTargets]);
        if (Number(koAfter[0].cnt) !== report.koBefore.cnt || koAfter[0].fp !== report.koBefore.fp) throw new Error(`ko canonical 변동 → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
      report.koAfter = await koFp();
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] ko master ${report.totalKoMasters} · newInsert ${report.totalNewInsert} · overlap ${report.overlap?.intersection} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  INSERT ${report.inserted} · ko 지문 ${report.koBefore.fp === report.koAfter?.fp ? '불변' : 'CHANGED'}`);
  else console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_BATCH02_EN_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
