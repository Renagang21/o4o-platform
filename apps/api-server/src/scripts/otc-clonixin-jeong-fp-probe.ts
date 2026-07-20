/**
 * read-only FP PROBE (WO-O4O-OTC-CLONIXIN-125MG-TABLET-KO-EN-COMPLETE-GA-V1, Agent 가)
 * DB write 0. 클로닉신리시네이트 125mg 정 coarse 80 을 runner 와 동일한 fingerprint 산식으로
 *   재고정하여 fp 분포(현재 canonical source 별)를 산출 → dominant(그대로확장) fp / exclude fp 도출.
 * fingerprint 블록은 drug-otc-grounded-upgrade-runner.ts 52-101 VERBATIM 복제(산식 변경 없음).
 * 조사·독립검증 도구(재현용 커밋). 최종 검증은 runner dry-run(권위).
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
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string; itx: string } {
  let ind = '', dos = '', cau = '', itx = '';
  for (const [t, b] of Object.entries(sec)) {
    if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b;
    else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b;
    else if (/상호\s*작용|병용/.test(t)) itx += (itx ? '\n' : '') + b;
    else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b;
  }
  return { ind, dos, cau, itx };
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
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string; ingredient: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const ingredient = ingredientOf(name); const strength = strengthOf(spec); const form = formOf(name); const route = routeSig(name);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredient}|${strength}`), H(form), route].join('|'));
  return { fp, route, form, ingredient };
}

const ING = '클로닉신리시네이트', DOSE = '125밀리그램', FORM = '정';

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  try {
    // runner 코스 쿼리 VERBATIM (easy content canonical 우선, 없으면 deprecated fallback)
    const coarse = await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec, es.content,
         (SELECT s.source_type FROM shared_product_descriptions s
            WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko'
              AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) ko_canon_src
       FROM product_masters pm
       JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
       WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
       ORDER BY pm.id`, [ING, DOSE, FORM]);

    const withFp = coarse.map((r: any) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
    // fp 분포 (source 별 split)
    const dist: Record<string, { total: number; easy: number; authored: number; other: number; route: string; form: string; sampleName: string }> = {};
    for (const r of withFp) {
      const d = dist[r.fp] || (dist[r.fp] = { total: 0, easy: 0, authored: 0, other: 0, route: r.route, form: r.form, sampleName: r.name });
      d.total++;
      if (r.ko_canon_src === 'mfds_easy_drug') d.easy++;
      else if (r.ko_canon_src === 'mfds_drug_otc' || r.ko_canon_src === 'nutrition_combo') d.authored++;
      else d.other++;
    }
    const sorted = Object.entries(dist).sort((a, b) => b[1].total - a[1].total);
    // dominant fp among EASY-canonical (그대로확장 후보): easy 최대
    const easySorted = [...sorted].sort((a, b) => b[1].easy - a[1].easy);
    const dominantEasyFp = easySorted[0][0];
    const target = withFp.filter((r: any) => r.fp === dominantEasyFp);
    const targetEasy = target.filter((r: any) => r.ko_canon_src === 'mfds_easy_drug');
    const targetAuthored = target.filter((r: any) => r.ko_canon_src === 'mfds_drug_otc' || r.ko_canon_src === 'nutrition_combo');

    console.log('JSON_BEGIN');
    console.log(JSON.stringify({
      coarseTotal: coarse.length,
      dominantEasyFp,
      dominantForm: dist[dominantEasyFp].form,
      dominantRoute: dist[dominantEasyFp].route,
      target_total: target.length,
      target_easy: targetEasy.length,
      target_authored_conflict: targetAuthored.length,
      nonOralInTarget: target.filter((r: any) => r.route !== 'oral').map((r: any) => r.name),
      fpDistribution: sorted.map(([fp, d]) => ({ fp, ...d })),
      target_easy_master_ids: targetEasy.map((r: any) => r.id).sort(),
    }, null, 2));
    console.log('JSON_END');
  } finally { if (ds.isInitialized) await ds.destroy(); }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
