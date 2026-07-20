/**
 * read-only PROBE (WO-O4O-OTC-CLONIXIN-125MG-TABLET-KO-EN-COMPLETE-GA-V1, Agent 가)
 * DB write 0 — SELECT only. 클로닉신리시네이트 125mg 정 그룹의
 *   authored draft candidate / coarse master 구성 / 제형 분포 / easy canonical 상태를 산출.
 *   조사·독립검증 도구(재현용 커밋).
 */
import { readFileSync } from 'node:fs';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
function readPw(): string {
  return readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
}
const ING = '클로닉신리시네이트';
const DOSE = '125밀리그램';
const FORM = '정';

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: 5433,
    username: 'o4o_api', password: readPw(), database: 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();
  try {
    // 1) authored OTC draft candidate (source_ref_id 후보)
    const drafts = await ds.query(
      `SELECT candidate_id::text, source_identifier_value gk, title,
              (content_json ? 'efficacy' AND content_json ? 'usage' AND content_json ? 'caution' AND content_json ? 'summaryTable') has4,
              length(content_json->>'caution') caution_len
       FROM product_candidate_description_drafts
       WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL
         AND source_identifier_value LIKE $1`, [`${ING}|${DOSE}|%`]);

    // 2) coarse 열거 — runner 와 동일 필터: name LIKE '%(ING)' AND split_part(spec,' / ',1)=DOSE AND name LIKE '%정%'
    const coarse = await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec,
         CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐'
              WHEN pm.name LIKE '%캡슐%' THEN '캡슐'
              WHEN pm.name LIKE '%정%' THEN '정' ELSE '기타' END form_kw,
         (SELECT s.source_type FROM shared_product_descriptions s
            WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko'
              AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) ko_canon_src,
         (SELECT count(*) FROM shared_product_descriptions s
            WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
              AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL) easy_canon_cnt
       FROM product_masters pm
       WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
       ORDER BY pm.id`, [ING, DOSE, FORM]);

    const formBreak: Record<string, number> = {};
    for (const r of coarse) formBreak[r.form_kw] = (formBreak[r.form_kw] || 0) + 1;
    const srcBreak: Record<string, number> = {};
    for (const r of coarse) { const k = r.ko_canon_src || 'NONE'; srcBreak[k] = (srcBreak[k] || 0) + 1; }

    console.log('JSON_BEGIN');
    console.log(JSON.stringify({
      drafts,
      coarseTotal: coarse.length,
      formBreakdown: formBreak,
      koCanonSrcBreakdown: srcBreak,
      easyCanonExactly1: coarse.filter((r: any) => Number(r.easy_canon_cnt) === 1).length,
      coarseNames: coarse.map((r: any) => ({ id: r.id, name: r.name, spec: r.spec, form_kw: r.form_kw, src: r.ko_canon_src, easy1: Number(r.easy_canon_cnt) })),
    }, null, 2));
    console.log('JSON_END');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
