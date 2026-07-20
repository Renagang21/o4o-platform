/**
 * 아세트아미노펜 325mg / 나프록센 250mg 연질캡슐 — excludeFp 하베스트(read-only, DB write 0).
 * WO-O4O-OTC-ACETAMINOPHEN-NAPROXEN-KO-EN-COMPLETE-DA-V1 · 에이전트 다.
 * runner fingerprint·coarse VERBATIM 재사용. target == GA bridge 로 산식 정본 검증.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DataSource } from 'typeorm';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'] as const;
const EASY_SOURCE = 'mfds_easy_drug';

// ── (하드닝 2) TypeORM query() 반환값 정규화 공통 헬퍼 ──────────────────────────
// query() 의 UPDATE/INSERT ... RETURNING 결과는 드라이버에 따라 `[rows, affected]` 또는 `rows` 로 온다.
// (guide Gotcha #3) rows 만 정규화 반환. 순수 SELECT(res=행 배열)도 방어적으로 통과.
const retRows = <T = { id?: string }>(res: unknown): T[] =>
  (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];
// 단일 집계 SELECT 행 정규화(방어적).
const firstRow = <T = Record<string, unknown>>(res: unknown): T | undefined => retRows<T>(res)[0];

// ── fingerprint = bridge 정본(f2c819451) 함수 VERBATIM(파일럿과 동일, 산식 변경 없음) ──────────
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
/** bridge groupKeyOf VERBATIM: H([norm_ind, norm_dos, norm_cau, H(성분|함량), H(제형), route]) */
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string; ingredient: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const ingredient = ingredientOf(name); const strength = strengthOf(spec); const form = formOf(name); const route = routeSig(name);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredient}|${strength}`), H(form), route].join('|'));
  return { fp, route, form, ingredient };
}

const GROUPS = [
  { key:'acetaminophen-325mg-softcap', ingredient:'아세트아미노펜', dose:'325밀리그램', form:'연질캡슐', targetFp:'26587fd5ff28e6b3', expectTarget:18, expectExclude:6 },
  { key:'naproxen-250mg-softcap', ingredient:'나프록센', dose:'250밀리그램', form:'연질캡슐', targetFp:'b2b5edea34cff218', expectTarget:15, expectExclude:72 },
];
async function main(){
  const ds = new DataSource({ type:'postgres', host:process.env.DB_HOST, port:parseInt(process.env.DB_PORT||'5442',10), username:process.env.DB_USERNAME, password:process.env.DB_PASSWORD, database:process.env.DB_NAME, entities:[], synchronize:false, logging:['error'], extra:{ statement_timeout:120000 } });
  await ds.initialize();
  try {
    for (const g of GROUPS){
      const coarse = await ds.query(
        `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
         FROM product_masters pm
         JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
         WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
         ORDER BY pm.id`, [g.ingredient, g.dose, g.form]);
      const withFp = coarse.map(r=>({ ...r, ...fingerprintOf(r.name,r.spec,r.content) }));
      const dist = new Map();
      for (const r of withFp){ const e=dist.get(r.fp)||{n:0,ids:[],names:[],forms:new Set(),routes:new Set()}; e.n++; e.ids.push(r.id); e.names.push(r.name); e.forms.add(r.form); e.routes.add(r.route); dist.set(r.fp,e); }
      const rows=[...dist.entries()].map(([fp,e])=>({fp,n:e.n,isTarget:fp===g.targetFp,forms:[...e.forms],routes:[...e.routes],sampleNames:e.names.slice(0,2),ids:e.ids})).sort((a,b)=>(b.isTarget?1:0)-(a.isTarget?1:0)||b.n-a.n);
      const target=rows.filter(r=>r.isTarget), exclude=rows.filter(r=>!r.isTarget);
      const tc=target.reduce((a,r)=>a+r.n,0), xc=exclude.reduce((a,r)=>a+r.n,0);
      const out={ wo:'WO-O4O-OTC-ACETAMINOPHEN-NAPROXEN-KO-EN-COMPLETE-DA-V1', readOnly:true, dbWrite:0,
        groupKey:`${g.ingredient}|${g.dose}|${g.form}`, targetFp:g.targetFp, coarseTotal:coarse.length,
        targetCount:tc, excludeCount:xc, excludeFpCount:exclude.length, excludeFps:exclude.map(r=>r.fp),
        targetForms:[...new Set(target.flatMap(r=>r.forms))], targetRoutes:[...new Set(target.flatMap(r=>r.routes))],
        allForms:[...new Set(rows.flatMap(r=>r.forms))],
        distribution:rows.map(r=>({fp:r.fp,n:r.n,isTarget:r.isTarget,forms:r.forms,routes:r.routes,sampleNames:r.sampleNames})),
        target_master_ids:(target[0]?.ids||[]).slice().sort() };
      fs.writeFileSync(path.resolve(process.cwd(),`src/scripts/data/otc-${g.key}-fp-harvest.json`), JSON.stringify(out,null,2),'utf8');
      const okT=tc===g.expectTarget, okX=xc===g.expectExclude, okForm=out.allForms.length===1&&out.allForms[0]==='연질캡슐';
      console.log(`\n[${g.key}] coarse ${coarse.length} target ${tc}(expect ${g.expectTarget} ${okT?'PASS':'FAIL'}) exclude ${xc}(expect ${g.expectExclude} ${okX?'PASS':'FAIL'}) excludeFps ${exclude.length}`);
      console.log(`  allForms=${JSON.stringify(out.allForms)} (연질캡슐 only ${okForm?'PASS':'FAIL'}) targetRoutes=${JSON.stringify(out.targetRoutes)}`);
      console.log(`  excludeFps: ${JSON.stringify(out.excludeFps)}`);
      console.log(`  exclude per-fp: ${exclude.map(r=>r.n).join('+')} = ${xc}`);
    }
  } finally { await ds.destroy(); }
}
main().catch(e=>{ console.error('FATAL',e instanceof Error?e.message:e); process.exit(1); });
