/**
 * WO-O4O-OTC-BULK-BATCH-02-KO-CANONICAL-PROMOTION-66-V1 (에이전트 나)
 *
 * Batch 02 8그룹 draft → ko STORE canonical 승격 (INSERT only, 66건).
 * dry-run 기본 / apply = 이중 게이트(`--apply` + DRUG_OTC_BATCH02_PROMOTION_CONFIRM=YES).
 *
 * 대상 목록 SSOT = src/scripts/data/otc-batch-02-ko-final-v1.json.
 * 열거·게이트·TX 패턴 = drug-otc-herbal-canonical-promotion.ts 복제 + Batch01 교집합/대상외 불변 가드 추가.
 *
 * 불변: UPDATE 0 · DELETE 0 · draft 변경 0 · Batch01 변경 0. 기존 canonical 절대 보존(WHERE NOT EXISTS canonical).
 */
import { readFileSync } from 'node:fs';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const DATA_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-batch-02-ko-final-v1.json';
const SOURCE_TYPE = 'mfds_drug_otc';
const LANGUAGE = 'ko';
const OTC = 'MFDS_DRUG_OTC';
const EXPECTED_TOTAL = 66;
const BATCH01 = [
  '나프록센나트륨|275밀리그램|정', '클로닉신리시네이트|125밀리그램|정', '이부프로펜|200밀리그램|정',
  '아스피린|100밀리그램|정', '알파칼시돌|0.5마이크로그램|연질캡슐', '디펜히드라민염산염|50밀리그램|연질캡슐',
  '독시라민숙신산염|25밀리그램|정', '메코발라민|500마이크로그램|캡슐', '결정글루코사민황산염|250밀리그램|캡슐',
  '이부프로펜|200밀리그램|연질캡슐',
];
const NONORAL_RE = "(질정|질좌제|좌제|좌약|외용|점안|점비|스프레이|첩부|패취|패치|겔|크림|연고)";
const FORM_CASE = `CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐' WHEN pm.name LIKE '%캡슐%' THEN '캡슐' WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END`;
const grpBase = `pm.regulatory_type='DRUG' AND pm.drug_category='otc' AND pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND (${FORM_CASE})=$3`;

