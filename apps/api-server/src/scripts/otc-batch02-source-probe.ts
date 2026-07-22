/** Batch02 read-only: 알파칼시돌 제품별 차이 + 아르기닌 허가 원문(easydrug) 대조. DB write 0. 미커밋. */
import { readFileSync, writeFileSync } from 'node:fs';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
function readPw() { return readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim(); }
const FORM_CASE = `CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐' WHEN pm.name LIKE '%캡슐%' THEN '캡슐' WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END`;
const grpBase = `pm.regulatory_type='DRUG' AND pm.drug_category='otc' AND pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND (${FORM_CASE})=$3`;

async function groupSource(ds: any, ing: string, dose: string, form: string) {
  // 그룹 master + easydrug SPD content(효능/용법/주의 원문) 요약
  const rows = await ds.query(
    `SELECT pm.id::text, pm.name, pm.specification,
       s.content easydrug_html, s.summary easydrug_summary,
       EXISTS(SELECT 1 FROM shared_product_descriptions c WHERE c.master_id=pm.id AND c.status='canonical' AND c.deleted_at IS NULL) has_canon
     FROM product_masters pm
     LEFT JOIN shared_product_descriptions s ON s.master_id=pm.id AND s.deleted_at IS NULL AND s.source_type='mfds_easy_drug'
     WHERE ${grpBase} ORDER BY pm.name`, [ing, dose, form]);
  return rows;
}

async function main() {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  try {
    const alpha = await groupSource(ds, '알파칼시돌', '1마이크로그램', '연질캡슐');
    const arg = await groupSource(ds, '아르기닌티디아시케이트', '200밀리그램', '연질캡슐');
    // 아르기닌 draft 원본 (지문용)
    const argDraft = await ds.query(
      `SELECT candidate_id::text, source_identifier_value gk, title, content_json, md5(content_json::text) fp
       FROM product_candidate_description_drafts WHERE source_identifier_value=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL`,
      ['아르기닌티디아시케이트|200밀리그램|연질캡슐']);
    // easydrug 효능 원문에서 태그 제거 텍스트만 추출(간단)
    const strip = (h: string | null) => (h ? h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null);
    writeFileSync('C:\\tmp\\otc-b02-source.json', JSON.stringify({
      alphacalcidol: alpha.map((r: any) => ({ name: r.name, spec: r.specification, hasCanon: r.has_canon, easydrugText: strip(r.easydrug_html)?.slice(0, 900) || null, summary: r.easydrug_summary })),
      arginine: arg.map((r: any) => ({ name: r.name, spec: r.specification, hasCanon: r.has_canon, easydrugText: strip(r.easydrug_html)?.slice(0, 1200) || null, summary: r.easydrug_summary })),
      arginineDraft: argDraft.map((r: any) => ({ candidateId: r.candidate_id, title: r.title, fp: r.fp, content: r.content_json })),
    }, null, 2), 'utf8');
    console.log('alpha', alpha.length, 'arg', arg.length, 'argDraft', argDraft.length);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
