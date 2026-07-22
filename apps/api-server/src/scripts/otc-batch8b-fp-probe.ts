/**
 * read-only FP PROBE (WO-O4O-OTC-NEXT-BATCH-8B-BUNDLE-A-KO-EN-COMPLETE-GA-V1, Agent 가). DB write 0.
 * 담당 4그룹을 runner 와 동일 fingerprint 산식으로 재고정 + 감사(b82d7e7ed) target/exclude/targetFp/master_ids 교차검증.
 * fingerprint 블록 = drug-otc-grounded-upgrade-runner.ts 52-101 VERBATIM. 조사·독립검증 도구(재현용 커밋).
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
function easySections(content: string): Record<string, string> {
  const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out;
}
function freeSections(content: string): Record<string, string> {
  const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(content))) { const title = m[2].replace(/[:：]\s*$/, '').trim(); const body = m[3].trim(); if (title) out[title] = (out[title] ? out[title] + '\n' : '') + body; }
  return out;
}
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string } {
  let ind = '', dos = '', cau = '';
  for (const [t, b] of Object.entries(sec)) {
    if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b;
    else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b;
    else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b;
  }
  return { ind, dos, cau };
}
function formOf(name: string): string {
  return /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림'
    : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽'
    : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
}
function routeSig(name: string): string {
  if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal';
  if (/좌약|좌제/.test(name)) return 'rectal';
  if (/점안|안연고/.test(name)) return 'ophthalmic';
  if (/점이액|귀에/.test(name)) return 'otic';
  if (/점비|비강/.test(name)) return 'nasal';
  if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical';
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
  return 'unknown';
}
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const ingredient = ingredientOf(name); const strength = strengthOf(spec); const form = formOf(name); const route = routeSig(name);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredient}|${strength}`), H(form), route].join('|'));
  return { fp, route, form };
}

const audit = JSON.parse(readFileSync('C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-next-batch-8b-audit-v1.json', 'utf8'));
const auditByGk: Record<string, any> = {};
for (const e of audit.candidates_examined) auditByGk[e.groupKey] = e;

const GROUPS = [
  { key: 'arginine-tidiacicate-200mg-softcap', gk: '아르기닌티디아시케이트|200밀리그램|연질캡슐', ing: '아르기닌티디아시케이트', dose: '200밀리그램', form: '연질캡슐' },
  { key: 'mg-hydroxide-500mg-jeong', gk: '수산화마그네슘|500밀리그램|정', ing: '수산화마그네슘', dose: '500밀리그램', form: '정' },
  { key: 'ibuprofen-200mg-softcap', gk: '이부프로펜|200밀리그램|연질캡슐', ing: '이부프로펜', dose: '200밀리그램', form: '연질캡슐' },
  { key: 'dexibuprofen-300mg-jeong', gk: '덱시부프로펜|300밀리그램|정', ing: '덱시부프로펜', dose: '300밀리그램', form: '정' },
];

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const results: any[] = [];
  try {
    for (const g of GROUPS) {
      const a = auditByGk[g.gk];
      const drafts = await ds.query(`SELECT candidate_id::text, source_identifier_value gk FROM product_candidate_description_drafts WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND source_identifier_value=$1`, [g.gk]);
      const coarse = await ds.query(
        `SELECT pm.id::text id, pm.name, pm.specification spec, es.content,
           (SELECT s.source_type FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) ko_canon_src
         FROM product_masters pm
         JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
         WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
         ORDER BY pm.id`, [g.ing, g.dose, g.form]);
      const withFp = coarse.map((r: any) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
      const dist: Record<string, { total: number; easy: number; authored: number; other: number }> = {};
      for (const r of withFp) {
        const dd = dist[r.fp] || (dist[r.fp] = { total: 0, easy: 0, authored: 0, other: 0 });
        dd.total++;
        if (r.ko_canon_src === 'mfds_easy_drug') dd.easy++;
        else if (r.ko_canon_src === 'mfds_drug_otc' || r.ko_canon_src === 'nutrition_combo') dd.authored++;
        else dd.other++;
      }
      const easySorted = Object.entries(dist).sort((x, y) => y[1].easy - x[1].easy);
      const domFp = easySorted.length ? easySorted[0][0] : null;
      const target = withFp.filter((r: any) => r.fp === domFp);
      const targetEasy = target.filter((r: any) => r.ko_canon_src === 'mfds_easy_drug');
      const targetAuthored = target.filter((r: any) => r.ko_canon_src === 'mfds_drug_otc' || r.ko_canon_src === 'nutrition_combo');
      const excludeFps = Object.keys(dist).filter((fp) => fp !== domFp);
      const excludeCount = excludeFps.reduce((n, fp) => n + dist[fp].total, 0);
      const derivedIds = targetEasy.map((r: any) => r.id).sort();
      const auditIds = (a.target_master_ids || []).slice().sort();
      results.push({
        key: g.key, gk: g.gk,
        candidate: drafts[0]?.candidate_id ?? null, draftCount: drafts.length,
        auditCandidate: a.authored_source_ref_id, candidateMatch: drafts[0]?.candidate_id === a.authored_source_ref_id,
        coarseTotal: coarse.length, auditCoarse: a.coarseTotal, coarseMatch: coarse.length === a.coarseTotal,
        domFp, auditTargetFp: a.bridgeFp, fpMatch: domFp === a.bridgeFp,
        target_easy: targetEasy.length, auditTarget: a.target_master, targetMatch: targetEasy.length === a.target_master,
        authoredConflict: targetAuthored.length,
        excludeCount, auditExclude: a.exclude_nonTarget, excludeMatch: excludeCount === a.exclude_nonTarget,
        nonOral: target.filter((r: any) => r.route !== 'oral').length,
        masterIdsMatch: JSON.stringify(derivedIds) === JSON.stringify(auditIds),
        excludeFps: excludeFps.sort((x, y) => dist[y].total - dist[x].total),
        excludeFpCounts: excludeFps.map((fp) => ({ fp, n: dist[fp].total })),
        target_easy_master_ids: derivedIds,
      });
    }
    console.log('JSON_BEGIN'); console.log(JSON.stringify(results, null, 2)); console.log('JSON_END');
  } finally { if (ds.isInitialized) await ds.destroy(); }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
