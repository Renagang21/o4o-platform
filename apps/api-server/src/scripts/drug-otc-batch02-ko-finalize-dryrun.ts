/**
 * WO-O4O-OTC-BULK-BATCH-02-KO-FINALIZE-DRYRUN-AGENT-NA-V1 (에이전트 나) — Batch 02 전용 dry-run.
 *
 * DB write 0 (SELECT only). 8그룹 정책 A(NOT EXISTS canonical) 실제 대상 재열거 + 전건 게이트 검증.
 * 승격 스크립트 패턴(drug-otc-herbal-canonical-promotion.ts) 열거 규칙 복제. 커밋: 본 스크립트 + CHECK + data json만.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const SOURCE_TYPE = 'mfds_drug_otc';
const OTC = 'MFDS_DRUG_OTC';

interface GroupDef { key: string; ingredient: string; dose: string; formKeyword: '정' | '캡슐' | '연질캡슐' }
const GROUPS: GroupDef[] = [
  { key: '나프록센|250밀리그램|연질캡슐', ingredient: '나프록센', dose: '250밀리그램', formKeyword: '연질캡슐' },
  { key: '알파칼시돌|1마이크로그램|연질캡슐', ingredient: '알파칼시돌', dose: '1마이크로그램', formKeyword: '연질캡슐' },
  { key: '아르기닌티디아시케이트|200밀리그램|연질캡슐', ingredient: '아르기닌티디아시케이트', dose: '200밀리그램', formKeyword: '연질캡슐' },
  { key: '이부프로펜|400밀리그램|연질캡슐', ingredient: '이부프로펜', dose: '400밀리그램', formKeyword: '연질캡슐' },
  { key: '클로닉신리시네이트|125밀리그램|연질캡슐', ingredient: '클로닉신리시네이트', dose: '125밀리그램', formKeyword: '연질캡슐' },
  { key: '플루벤다졸|500밀리그램|정', ingredient: '플루벤다졸', dose: '500밀리그램', formKeyword: '정' },
  { key: '이부프로펜아르기닌|368.9밀리그램|정', ingredient: '이부프로펜아르기닌', dose: '368.9밀리그램', formKeyword: '정' },
  { key: 'L-시스틴|500밀리그램|연질캡슐', ingredient: 'L-시스틴', dose: '500밀리그램', formKeyword: '연질캡슐' },
];
const BATCH01 = [
  '나프록센나트륨|275밀리그램|정', '클로닉신리시네이트|125밀리그램|정', '이부프로펜|200밀리그램|정',
  '아스피린|100밀리그램|정', '알파칼시돌|0.5마이크로그램|연질캡슐', '디펜히드라민염산염|50밀리그램|연질캡슐',
  '독시라민숙신산염|25밀리그램|정', '메코발라민|500마이크로그램|캡슐', '결정글루코사민황산염|250밀리그램|캡슐',
  '이부프로펜|200밀리그램|연질캡슐',
];
const NONORAL_RE = "(질정|질좌제|좌제|좌약|외용|점안|점비|스프레이|첩부|패취|패치|겔|크림|연고)";
function readPw() { return readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim(); }

// name→form (정확히 하나) : 연질캡슐 우선 → 캡슐 → 정
const FORM_CASE = `CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐' WHEN pm.name LIKE '%캡슐%' THEN '캡슐' WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END`;
// 그룹 base: name 끝 (성분) + spec 첫토큰=함량 + form=formKeyword
const grpBase = `pm.regulatory_type='DRUG' AND pm.drug_category='otc'
  AND pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND (${FORM_CASE})=$3`;

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const report: any = { mode: 'dry-run', dbWrite: 0, groups: [], anomalies: [], totalPromotable: 0, totalNewInsert: 0 };
  const seen = new Set<string>();
  const allPromotable: string[] = [];
  try {
    for (const g of GROUPS) {
      const draft: Array<{ candidate_id: string; title: string; content_json: Record<string, unknown> }> = await ds.query(
        `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts
          WHERE source_identifier_value=$1 AND source_label='${OTC}' AND deleted_at IS NULL LIMIT 1`, [g.key]);
      if (!draft.length) { report.anomalies.push(`${g.key}: draft 없음`); continue; }
      const d = draft[0];
      const grp: Array<{ id: string }> = await ds.query(`SELECT pm.id::text FROM product_masters pm WHERE ${grpBase}`, [g.ingredient, g.dose, g.formKeyword]);
      // promotable = NOT EXISTS canonical (기존 canonical 보존)
      const pt: Array<{ id: string }> = await ds.query(
        `SELECT pm.id::text FROM product_masters pm WHERE ${grpBase}
           AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.status='canonical' AND s.deleted_at IS NULL)`,
        [g.ingredient, g.dose, g.formKeyword]);
      const promotable = pt.map((r) => r.id);
      // route: 비경구 name 키워드 보유 master
      const nonoral: Array<{ n: string }> = await ds.query(
        `SELECT count(*)::text n FROM product_masters pm WHERE ${grpBase} AND pm.name ~ '${NONORAL_RE}'`, [g.ingredient, g.dose, g.formKeyword]);
      // rx: 그룹 내 drug_category != otc (혼입) — grpBase가 otc 고정이므로 별도 전체 카테고리 확인
      const rxMix: Array<{ n: string }> = await ds.query(
        `SELECT count(*)::text n FROM product_masters pm
          WHERE pm.regulatory_type='DRUG' AND pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND (${FORM_CASE})=$3
            AND pm.drug_category='rx'`, [g.ingredient, g.dose, g.formKeyword]);
      // build gates
      const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
      const gate = {
        missing: built.missing, hasTable: built.html.includes('<table'), hasComment: built.html.includes('<!--'),
        hasSdWarn: built.html.includes('sd-warn'), emptyHtml: !built.html,
      };
      if (built.missing.length) report.anomalies.push(`${g.key}: 필수필드 누락 ${built.missing.join(',')}`);
      if (gate.hasTable) report.anomalies.push(`${g.key}: <table>`);
      if (gate.hasComment) report.anomalies.push(`${g.key}: 주석`);
      if (!gate.hasSdWarn) report.anomalies.push(`${g.key}: sd-warn 없음`);
      if (Number(nonoral[0].n) > 0) report.anomalies.push(`${g.key}: 비경구 ${nonoral[0].n}`);
      if (Number(rxMix[0].n) > 0) report.anomalies.push(`${g.key}: rx 혼입 ${rxMix[0].n}`);
      for (const m of promotable) { if (seen.has(m)) report.anomalies.push(`${g.key}: 내부 중복 ${m.slice(0, 8)}`); seen.add(m); allPromotable.push(m); }
      report.groups.push({ key: g.key, candidateId: d.candidate_id, groupTotal: grp.length, promotable: promotable.length, newInsert: promotable.length,
        nonoral: Number(nonoral[0].n), rxMix: Number(rxMix[0].n), gate, htmlLen: built.html.length });
      report.totalPromotable += promotable.length; report.totalNewInsert += promotable.length;
    }
    // Batch01 master 집합 (동일 열거)
    const b01 = new Set<string>();
    for (const key of BATCH01) {
      const [ing, dose, form] = key.split('|');
      const rr: Array<{ id: string }> = await ds.query(`SELECT pm.id::text FROM product_masters pm WHERE ${grpBase}`, [ing, dose, form]);
      rr.forEach((r) => b01.add(r.id));
    }
    let inter = 0; for (const m of allPromotable) if (b01.has(m)) inter++;
    report.overlap = { batch02Promotable: allPromotable.length, batch01Masters: b01.size, intersection: inter, internalDup: allPromotable.length - seen.size };
    if (inter > 0) report.anomalies.push(`Batch01 교집합 ${inter}`);

    // canonical 충돌 재확인: promotable 중 이미 canonical 보유(있으면 안 됨)
    const conflict: Array<{ n: string }> = await ds.query(
      `SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.deleted_at IS NULL)`, [allPromotable]);
    report.canonicalConflict = Number(conflict[0].n);
    if (report.canonicalConflict > 0) report.anomalies.push(`canonical 충돌 ${conflict[0].n}`);
  } finally { await ds.destroy(); }

  writeFileSync('C:\\tmp\\otc-b02-finalize.json', JSON.stringify(report, null, 2), 'utf8');
  console.log(`[dry-run] promotable ${report.totalPromotable} · newInsert ${report.totalNewInsert} · overlap ${report.overlap?.intersection} · 이상 ${report.anomalies.length}`);
  if (report.anomalies.length) console.log('ANOMALIES:', report.anomalies.join(' | '));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
