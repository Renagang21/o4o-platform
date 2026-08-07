/** WO-O4O-OTC-TRACK-A-3H-PRODUCTION-NA-V1 (에이전트 나) READ-ONLY fp harvest.
 *  Usage: DB_*... npx tsx src/scripts/otc-fp-harvest-na.ts --ingredient=비오틴 --dose=5밀리그램 --form=정 --target=458af310d5beda5f
 */
import 'dotenv/config';
import crypto from 'node:crypto';
const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string) => md5(s).slice(0, 16);
const arg = (k: string) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const stripTags = (s: string) => s.replace(/<[^>]+>/g, ' ');
const normalize = (s: string) => stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
function easySections(c: string) { const o: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m; while ((m = re.exec(c))) o[m[1].trim()] = m[2].trim(); return o; }
function freeSections(c: string) { const o: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m; while ((m = re.exec(c))) { const t = m[2].replace(/[:：]\s*$/, '').trim(); const b = m[3].trim(); if (t) o[t] = (o[t] ? o[t] + '\n' : '') + b; } return o; }
function bucket(sec: Record<string, string>) { let ind = '', dos = '', cau = ''; for (const [t, b] of Object.entries(sec)) { if (/효능|효과|적응|용도/.test(t)) ind += b; else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += b; else if (/상호\s*작용|병용/.test(t)) { /* 상호작용 절은 수집 대상 아님 */ } else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += b; } return { ind, dos, cau }; }
const formOf = (n: string) => /연질캡슐/.test(n) ? '연질캡슐' : /캡슐/.test(n) ? '캡슐' : /정/.test(n) ? '정' : '기타';
const routeSig = (n: string) => /정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(n) ? 'oral' : 'unknown';
const ingredientOf = (n: string) => (n.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (s: string) => (s || '').split(' / ')[0].trim();
function fp(name: string, spec: string, content: string) { let sec = easySections(content || ''); if (!Object.keys(sec).length) sec = freeSections(content || ''); const { ind, dos, cau } = bucket(sec); return H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredientOf(name)}|${strengthOf(spec)}`), H(formOf(name)), routeSig(name)].join('|')); }

async function main() {
  const ingredient = arg('ingredient'), dose = arg('dose'), form = arg('form'), target = arg('target');
  const { Client } = await import('pg');
  const c = new Client({ host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), user: process.env.DB_USER || 'o4o_api', database: process.env.DB_NAME || 'o4o_platform', password: process.env.DB_PASSWORD });
  await c.connect();
  await c.query("SET statement_timeout='90s'");
  const r = await c.query(`SELECT pm.id::text id, pm.name, pm.specification spec, es.content
    FROM product_masters pm JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true
    WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
    ORDER BY pm.id`, [ingredient, dose, form]);
  await c.end();
  const dist: Record<string, { n: number; ids: string[]; route: string }> = {};
  for (const x of r.rows) { const f = fp(x.name, x.spec, x.content); (dist[f] || (dist[f] = { n: 0, ids: [], route: routeSig(x.name) })).n++; dist[f].ids.push(x.id); }
  const entries = Object.entries(dist).sort((a, b) => b[1].n - a[1].n);
  console.log(`coarse total ${r.rows.length}`);
  const targetN = dist[target]?.n ?? 0;
  const exclude = entries.filter(([f]) => f !== target);
  console.log(`target(${target}) = ${targetN} · exclude fps = ${exclude.length} · exclude masters = ${exclude.reduce((s, [, d]) => s + d.n, 0)} · other(non-oral in target)= ${(dist[target]?.route) === 'oral' ? 0 : 'CHECK'}`);
  for (const [f, d] of entries) console.log(`  ${f} n=${d.n} route=${d.route}${f === target ? ' <TARGET>' : ''}`);
  console.log('EXCLUDE_FP_JSON=' + JSON.stringify(exclude.map(([f]) => f)));
  console.log('TARGET_IDS=' + JSON.stringify((dist[target]?.ids || []).sort()));
}
main().catch((e) => { console.error(e); process.exit(1); });