interface GroupDef { key: string; ingredient: string; dose: string; formKeyword: string; candidateId: string; newInsert: number }
function readPw(): string { return readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim(); }

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_BATCH02_PROMOTION_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const GROUPS: GroupDef[] = data.groups.map((g: any) => ({ key: g.key, ingredient: g.ingredient, dose: g.dose, formKeyword: g.formKeyword, candidateId: g.candidateId, newInsert: g.newInsert }));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD || readPw(), database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { wo: 'WO-O4O-OTC-BULK-BATCH-02-KO-CANONICAL-PROMOTION-66-V1', mode, groups: [], anomalies: [] as string[], totalPromotable: 0, inserted: 0 };
  const seen = new Set<string>();
  try {
    const perGroup: Array<{ def: GroupDef; content: string; summary: string | null; masterIds: string[] }> = [];

    for (const g of GROUPS) {
      const draft: Array<{ candidate_id: string; title: string; content_json: Record<string, unknown> }> = await ds.query(
        `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts
          WHERE source_identifier_value=$1 AND source_label='${OTC}' AND deleted_at IS NULL LIMIT 1`, [g.key]);
      if (!draft.length) { report.anomalies.push(`${g.key}: draft 없음`); continue; }
      const d = draft[0];
      if (d.candidate_id !== g.candidateId) report.anomalies.push(`${g.key}: candidateId 불일치`);
      // promotable = NOT EXISTS canonical
      const pt: Array<{ id: string }> = await ds.query(
        `SELECT pm.id::text FROM product_masters pm WHERE ${grpBase}
           AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.status='canonical' AND s.deleted_at IS NULL)`,
        [g.ingredient, g.dose, g.formKeyword]);
      const promotable = pt.map((r) => r.id);
      if (promotable.length !== g.newInsert) report.anomalies.push(`${g.key}: promotable ${promotable.length} !== ${g.newInsert}`);
      // route/rx gates
      const nonoral: Array<{ n: string }> = await ds.query(`SELECT count(*)::text n FROM product_masters pm WHERE ${grpBase} AND pm.name ~ '${NONORAL_RE}'`, [g.ingredient, g.dose, g.formKeyword]);
      if (Number(nonoral[0].n) > 0) report.anomalies.push(`${g.key}: 비경구 ${nonoral[0].n}`);
      const rxMix: Array<{ n: string }> = await ds.query(
        `SELECT count(*)::text n FROM product_masters pm WHERE pm.regulatory_type='DRUG' AND pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND (${FORM_CASE})=$3 AND pm.drug_category='rx'`,
        [g.ingredient, g.dose, g.formKeyword]);
      if (Number(rxMix[0].n) > 0) report.anomalies.push(`${g.key}: rx 혼입 ${rxMix[0].n}`);
      // 내부 중복
      for (const m of promotable) { if (seen.has(m)) report.anomalies.push(`${g.key}: 내부중복 ${m.slice(0, 8)}`); seen.add(m); }
      // build
      const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
      if (built.missing.length) report.anomalies.push(`${g.key}: 필수필드 누락 ${built.missing.join(',')}`);
      if (!built.html) report.anomalies.push(`${g.key}: 빈 html`);
      if (built.html.includes('<table')) report.anomalies.push(`${g.key}: <table>`);
      if (built.html.includes('<!--')) report.anomalies.push(`${g.key}: 주석`);
      if (!built.html.includes('sd-warn')) report.anomalies.push(`${g.key}: sd-warn 없음`);
      const summary = String((d.content_json as any)?.summaryTable?.['성분'] ?? '') || null;
      report.groups.push({ key: g.key, groupTotal: undefined, promotable: promotable.length });
      report.totalPromotable += promotable.length;
      perGroup.push({ def: g, content: built.html, summary, masterIds: promotable });
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
    // 대상외 불변 스냅샷: 전체 ko STORE canonical(mfds_drug_otc) 수 + Batch01 canonical 수
    const snap = async () => {
      const a: Array<{ n: string }> = await ds.query(`SELECT count(*)::text n FROM shared_product_descriptions WHERE status='canonical' AND deleted_at IS NULL AND source_type=$1 AND language='ko' AND description_type='STORE'`, [SOURCE_TYPE]);
      const b: Array<{ n: string }> = await ds.query(`SELECT count(*)::text n FROM shared_product_descriptions WHERE status='canonical' AND deleted_at IS NULL AND master_id = ANY($1::uuid[])`, [[...b01]]);
      return { koStoreCanon: Number(a[0].n), b01Canon: Number(b[0].n) };
    };
    report.before = await snap();

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 12).join('\n  ')}`);
    if (report.totalPromotable !== EXPECTED_TOTAL) throw new Error(`promotable 합 ${report.totalPromotable} !== ${EXPECTED_TOTAL} → ABORT`);

    if (apply) {
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
            [p.masterIds, SOURCE_TYPE, p.def.candidateId, p.content, p.summary, LANGUAGE]);
          const n = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0].length : res.length) : 0;
          report.groups.find((x: any) => x.key === p.def.key).inserted = n;
          report.inserted += n;
        }
        // post: master당 canonical 중복 0
        const dup: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions
             WHERE master_id = ANY($1::uuid[]) AND status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t`, [allTargets]);
        if (Number(dup[0].n) > 0) throw new Error(`canonical 중복 ${dup[0].n} → ROLLBACK`);
        if (report.inserted !== EXPECTED_TOTAL) throw new Error(`inserted ${report.inserted} !== ${EXPECTED_TOTAL} → ROLLBACK`);
        // Batch01 canonical 수 불변
        const b01After: Array<{ n: string }> = await qr.query(`SELECT count(*)::text n FROM shared_product_descriptions WHERE status='canonical' AND deleted_at IS NULL AND master_id = ANY($1::uuid[])`, [[...b01]]);
        if (Number(b01After[0].n) !== report.before.b01Canon) throw new Error(`Batch01 canonical 변동 ${report.before.b01Canon}→${b01After[0].n} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
      report.after = await snap();
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] promotable ${report.totalPromotable} · overlap ${report.overlap?.intersection} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  INSERT ${report.inserted} · before koStoreCanon ${report.before.koStoreCanon} → after ${report.after?.koStoreCanon} (Δ${(report.after?.koStoreCanon ?? 0) - report.before.koStoreCanon})`);
  else console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_BATCH02_PROMOTION_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
