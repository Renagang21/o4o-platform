/**
 * WO-O4O-OTC-BULK-BATCH-02-EN-CANONICAL-PROMOTION-66-V1 (에이전트 나)
 *
 * Batch 02 en 설명서 66건 needs_review → canonical 상태 전환(내용 불변).
 * dry-run 기본 / apply = 이중 게이트(`--apply` + DRUG_OTC_BATCH02_EN_PROMOTE_CONFIRM=YES).
 *
 * 상태만 flip · content·summary 지문(len+md5) 전후 동일 증명 · updated_at 갱신.
 * ko canonical 불변 · INSERT/DELETE 0 · Batch01 변경 0. 단일 TX.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const DATA_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-batch-02-ko-final-v1.json';
const SOURCE_TYPE = 'mfds_drug_otc';
const EXPECTED_TOTAL = 66;
const ARG_BAD = /(detox|liver recovery|improved liver health|fatigue relief|liver detoxification)/i;
const BATCH01 = [
  '나프록센나트륨|275밀리그램|정', '클로닉신리시네이트|125밀리그램|정', '이부프로펜|200밀리그램|정',
  '아스피린|100밀리그램|정', '알파칼시돌|0.5마이크로그램|연질캡슐', '디펜히드라민염산염|50밀리그램|연질캡슐',
  '독시라민숙신산염|25밀리그램|정', '메코발라민|500마이크로그램|캡슐', '결정글루코사민황산염|250밀리그램|캡슐',
  '이부프로펜|200밀리그램|연질캡슐',
];
const FORM_CASE = `CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐' WHEN pm.name LIKE '%캡슐%' THEN '캡슐' WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END`;
const grpBase = `pm.regulatory_type='DRUG' AND pm.drug_category='otc' AND pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND (${FORM_CASE})=$3`;
function readPw() { return readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim(); }
const md5 = (s: string) => createHash('md5').update(s).digest('hex');
const fp = (content: string, summary: string | null) => `${content.length}:${md5(content)}:${(summary ?? '').length}:${md5(summary ?? '')}`;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_BATCH02_EN_PROMOTE_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8')) as { groups: Array<{ key: string; ingredient: string; dose: string; formKeyword: string; candidateId: string; newInsert: number }> };
  const candidateIds = data.groups.map((g) => g.candidateId);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD || readPw(), database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { wo: 'WO-O4O-OTC-BULK-BATCH-02-EN-CANONICAL-PROMOTION-66-V1', mode, anomalies: [] as string[], enTotal: 0, needsReview: 0, enCanonicalExisting: 0, koCanonical: 0, flipped: 0, fingerprintOk: 0 };
  try {
    // en STORE 대상
    const en: Array<{ id: string; master_id: string; source_ref_id: string; status: string; content: string; summary: string | null }> = await ds.query(
      `SELECT id::text, master_id::text, source_ref_id::text, status, content, summary FROM shared_product_descriptions
        WHERE source_type=$1 AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])`,
      [SOURCE_TYPE, candidateIds]);
    report.enTotal = en.length;
    report.needsReview = en.filter((r) => r.status === 'needs_review').length;
    report.enCanonicalExisting = en.filter((r) => r.status === 'canonical').length;

    if (en.length !== EXPECTED_TOTAL) report.anomalies.push(`en STORE ${en.length} !== ${EXPECTED_TOTAL}`);
    if (en.some((r) => r.status !== 'needs_review' && r.status !== 'canonical')) report.anomalies.push('예상외 status');
    if (en.some((r) => /[가-힣]/.test(r.content))) report.anomalies.push('한글 포함');
    if (en.some((r) => r.content.includes('<table'))) report.anomalies.push('<table>');
    if (en.some((r) => r.content.includes('<!--'))) report.anomalies.push('주석');
    if (en.some((r) => !r.content.includes('sd-warn'))) report.anomalies.push('sd-warn 없는 행');
    if (en.some((r) => /&amp;(amp|lt|gt|quot);/.test(r.content))) report.anomalies.push('이중 escape');
    // en canonical 이미 존재하는 master 의 needs_review(충돌)
    const nrMasters = new Set(en.filter((r) => r.status === 'needs_review').map((r) => r.master_id));
    const canonMasters = new Set(en.filter((r) => r.status === 'canonical').map((r) => r.master_id));
    for (const m of nrMasters) if (canonMasters.has(m)) report.anomalies.push(`${m.slice(0, 8)}: en canonical 충돌`);

    // ko canonical master 집합
    const ko: Array<{ master_id: string; source_ref_id: string }> = await ds.query(
      `SELECT master_id::text, source_ref_id::text FROM shared_product_descriptions
        WHERE source_type=$1 AND description_type='STORE' AND language='ko' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])`,
      [SOURCE_TYPE, candidateIds]);
    report.koCanonical = ko.length;
    if (ko.length !== EXPECTED_TOTAL) report.anomalies.push(`ko canonical ${ko.length} !== ${EXPECTED_TOTAL}`);
    // ko↔en master_id / source_ref_id 정합
    const koMasters = new Set(ko.map((r) => r.master_id));
    const enMasters = new Set(en.map((r) => r.master_id));
    let pairM = 0; for (const m of enMasters) if (koMasters.has(m)) pairM++;
    report.pairMasterId = pairM;
    if (pairM !== EXPECTED_TOTAL) report.anomalies.push(`ko↔en master_id ${pairM} !== ${EXPECTED_TOTAL}`);
    const koRefByMaster = new Map(ko.map((r) => [r.master_id, r.source_ref_id]));
    let pairRef = 0; for (const r of en) if (koRefByMaster.get(r.master_id) === r.source_ref_id) pairRef++;
    report.pairSourceRef = pairRef;
    if (pairRef !== EXPECTED_TOTAL) report.anomalies.push(`ko↔en source_ref_id ${pairRef} !== ${EXPECTED_TOTAL}`);
    // 아르기닌 금지표현
    report.argBad = en.filter((r) => ARG_BAD.test(r.content)).length;
    if (report.argBad > 0) report.anomalies.push(`아르기닌 금지표현 ${report.argBad}`);
    // Batch01 교집합
    const b01 = new Set<string>();
    for (const key of BATCH01) { const [ing, dose, form] = key.split('|'); const rr: Array<{ id: string }> = await ds.query(`SELECT pm.id::text FROM product_masters pm WHERE ${grpBase}`, [ing, dose, form]); rr.forEach((r) => b01.add(r.id)); }
    let inter = 0; for (const m of enMasters) if (b01.has(m)) inter++;
    report.batch01Intersection = inter;
    if (inter > 0) report.anomalies.push(`Batch01 교집합 ${inter}`);

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 12).join('\n  ')}`);

    const toFlip = en.filter((r) => r.status === 'needs_review');
    const fpBefore = new Map(toFlip.map((r) => [r.id, fp(r.content, r.summary)]));
    report.toFlip = toFlip.length;

    if (apply && toFlip.length > 0) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        const res = await qr.query(
          `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
            WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])
            RETURNING id::text`, [SOURCE_TYPE, candidateIds]);
        const rows = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res;
        report.flipped = Array.isArray(rows) ? rows.length : 0;
        // 지문(after)===before
        const after: Array<{ id: string; content: string; summary: string | null }> = await qr.query(
          `SELECT id::text, content, summary FROM shared_product_descriptions WHERE id=ANY($1::uuid[])`, [toFlip.map((r) => r.id)]);
        for (const a of after) if (fpBefore.get(a.id) === fp(a.content, a.summary)) report.fingerprintOk += 1;
        const post: Array<{ can: string; nr: string; dup: string }> = await qr.query(
          `SELECT
             (SELECT count(*)::text FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])) can,
             (SELECT count(*)::text FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])) nr,
             (SELECT count(*)::text FROM (SELECT master_id FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[]) GROUP BY master_id HAVING count(*)>1) t) dup`,
          [SOURCE_TYPE, candidateIds]);
        report.postCanonical = Number(post[0].can); report.postNeedsReview = Number(post[0].nr); report.postDup = Number(post[0].dup);
        if (report.fingerprintOk !== toFlip.length) throw new Error(`지문 불일치 ${report.fingerprintOk}/${toFlip.length} → ROLLBACK`);
        if (report.flipped !== toFlip.length) throw new Error(`flipped ${report.flipped} !== ${toFlip.length} → ROLLBACK`);
        if (report.postCanonical !== EXPECTED_TOTAL || report.postNeedsReview !== 0 || report.postDup !== 0) throw new Error(`post can/nr/dup ${report.postCanonical}/${report.postNeedsReview}/${report.postDup} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] en ${report.enTotal} · needs_review ${report.needsReview} · ko canonical ${report.koCanonical} · pair(m/ref) ${report.pairMasterId}/${report.pairSourceRef} · overlap ${report.batch01Intersection} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  flip ${report.flipped} · 지문 ${report.fingerprintOk}/${report.toFlip} · post(can/nr/dup) ${report.postCanonical}/${report.postNeedsReview}/${report.postDup}`);
  else console.log(`  toFlip ${report.needsReview} (dry-run — write 없음. apply: --apply + DRUG_OTC_BATCH02_EN_PROMOTE_CONFIRM=YES)`);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
