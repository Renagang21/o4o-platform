/**
 * WO-O4O-OTC-BULK-BATCH-01-KO-CANONICAL-PROMOTION-162-V1
 *
 * Batch 01 readiness 통과 8그룹 draft 를 ko STORE canonical 로 승격 (INSERT only).
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_BATCH01_PROMOTION_CONFIRM=YES).
 * 실행 지침서 §2 준수. 제외 2그룹(알파칼시돌·글루코사민)은 대상 아님.
 *
 * 대상(A_no_spd_only + drug_category=otc): 그룹 master 중 STORE canonical 없고 rx 아닌 경구 master.
 * 열거: name 끝 `(성분)` + spec 첫토큰=함량 + name 제형키워드. 경구=제형(정/캡슐/연질캡슐) 내재.
 *
 * 안전: 그룹 총계·promotable(162) 불일치 ABORT · rx 혼입 ABORT · 8그룹 master 교집합 0 ·
 *   buildDrugOtcConsumerHtml(구조화 필드만, bodyMarkdown 미사용) missing/빈/<table>/주석/sd-warn ABORT ·
 *   INSERT WHERE NOT EXISTS(canonical) → 멱등 · UPDATE/DELETE 없음 · 단일 TX · 사후 중복 0 ROLLBACK.
 * Batch 02 무관(별도 groupKey·master).
 */

import 'dotenv/config';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const SOURCE_TYPE = 'mfds_drug_otc';
const LANGUAGE = 'ko';
interface GroupDef { key: string; ingredient: string; dose: string; formKeyword: string; groupTotal: number; promote: number }
const GROUPS: GroupDef[] = [
  { key: '나프록센나트륨|275밀리그램|정', ingredient: '나프록센나트륨', dose: '275밀리그램', formKeyword: '정', groupTotal: 136, promote: 40 },
  { key: '클로닉신리시네이트|125밀리그램|정', ingredient: '클로닉신리시네이트', dose: '125밀리그램', formKeyword: '정', groupTotal: 80, promote: 29 },
  { key: '이부프로펜|200밀리그램|정', ingredient: '이부프로펜', dose: '200밀리그램', formKeyword: '정', groupTotal: 38, promote: 24 },
  { key: '아스피린|100밀리그램|정', ingredient: '아스피린', dose: '100밀리그램', formKeyword: '정', groupTotal: 128, promote: 23 },
  { key: '디펜히드라민염산염|50밀리그램|연질캡슐', ingredient: '디펜히드라민염산염', dose: '50밀리그램', formKeyword: '연질캡슐', groupTotal: 31, promote: 16 },
  { key: '독시라민숙신산염|25밀리그램|정', ingredient: '독시라민숙신산염', dose: '25밀리그램', formKeyword: '정', groupTotal: 32, promote: 13 },
  { key: '메코발라민|500마이크로그램|캡슐', ingredient: '메코발라민', dose: '500마이크로그램', formKeyword: '캡슐', groupTotal: 20, promote: 10 },
  { key: '이부프로펜|200밀리그램|연질캡슐', ingredient: '이부프로펜', dose: '200밀리그램', formKeyword: '연질캡슐', groupTotal: 53, promote: 7 },
];
const EXPECTED_TOTAL = 162;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_BATCH01_PROMOTION_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { mode, groups: [], anomalies: [] as string[], totalPromotable: 0, totalRxInGroup: 0, totalNewInsert: 0, inserted: 0 };
  try {
    const perGroup: Array<{ def: GroupDef; candidateId: string; content: string; summary: string | null; masterIds: string[] }> = [];
    const seenMasters = new Set<string>();

    for (const g of GROUPS) {
      const draft: Array<{ candidate_id: string; title: string; content_json: Record<string, unknown> }> = await ds.query(
        `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts
          WHERE seed_json->>'groupKey'=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL LIMIT 1`, [g.key]);
      if (!draft.length) { report.anomalies.push(`${g.key}: draft 없음`); continue; }
      const d = draft[0];
      const grpBase = `pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'`;
      const grp: Array<{ id: string }> = await ds.query(`SELECT pm.id::text FROM product_masters pm WHERE ${grpBase}`, [g.ingredient, g.dose, g.formKeyword]);
      // rx 혼입 (그룹 내 drug_category=rx)
      const rxRows: Array<{ id: string }> = await ds.query(
        `SELECT DISTINCT pm.id::text FROM product_masters pm JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.deleted_at IS NULL AND e.drug_category='rx' WHERE ${grpBase}`,
        [g.ingredient, g.dose, g.formKeyword]);
      // promotable: STORE canonical(비-이 승격) 없음 + rx 제외(drug_category=rx인 master 배제)
      const pt: Array<{ id: string }> = await ds.query(
        `SELECT pm.id::text FROM product_masters pm
          WHERE ${grpBase}
            AND NOT EXISTS (SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=pm.id AND e.deleted_at IS NULL AND e.drug_category='rx')
            AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions s
                            WHERE s.master_id=pm.id AND s.status='canonical' AND s.deleted_at IS NULL
                              AND NOT (s.source_type=$4 AND s.source_ref_id=$5::uuid))`,
        [g.ingredient, g.dose, g.formKeyword, SOURCE_TYPE, d.candidate_id]);
      const promotable = pt.map((r) => r.id);
      if (grp.length !== g.groupTotal) report.anomalies.push(`${g.key}: 그룹 ${grp.length} !== ${g.groupTotal}`);
      if (rxRows.length !== 0) report.anomalies.push(`${g.key}: rx 혼입 ${rxRows.length}`);
      if (promotable.length !== g.promote) report.anomalies.push(`${g.key}: promotable ${promotable.length} !== ${g.promote}`);
      for (const m of promotable) { if (seenMasters.has(m)) report.anomalies.push(`${g.key}: master 중복 ${m.slice(0, 8)}`); seenMasters.add(m); }
      const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
      if (built.missing.length) report.anomalies.push(`${g.key}: 필수필드 누락 ${built.missing.join(',')}`);
      if (!built.html) report.anomalies.push(`${g.key}: 빈 html`);
      if (built.html.includes('<table')) report.anomalies.push(`${g.key}: <table>`);
      if (built.html.includes('<!--')) report.anomalies.push(`${g.key}: 주석`);
      if (!built.html.includes('sd-warn')) report.anomalies.push(`${g.key}: sd-warn 없음`);
      const summary = String((d.content_json as any)?.summaryTable?.['성분'] ?? '') || null;
      const ni: Array<{ n: string }> = await ds.query(
        `SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.deleted_at IS NULL)`, [promotable]);
      const newInsert = parseInt(ni[0].n, 10);
      report.groups.push({ key: g.key, groupTotal: grp.length, rx: rxRows.length, promotable: promotable.length, newInsert });
      report.totalPromotable += promotable.length; report.totalRxInGroup += rxRows.length; report.totalNewInsert += newInsert;
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
        const dup: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t`, [[...seenMasters]]);
        if (parseInt(dup[0].n, 10) > 0) throw new Error(`canonical 중복 ${dup[0].n} → ROLLBACK`);
        if (report.inserted !== report.totalNewInsert) throw new Error(`inserted ${report.inserted} !== ${report.totalNewInsert} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] promotable ${report.totalPromotable} · rx(그룹내) ${report.totalRxInGroup} · newInsert ${report.totalNewInsert} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  INSERT ${report.inserted}`);
  else console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_BATCH01_PROMOTION_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
