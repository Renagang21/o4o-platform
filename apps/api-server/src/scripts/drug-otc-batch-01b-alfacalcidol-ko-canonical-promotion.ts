/**
 * WO-O4O-OTC-BATCH-01B-ALFACALCIDOL-KO-EN-COMPLETE-V1 — STEP 1 (ko canonical promotion)
 *
 * 보완된 알파칼시돌 0.5㎍ 연질캡슐 draft(candidate 0436f0d8)를 ko STORE canonical 로 승격 (INSERT only).
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_BATCH01B_ALFA_KO_CONFIRM=YES).
 *
 * 대상: 그룹(알파칼시돌|0.5마이크로그램|연질캡슐) master 중 canonical STORE 없고 rx 아닌 경구 master.
 *   그룹 50 = e약은요 grounded 29(mfds_easy_drug canonical) + promotable 21. **제외: 결정글루코사민(무관).**
 * apply 직전 실제 promotable 재열거 → EXPECTED(21) 불일치 ABORT.
 *
 * 안전: buildDrugOtcConsumerHtml(구조화 필드만, bodyMarkdown 미사용) · missing/빈/<table>/주석/sd-warn ABORT ·
 *   rx 혼입 ABORT · INSERT WHERE NOT EXISTS(canonical) → 멱등 · UPDATE/DELETE 없음 · 단일 TX · 사후 중복 0 ROLLBACK.
 * 접속: Cloud SQL Auth Proxy(:5442 → production). Usage(apps/api-server): NODE_ENV= ../../node_modules/.bin/tsx src/scripts/drug-otc-batch-01b-alfacalcidol-ko-canonical-promotion.ts [--apply]
 */
import '../env-loader.js';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const SOURCE_TYPE = 'mfds_drug_otc';
const LANGUAGE = 'ko';
const GROUP = { key: '알파칼시돌|0.5마이크로그램|연질캡슐', ingredient: '알파칼시돌', dose: '0.5마이크로그램', formKeyword: '연질캡슐' };
const EXPECTED_PROMOTE = 21;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_BATCH01B_ALFA_KO_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false,
  });
  await ds.initialize();

  const report: any = { mode, group: GROUP.key, anomalies: [] as string[], groupTotal: 0, rx: 0, grounded: 0, promotable: 0, newInsert: 0, inserted: 0 };
  try {
    const draft: Array<{ candidate_id: string; title: string; content_json: Record<string, unknown> }> = await ds.query(
      `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts
        WHERE seed_json->>'groupKey'=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL LIMIT 1`, [GROUP.key]);
    if (draft.length !== 1) throw new Error(`draft ${draft.length} !== 1 → ABORT`);
    const d = draft[0];

    const grpBase = `pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'`;
    const P = [GROUP.ingredient, GROUP.dose, GROUP.formKeyword];
    const grp: Array<{ id: string }> = await ds.query(`SELECT pm.id::text FROM product_masters pm WHERE ${grpBase}`, P);
    const rxRows: Array<{ id: string }> = await ds.query(
      `SELECT DISTINCT pm.id::text FROM product_masters pm JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.deleted_at IS NULL AND e.drug_category='rx' WHERE ${grpBase}`, P);
    // grounded = canonical STORE 보유(우리 candidate 외) — 참고
    const gr: Array<{ n: string }> = await ds.query(
      `SELECT count(*)::text n FROM product_masters pm WHERE ${grpBase}
        AND EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.status='canonical' AND s.deleted_at IS NULL
                     AND NOT (s.source_type=$4 AND s.source_ref_id=$5::uuid))`, [...P, SOURCE_TYPE, d.candidate_id]);
    const pt: Array<{ id: string }> = await ds.query(
      `SELECT pm.id::text FROM product_masters pm
        WHERE ${grpBase}
          AND NOT EXISTS (SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=pm.id AND e.deleted_at IS NULL AND e.drug_category='rx')
          AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions s
                          WHERE s.master_id=pm.id AND s.status='canonical' AND s.deleted_at IS NULL
                            AND NOT (s.source_type=$4 AND s.source_ref_id=$5::uuid))`,
      [...P, SOURCE_TYPE, d.candidate_id]);
    const promotable = pt.map((r) => r.id);
    report.groupTotal = grp.length; report.rx = rxRows.length; report.grounded = parseInt(gr[0].n, 10); report.promotable = promotable.length;

    if (rxRows.length !== 0) report.anomalies.push(`rx 혼입 ${rxRows.length}`);
    if (promotable.length !== EXPECTED_PROMOTE) report.anomalies.push(`promotable ${promotable.length} !== EXPECTED ${EXPECTED_PROMOTE} (재열거 불일치)`);
    // 내부 master 중복
    if (new Set(promotable).size !== promotable.length) report.anomalies.push('promotable master 중복');

    const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    const summary = String((d.content_json as any)?.summaryTable?.['성분'] ?? '') || null;

    const ni: Array<{ n: string }> = await ds.query(
      `SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.deleted_at IS NULL)`, [promotable]);
    report.newInsert = parseInt(ni[0].n, 10);
    report.candidate = d.candidate_id.slice(0, 8); report.title = d.title; report.htmlLen = built.html.length; report.summary = summary;

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`);

    if (apply && report.newInsert > 0) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        const res = await qr.query(
          `INSERT INTO shared_product_descriptions
             (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT mid, $4, $5, $2, $3::uuid, 'canonical', $6, 'STORE', now(), now()
           FROM unnest($1::uuid[]) mid
           WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.deleted_at IS NULL)
           RETURNING id`,
          [promotable, SOURCE_TYPE, d.candidate_id, built.html, summary, LANGUAGE]);
        report.inserted = Array.isArray(res) ? res.length : 0;
        // 사후: 중복 0 + inserted 일치
        const dup: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t`, [promotable]);
        if (parseInt(dup[0].n, 10) > 0) throw new Error(`canonical 중복 ${dup[0].n} → ROLLBACK`);
        if (report.inserted !== report.newInsert) throw new Error(`inserted ${report.inserted} !== ${report.newInsert} → ROLLBACK`);
        // 사후: 이 candidate 의 ko canonical = EXPECTED
        const koc: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_type=$1 AND description_type='STORE' AND language='ko' AND status='canonical' AND deleted_at IS NULL AND source_ref_id=$2::uuid`, [SOURCE_TYPE, d.candidate_id]);
        report.koCanonicalAfter = parseInt(koc[0].n, 10);
        if (report.koCanonicalAfter !== EXPECTED_PROMOTE) throw new Error(`ko canonical(after) ${report.koCanonicalAfter} !== ${EXPECTED_PROMOTE} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] group ${report.groupTotal} (grounded ${report.grounded} + promotable ${report.promotable}) · rx ${report.rx} · newInsert ${report.newInsert} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  INSERT ${report.inserted} · koCanonicalAfter ${report.koCanonicalAfter ?? '-'}`);
  else console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_BATCH01B_ALFA_KO_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
