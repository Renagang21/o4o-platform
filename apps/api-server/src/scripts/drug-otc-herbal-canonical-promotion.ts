/**
 * WO-O4O-OTC-HERBAL-CANONICAL-PROMOTION-299-V1
 *
 * 은행엽·포도엽 draft(수정 완료)를 ko STORE canonical 로 승격 (INSERT only).
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_HERBAL_PROMOTION_CONFIRM=YES).
 *
 * 대상(A_no_spd_only): 그룹 master 중 STORE canonical 없는 master.
 *   - 은행엽건조엑스 80밀리그램 정: 그룹 213 − STORE 10 = 승격 203
 *   - 포도엽건조엑스 180밀리그램 캡슐: 그룹 103 − STORE 7 = 승격 96
 * 열거: name 끝 `(성분)` + spec 첫토큰=함량 + name 제형키워드.
 *
 * 안전:
 *   - 그룹 총계 213/103, promotableTarget 203/96 불일치 ABORT.
 *   - 두 그룹 master 교집합 0(disjoint) ABORT.
 *   - buildDrugOtcConsumerHtml 사용(구조화 필드만, bodyMarkdown 미사용). missing 0·빈 html·<table>·주석(<!--) ABORT.
 *   - INSERT 시 WHERE NOT EXISTS(canonical) → A_no_spd_only + 멱등(재실행 0). UPDATE/DELETE 없음.
 *   - 단일 TX. post: 실제 insert 합 == 예상, master당 canonical 중복 0 아니면 ROLLBACK.
 */

import 'dotenv/config';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const SOURCE_TYPE = 'mfds_drug_otc';
const LANGUAGE = 'ko';
interface GroupDef { key: string; ingredient: string; dose: string; formKeyword: string; groupTotal: number; promote: number }
const GROUPS: GroupDef[] = [
  { key: '은행엽건조엑스|80밀리그램|정', ingredient: '은행엽건조엑스', dose: '80밀리그램', formKeyword: '정', groupTotal: 213, promote: 203 },
  { key: '포도엽건조엑스|180밀리그램|캡슐', ingredient: '포도엽건조엑스', dose: '180밀리그램', formKeyword: '캡슐', groupTotal: 103, promote: 96 },
];
const EXPECTED_TOTAL = 299;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_HERBAL_PROMOTION_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { mode, groups: [], anomalies: [] as string[], totalPromotable: 0, totalNewInsert: 0, inserted: 0 };
  try {
    const perGroup: Array<{ def: GroupDef; candidateId: string; content: string; summary: string | null; masterIds: string[] }> = [];
    const seenMasters = new Set<string>();

    for (const g of GROUPS) {
      // draft
      const draft: Array<{ candidate_id: string; title: string; content_json: Record<string, unknown> }> = await ds.query(
        `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts
          WHERE seed_json->>'groupKey'=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL LIMIT 1`, [g.key]);
      if (!draft.length) { report.anomalies.push(`${g.key}: draft 없음`); continue; }
      const d = draft[0];
      // 그룹 열거
      const grpBase = `pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'`;
      const grp: Array<{ id: string }> = await ds.query(`SELECT pm.id::text FROM product_masters pm WHERE ${grpBase}`, [g.ingredient, g.dose, g.formKeyword]);
      // promotableTarget: canonical 없음 OR 이 승격의 canonical 만 (stable 203/96)
      const pt: Array<{ id: string }> = await ds.query(
        `SELECT pm.id::text FROM product_masters pm
          WHERE ${grpBase}
            AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions s
                            WHERE s.master_id=pm.id AND s.status='canonical' AND s.deleted_at IS NULL
                              AND NOT (s.source_type=$4 AND s.source_ref_id=$5::uuid))`,
        [g.ingredient, g.dose, g.formKeyword, SOURCE_TYPE, d.candidate_id]);
      const promotable = pt.map((r) => r.id);
      // 게이트: 총계·promotable
      if (grp.length !== g.groupTotal) report.anomalies.push(`${g.key}: 그룹 ${grp.length} !== ${g.groupTotal}`);
      if (promotable.length !== g.promote) report.anomalies.push(`${g.key}: promotable ${promotable.length} !== ${g.promote}`);
      // disjoint
      for (const m of promotable) { if (seenMasters.has(m)) report.anomalies.push(`${g.key}: master 중복 ${m.slice(0, 8)}`); seenMasters.add(m); }
      // 빌더 (구조화 필드만)
      const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
      if (built.missing.length) report.anomalies.push(`${g.key}: 필수필드 누락 ${built.missing.join(',')}`);
      if (!built.html) report.anomalies.push(`${g.key}: 빈 html`);
      if (built.html.includes('<table')) report.anomalies.push(`${g.key}: <table> 포함`);
      if (built.html.includes('<!--')) report.anomalies.push(`${g.key}: 주석 노출`);
      if (!built.html.includes('sd-warn')) report.anomalies.push(`${g.key}: sd-warn 없음`);
      const summary = String((d.content_json as any)?.summaryTable?.['성분'] ?? '') || null;
      // newInsert (canonical 전무 master만) = 재실행 시 0
      const ni: Array<{ n: string }> = await ds.query(
        `SELECT count(*)::text n FROM unnest($1::uuid[]) mid
          WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.deleted_at IS NULL)`, [promotable]);
      const newInsert = parseInt(ni[0].n, 10);
      report.groups.push({ key: g.key, groupTotal: grp.length, promotable: promotable.length, newInsert });
      report.totalPromotable += promotable.length; report.totalNewInsert += newInsert;
      perGroup.push({ def: g, candidateId: d.candidate_id, content: built.html, summary, masterIds: promotable });
    }

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 12).join('\n  ')}`);
    if (report.totalPromotable !== EXPECTED_TOTAL) throw new Error(`promotable 합 ${report.totalPromotable} !== ${EXPECTED_TOTAL} → ABORT`);

    if (apply && report.totalNewInsert > 0) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        for (const p of perGroup) {
          const res = await qr.query(
            `INSERT INTO shared_product_descriptions
               (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             SELECT mid, $4, $5, $2, $3::uuid, 'canonical', $6, 'STORE', now(), now()
             FROM unnest($1::uuid[]) mid
             WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.deleted_at IS NULL)
             RETURNING id`,
            [p.masterIds, SOURCE_TYPE, p.candidateId, p.content, p.summary, LANGUAGE]);
          report.inserted += Array.isArray(res) ? res.length : 0;
        }
        // post: master당 canonical 중복 0
        const dup: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM (
             SELECT master_id FROM shared_product_descriptions
              WHERE master_id = ANY($1::uuid[]) AND status='canonical' AND deleted_at IS NULL
              GROUP BY master_id HAVING count(*)>1) t`, [[...seenMasters]]);
        if (parseInt(dup[0].n, 10) > 0) throw new Error(`canonical 중복 ${dup[0].n} → ROLLBACK`);
        if (report.inserted !== report.totalNewInsert) throw new Error(`inserted ${report.inserted} !== 예상 ${report.totalNewInsert} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] promotable ${report.totalPromotable} · newInsert ${report.totalNewInsert} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  INSERT ${report.inserted}`);
  else console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_HERBAL_PROMOTION_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
