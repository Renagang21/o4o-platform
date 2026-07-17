/**
 * WO-O4O-OTC-HERBAL-EN-CANONICAL-PROMOTION-299-V1
 *
 * 은행엽·포도엽 en 설명서 299건을 needs_review → canonical 로 상태 전환(내용 불변).
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_HERBAL_EN_PROMOTE_CONFIRM=YES).
 *
 * 원칙:
 *   - 상태만 canonical, content·summary 불변(지문 md5 전후 동일 증명), updated_at 만 갱신.
 *   - ko canonical 불변. INSERT/DELETE 없음. 단일 TX.
 *   - 대상 = en STORE(source_type=mfds_drug_otc) · 은행엽/포도엽 candidate. 예상 299 불일치·en canonical 충돌 ABORT.
 *   - 멱등: needs_review 만 flip → 재실행 0.
 */

import 'dotenv/config';

const SOURCE_TYPE = 'mfds_drug_otc';
const GROUP_KEYS = ['은행엽건조엑스|80밀리그램|정', '포도엽건조엑스|180밀리그램|캡슐'];
const EXPECTED_TOTAL = 299;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_HERBAL_EN_PROMOTE_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { mode, candidateIds: [], enTotal: 0, needsReview: 0, enCanonicalExisting: 0, koCanonical: 0, anomalies: [] as string[], flipped: 0, fingerprintOk: 0 };
  try {
    // 은행엽/포도엽 candidate
    const cids: Array<{ candidate_id: string }> = await ds.query(
      `SELECT candidate_id::text FROM product_candidate_description_drafts
        WHERE seed_json->>'groupKey'=ANY($1::text[]) AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL`, [GROUP_KEYS]);
    const candidateIds = cids.map((r) => r.candidate_id);
    report.candidateIds = candidateIds.map((x) => x.slice(0, 8));
    if (candidateIds.length !== 2) throw new Error(`candidate ${candidateIds.length} !== 2 → ABORT`);

    // en STORE 대상 현황
    const en: Array<{ id: string; master_id: string; status: string; content: string; summary: string | null }> = await ds.query(
      `SELECT id::text, master_id::text, status, content, summary
         FROM shared_product_descriptions
        WHERE source_type=$1 AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])`,
      [SOURCE_TYPE, candidateIds]);
    report.enTotal = en.length;
    report.needsReview = en.filter((r) => r.status === 'needs_review').length;
    report.enCanonicalExisting = en.filter((r) => r.status === 'canonical').length;

    // 검증
    if (en.length !== EXPECTED_TOTAL) report.anomalies.push(`en STORE ${en.length} !== ${EXPECTED_TOTAL}`);
    const badStatus = en.filter((r) => r.status !== 'needs_review' && r.status !== 'canonical');
    if (badStatus.length) report.anomalies.push(`예상외 status ${badStatus.length}`);
    // 한글·주석·table·sd-warn
    for (const r of en) {
      if (/[가-힣]/.test(r.content)) { report.anomalies.push(`${r.id.slice(0, 8)}: 한글`); break; }
    }
    if (en.some((r) => r.content.includes('<table'))) report.anomalies.push('<table> 포함');
    if (en.some((r) => r.content.includes('<!--'))) report.anomalies.push('주석 포함');
    if (en.some((r) => !r.content.includes('sd-warn'))) report.anomalies.push('sd-warn 없는 행');
    // 기존 en canonical 충돌: master 당 en canonical>1 예상(flip 후) 방지 — 현재 canonical 있는 master 의 needs_review 존재?
    const nrMasters = new Set(en.filter((r) => r.status === 'needs_review').map((r) => r.master_id));
    const canonMasters = new Set(en.filter((r) => r.status === 'canonical').map((r) => r.master_id));
    for (const m of nrMasters) if (canonMasters.has(m)) report.anomalies.push(`${m.slice(0, 8)}: en canonical 이미 존재(충돌)`);

    // ko canonical 수(불변 기준)
    const ko: Array<{ n: string }> = await ds.query(
      `SELECT count(*)::text n FROM shared_product_descriptions
        WHERE source_type=$1 AND description_type='STORE' AND language='ko' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])`,
      [SOURCE_TYPE, candidateIds]);
    report.koCanonical = parseInt(ko[0].n, 10);

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 10).join('\n  ')}`);

    const toFlip = en.filter((r) => r.status === 'needs_review');
    // 지문(before)
    const fpBefore = new Map(toFlip.map((r) => [r.id, `${r.content.length}:${r.content}:${r.summary ?? ''}`]));

    if (apply && toFlip.length > 0) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        const res = await qr.query(
          `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
            WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])
            RETURNING id::text`,
          [SOURCE_TYPE, candidateIds]);
        // UPDATE…RETURNING → [rows, affected] 또는 rows
        const rows = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res;
        report.flipped = Array.isArray(rows) ? rows.length : 0;
        // 지문(after) === before
        const after: Array<{ id: string; content: string; summary: string | null }> = await qr.query(
          `SELECT id::text, content, summary FROM shared_product_descriptions WHERE id=ANY($1::uuid[])`, [toFlip.map((r) => r.id)]);
        for (const a of after) if (fpBefore.get(a.id) === `${a.content.length}:${a.content}:${a.summary ?? ''}`) report.fingerprintOk += 1;
        // post: en canonical 299, needs_review 0, master당 en canonical 중복 0
        const post: Array<{ can: string; nr: string; dup: string }> = await qr.query(
          `SELECT
             (SELECT count(*)::text FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])) can,
             (SELECT count(*)::text FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])) nr,
             (SELECT count(*)::text FROM (SELECT master_id FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[]) GROUP BY master_id HAVING count(*)>1) t) dup`,
          [SOURCE_TYPE, candidateIds]);
        report.postCanonical = parseInt(post[0].can, 10); report.postNeedsReview = parseInt(post[0].nr, 10); report.postDup = parseInt(post[0].dup, 10);
        if (report.fingerprintOk !== toFlip.length) throw new Error(`지문 불일치 ${report.fingerprintOk}/${toFlip.length} → ROLLBACK`);
        if (report.postCanonical !== EXPECTED_TOTAL || report.postNeedsReview !== 0 || report.postDup !== 0) throw new Error(`post 불일치 can ${report.postCanonical}/nr ${report.postNeedsReview}/dup ${report.postDup} → ROLLBACK`);
        if (report.flipped !== toFlip.length) throw new Error(`flipped ${report.flipped} !== ${toFlip.length} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    } else {
      report.flipped = 0; report.toFlip = toFlip.length;
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] en STORE ${report.enTotal} · needs_review ${report.needsReview} · 기존canonical ${report.enCanonicalExisting} · ko canonical ${report.koCanonical} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  flip ${report.flipped} · 지문 ${report.fingerprintOk}/${report.needsReview} · post(can/nr/dup) ${report.postCanonical}/${report.postNeedsReview}/${report.postDup}`);
  else console.log(`  toFlip ${report.needsReview} (dry-run — write 없음. apply: --apply + DRUG_OTC_HERBAL_EN_PROMOTE_CONFIRM=YES)`);
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
