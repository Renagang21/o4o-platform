/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-A-KO-EN-GA-V1 (에이전트 가)
 *
 * batch-8 번들 A(4그룹) excludeFp 하베스트 + audit SSOT target master ID 대조 — read-only, DB write 0.
 *   runner(drug-otc-grounded-upgrade-runner.ts) 의 fingerprint 블록·coarse 쿼리 VERBATIM 재사용.
 *   audit SSOT: src/scripts/data/otc-next-batch-8-audit-v1.json (target_master_ids / rollback_master_ids).
 *
 * PASS 조건(그룹별): target 재현 == audit T · target_master_ids 정렬 == audit 정렬 · target route 전부 oral.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DataSource } from 'typeorm';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── fingerprint = bridge 정본(f2c819451) 함수 VERBATIM(runner 와 동일, 산식 변경 없음) ──────────
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

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const OUT = path.join(DATA, 'otc-batch8-bundleA-fp-harvest.json');

interface G { groupKey: string; ingredient: string; dose: string; formKeyword: string; targetFp: string }
const GROUPS: G[] = [
  { groupKey: '락토바실루스아시도필루스균|300밀리그램|캡슐', ingredient: '락토바실루스아시도필루스균', dose: '300밀리그램', formKeyword: '캡슐', targetFp: '4ec78870b3318967' },
  { groupKey: '알파칼시돌|0.5마이크로그램|연질캡슐', ingredient: '알파칼시돌', dose: '0.5마이크로그램', formKeyword: '연질캡슐', targetFp: '8ac89c4550d02b6d' },
  { groupKey: '아세틸시스테인|100밀리그램|캡슐', ingredient: '아세틸시스테인', dose: '100밀리그램', formKeyword: '캡슐', targetFp: '41701ec292bc3fa6' },
  { groupKey: '나프록센나트륨|275밀리그램|정', ingredient: '나프록센나트륨', dose: '275밀리그램', formKeyword: '정', targetFp: '124cccc95fde01af' },
];

async function main(): Promise<void> {
  const audit = JSON.parse(fs.readFileSync(path.join(DATA, 'otc-next-batch-8-audit-v1.json'), 'utf8'));
  const auditByKey = new Map<string, any>((audit.candidates_examined || []).map((c: any) => [c.groupKey, c]));

  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  const results: any[] = [];
  try {
    for (const g of GROUPS) {
      const a = auditByKey.get(g.groupKey);
      const coarse: Array<{ id: string; name: string; spec: string; content: string }> = await ds.query(
        `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
         FROM product_masters pm
         JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
         WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
         ORDER BY pm.id`, [g.ingredient, g.dose, g.formKeyword]);
      const withFp = coarse.map((r) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
      const dist = new Map<string, { n: number; ids: string[]; names: string[]; routes: Set<string> }>();
      for (const r of withFp) {
        const e = dist.get(r.fp) || { n: 0, ids: [], names: [], routes: new Set<string>() };
        e.n += 1; e.ids.push(r.id); e.names.push(r.name); e.routes.add(r.route); dist.set(r.fp, e);
      }
      const rows = [...dist.entries()].map(([fp, e]) => ({ fp, n: e.n, isTarget: fp === g.targetFp, routes: [...e.routes], sampleNames: e.names.slice(0, 2), ids: e.ids }))
        .sort((x, y) => (y.isTarget ? 1 : 0) - (x.isTarget ? 1 : 0) || y.n - x.n);
      const target = rows.filter((r) => r.isTarget);
      const exclude = rows.filter((r) => !r.isTarget);
      const targetIds = (target[0]?.ids || []).slice().sort();
      const auditIds: string[] = (a?.target_master_ids || []).slice().sort();
      const idsMatch = JSON.stringify(targetIds) === JSON.stringify(auditIds);
      const targetCount = target.reduce((s, r) => s + r.n, 0);
      const excludeCount = exclude.reduce((s, r) => s + r.n, 0);
      const targetRoutes = [...new Set(target.flatMap((r) => r.routes))];
      const checks = {
        target_matches_audit_T: targetCount === (a?.target_T ?? -1),
        target_master_ids_identical: idsMatch,
        exclude_matches_audit: excludeCount === (a?.exclude_nonTarget ?? -1),
        target_all_oral: targetRoutes.length === 1 && targetRoutes[0] === 'oral',
      };
      results.push({
        groupKey: g.groupKey, targetFp: g.targetFp, auditT: a?.target_T ?? null, auditExclude: a?.exclude_nonTarget ?? null,
        coarseTotal: coarse.length, targetCount, excludeCount, excludeFpCount: exclude.length,
        excludeFps: exclude.map((r) => r.fp),
        excludeBreakdown: exclude.map((r) => ({ fp: r.fp, n: r.n })),
        targetRoutes, checks,
        verdict: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
        target_master_ids: targetIds,
        distribution: rows.map((r) => ({ fp: r.fp, n: r.n, isTarget: r.isTarget, routes: r.routes, sampleNames: r.sampleNames })),
      });
    }
  } finally { await ds.destroy(); }

  const out = {
    wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-A-KO-EN-GA-V1', agent: '에이전트 가', readOnly: true, dbWrite: 0,
    basis: 'otc-next-batch-8-audit-v1.json (commit 52fbdd9a7)',
    groups: results,
    allPass: results.every((r) => r.verdict === 'PASS'),
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(results.map((r) => ({ groupKey: r.groupKey, coarseTotal: r.coarseTotal, targetCount: r.targetCount, excludeCount: r.excludeCount, excludeFpCount: r.excludeFpCount, verdict: r.verdict, checks: r.checks, excludeFps: r.excludeFps })), null, 2));
  console.log('\nALL_PASS =', out.allPass);
  if (!out.allPass) process.exit(1);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
