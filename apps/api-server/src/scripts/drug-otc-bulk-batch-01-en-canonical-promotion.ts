/**
 * WO-O4O-OTC-BULK-BATCH-01-EN-CANONICAL-PROMOTION-162-V1
 *
 * Batch 01 8그룹 en 설명서 162건을 needs_review → canonical 상태 전환(내용 불변).
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_BATCH01_EN_PROMOTE_CONFIRM=YES).
 *
 * 원칙: 상태만 canonical + updated_at. content·summary 지문(길이+md5) 전후 동일 증명.
 *   ko canonical 불변. INSERT/DELETE 없음. 단일 TX. 대상=en STORE(mfds_drug_otc)·8 candidate.
 *   예상 162·기존 en canonical 충돌·Batch 02 교집합·ko↔en 정합 게이트. 멱등(needs_review만 flip).
 */

import 'dotenv/config';
import crypto from 'node:crypto';

const SOURCE_TYPE = 'mfds_drug_otc';
const GROUP_KEYS = ['나프록센나트륨|275밀리그램|정', '클로닉신리시네이트|125밀리그램|정', '이부프로펜|200밀리그램|정', '아스피린|100밀리그램|정', '디펜히드라민염산염|50밀리그램|연질캡슐', '독시라민숙신산염|25밀리그램|정', '메코발라민|500마이크로그램|캡슐', '이부프로펜|200밀리그램|연질캡슐'];
const BATCH02_GROUPS = ['나프록센|250밀리그램|연질캡슐', '알파칼시돌|1마이크로그램|연질캡슐', '아르기닌티디아시케이트|200밀리그램|연질캡슐', '이부프로펜|400밀리그램|연질캡슐', '클로닉신리시네이트|125밀리그램|연질캡슐', '플루벤다졸|500밀리그램|정', '이부프로펜아르기닌|368.9밀리그램|정', 'L-시스틴|500밀리그램|연질캡슐'];
const EXPECTED_TOTAL = 162;
const fp = (content: string, summary: string | null): string => `${content.length}:${crypto.createHash('md5').update(content).digest('hex')}:${(summary ?? '').length}:${crypto.createHash('md5').update(summary ?? '').digest('hex')}`;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_BATCH01_EN_PROMOTE_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { mode, enTotal: 0, needsReview: 0, enCanonicalExisting: 0, koCanonical: 0, koEnLinkOk: 0, batch02Intersect: -1, anomalies: [] as string[], flipped: 0, fingerprintOk: 0 };
  try {
    const cids: Array<{ candidate_id: string }> = await ds.query(
      `SELECT candidate_id::text FROM product_candidate_description_drafts WHERE seed_json->>'groupKey'=ANY($1::text[]) AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL`, [GROUP_KEYS]);
    const candidateIds = cids.map((r) => r.candidate_id);
    if (candidateIds.length !== 8) throw new Error(`candidate ${candidateIds.length} !== 8 → ABORT`);

    const en: Array<{ id: string; master_id: string; source_ref_id: string; status: string; content: string; summary: string | null }> = await ds.query(
      `SELECT id::text, master_id::text, source_ref_id::text, status, content, summary
         FROM shared_product_descriptions
        WHERE source_type=$1 AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])`,
      [SOURCE_TYPE, candidateIds]);
    report.enTotal = en.length;
    report.needsReview = en.filter((r) => r.status === 'needs_review').length;
    report.enCanonicalExisting = en.filter((r) => r.status === 'canonical').length;
    if (en.length !== EXPECTED_TOTAL) report.anomalies.push(`en STORE ${en.length} !== ${EXPECTED_TOTAL}`);
    if (en.some((r) => r.status !== 'needs_review' && r.status !== 'canonical')) report.anomalies.push('예상외 status');
    // 콘텐츠 위생
    if (en.some((r) => /[가-힣]/.test(r.content))) report.anomalies.push('한글 포함');
    if (en.some((r) => r.content.includes('<table'))) report.anomalies.push('<table>');
    if (en.some((r) => r.content.includes('<!--'))) report.anomalies.push('주석');
    if (en.some((r) => r.content.includes('&amp;lt;') || r.content.includes('&amp;gt;'))) report.anomalies.push('이중 escape');
    if (en.some((r) => !r.content.includes('sd-warn'))) report.anomalies.push('sd-warn 없는 행');
    // en canonical 이미 존재(충돌): needs_review master 가 canonical 도 보유?
    const nrM = new Set(en.filter((r) => r.status === 'needs_review').map((r) => r.master_id));
    const canM = new Set(en.filter((r) => r.status === 'canonical').map((r) => r.master_id));
    for (const m of nrM) if (canM.has(m)) report.anomalies.push(`${m.slice(0, 8)}: en canonical 충돌`);
    // 대상 내부 master 중복
    const seen = new Set<string>();
    for (const r of en) { if (seen.has(r.master_id + r.status)) report.anomalies.push(`중복 ${r.master_id.slice(0, 8)}`); seen.add(r.master_id + r.status); }

    // ko canonical + ko↔en 정합
    const ko: Array<{ n: string }> = await ds.query(
      `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='ko' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])`, [SOURCE_TYPE, candidateIds]);
    report.koCanonical = parseInt(ko[0].n, 10);
    const link: Array<{ n: string }> = await ds.query(
      `SELECT count(*)::text n FROM shared_product_descriptions e
        WHERE e.source_type=$1 AND e.description_type='STORE' AND e.language='en' AND e.deleted_at IS NULL AND e.source_ref_id=ANY($2::uuid[])
          AND EXISTS(SELECT 1 FROM shared_product_descriptions k WHERE k.master_id=e.master_id AND k.source_ref_id=e.source_ref_id AND k.language='ko' AND k.status='canonical' AND k.source_type=$1 AND k.deleted_at IS NULL)`,
      [SOURCE_TYPE, candidateIds]);
    report.koEnLinkOk = parseInt(link[0].n, 10);
    if (report.koEnLinkOk !== EXPECTED_TOTAL) report.anomalies.push(`ko↔en 정합 ${report.koEnLinkOk} !== ${EXPECTED_TOTAL}`);

    // Batch 02 교집합
    const b02: Array<{ id: string }> = await ds.query(
      `SELECT DISTINCT pm.id::text FROM product_masters pm, unnest($1::text[]) gk
        WHERE pm.name LIKE '%('||split_part(gk,'|',1)||')' AND split_part(pm.specification,' / ',1)=split_part(gk,'|',2) AND pm.name LIKE '%'||split_part(gk,'|',3)||'%'`, [BATCH02_GROUPS]);
    const b02Set = new Set(b02.map((r) => r.id));
    report.batch02Intersect = en.filter((r) => b02Set.has(r.master_id)).length;
    if (report.batch02Intersect !== 0) report.anomalies.push(`Batch 02 교집합 ${report.batch02Intersect}`);

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 10).join('\n  ')}`);

    const toFlip = en.filter((r) => r.status === 'needs_review');
    const fpBefore = new Map(toFlip.map((r) => [r.id, fp(r.content, r.summary)]));

    if (apply && toFlip.length > 0) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        const res = await qr.query(
          `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
            WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])
            RETURNING id::text`, [SOURCE_TYPE, candidateIds]);
        const rows = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res; // [rows,affected] 방어
        report.flipped = Array.isArray(rows) ? rows.length : 0;
        const after: Array<{ id: string; content: string; summary: string | null }> = await qr.query(
          `SELECT id::text, content, summary FROM shared_product_descriptions WHERE id=ANY($1::uuid[])`, [toFlip.map((r) => r.id)]);
        for (const a of after) if (fpBefore.get(a.id) === fp(a.content, a.summary)) report.fingerprintOk += 1;
        const post: Array<{ can: string; nr: string; dup: string }> = await qr.query(
          `SELECT (SELECT count(*)::text FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])) can,
                  (SELECT count(*)::text FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[])) nr,
                  (SELECT count(*)::text FROM (SELECT master_id FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=ANY($2::uuid[]) GROUP BY master_id HAVING count(*)>1) t) dup`,
          [SOURCE_TYPE, candidateIds]);
        report.postCanonical = parseInt(post[0].can, 10); report.postNeedsReview = parseInt(post[0].nr, 10); report.postDup = parseInt(post[0].dup, 10);
        if (report.fingerprintOk !== toFlip.length) throw new Error(`지문 불일치 ${report.fingerprintOk}/${toFlip.length} → ROLLBACK`);
        if (report.postCanonical !== EXPECTED_TOTAL || report.postNeedsReview !== 0 || report.postDup !== 0) throw new Error(`post can ${report.postCanonical}/nr ${report.postNeedsReview}/dup ${report.postDup} → ROLLBACK`);
        if (report.flipped !== toFlip.length) throw new Error(`flipped ${report.flipped} !== ${toFlip.length} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    } else { report.toFlip = toFlip.length; }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] en ${report.enTotal} · needs_review ${report.needsReview} · 기존canonical ${report.enCanonicalExisting} · ko ${report.koCanonical} · ko↔en ${report.koEnLinkOk} · Batch02교집합 ${report.batch02Intersect} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  flip ${report.flipped} · 지문 ${report.fingerprintOk}/${report.needsReview} · post(can/nr/dup) ${report.postCanonical}/${report.postNeedsReview}/${report.postDup}`);
  else console.log(`  toFlip ${report.needsReview} (dry-run. apply: --apply + DRUG_OTC_BATCH01_EN_PROMOTE_CONFIRM=YES)`);
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
