/**
 * READ-ONLY — single-lutein 교정 대상 31건 actualFullSet 재감사. DB write 0.
 *   PROXY_PORT=5433 npx tsx src/scripts/hff-lut-fullset-audit.ts --queue <lut31.json>
 *
 * 목적: 큐(verifiedFullSet)와 **원문 실측** 을 대조.
 *  - standardSpecs : hff-combo-select 의 SPEC 정규식이 잡는 집합(생산 파이프라인이 보는 것)
 *  - robustSpecs   : 단위 수식어(a-TE/α-TE/RAE/RE/NE/DFE) · 공백 변이를 허용한 관대 스캔
 *  - fnAttributed  : MAIN_FNCTN 에 기능성이 등재된 원료(브래킷 [원료] + 인라인)
 *  - actualFullSet = robustSpecs ∩ fnAttributed  (= 실제 재분류돼야 할 조합)
 * 큐 verifiedFullSet 과 actualFullSet 이 다르면 MISMATCH.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';
import { normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

const arg = (n: string): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : ''; };
const QUEUE = arg('queue'); if (!QUEUE) throw new Error('--queue 필요');

const NONFUNC = /성상|대장균군|대장균|붕해|납|카드뮴|비소|수은|헥산|아플라톡신|세균수|산가|과산화물|타르색소|보존료|수분|회분|중금속|미생물|이산화황|벤조피렌/;
const CLS: Array<{ k: string; re: RegExp }> = [
  { k: '비타민C', re: /비타민\s?C\b/i }, { k: '비타민D', re: /비타민\s?D\b/i }, { k: '비타민B12', re: /비타민\s?B\s?12|코발라민/i },
  { k: '비타민B6', re: /비타민\s?B\s?6|피리독/i }, { k: '비타민B2', re: /비타민\s?B\s?2|리보플라빈/i }, { k: '비타민B1', re: /비타민\s?B\s?1\b|티아민/i },
  { k: '비타민A', re: /비타민\s?A\b|레티놀|베타카로/i }, { k: '비타민E', re: /비타민\s?E\b|토코페롤/i }, { k: '비타민K', re: /비타민\s?K\b|메나퀴논/i },
  { k: '엽산', re: /엽산|폴[레리]?산/i }, { k: '나이아신', re: /나이아신|니아신|니코틴산|니코틴아미드/i }, { k: '판토텐산', re: /판토텐/i }, { k: '비오틴', re: /비오틴|바이오틴/i },
  { k: '아연', re: /아연/i }, { k: '마그네슘', re: /마그네슘/i }, { k: '철', re: /철분|헴철|철\s*[:：(]|피로인산철|푸마르산철/i }, { k: '칼슘', re: /칼슘/i },
  { k: '셀레늄', re: /셀레늄|셀렌/i }, { k: '구리', re: /구리/i }, { k: '망간', re: /망간/i }, { k: '크롬', re: /크[로롬]/i }, { k: '몰리브덴', re: /몰리브/i }, { k: '요오드', re: /요오드|아이오딘/i },
  { k: '오메가3', re: /EPA|DHA|정제어유/i }, { k: '루테인', re: /루테인|지아잔틴|마리골드|황반/i }, { k: '밀크씨슬', re: /밀크씨슬|실리마린|카르두스/i },
];
const classify = (label: string): string | null => { for (const c of CLS) if (c.re.test(label)) return c.k; return null; };

// 생산 파이프라인(hff-combo-select) 과 동일한 SPEC 정규식
const SPEC_STD = /([가-힣A-Za-z0-9()\-·]{2,22}?)\s*[:：]\s*(?:표시량\s*\(?)?\s*([\d][\d,.]*)\s*(mg|g|㎍|μg|mcg|IU)\s*(?:RE|α-?TE|NE|DFE)?\s*\/\s*([\d][\d,.]*)\s*(mg|g)\s*\)?\s*(?:의\s*[\d.]+\s*[~∼\-]\s*[\d.]+\s*%|이상)/gi;
// 관대 스캔: 값-단위 뒤 임의 수식어(a-TE, α-TE, RAE, RE …) 허용
const SPEC_ROBUST = /([가-힣A-Za-z0-9()\-·\s]{2,25}?)\s*[:：]\s*표시량\s*\(?\s*([\d][\d,.]*)\s*(mg|g|㎍|μg|mcg|IU)[^/)]{0,12}\/\s*([\d][\d,.]*)\s*(mg|g)\s*\)?/gi;

function specSet(base: string, re: RegExp): Set<string> {
  const b = normalizeSource(base); const out = new Set<string>(); re.lastIndex = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(b)) !== null) { const label = m[1].trim(); if (NONFUNC.test(label)) continue; const k = classify(label); if (k) out.add(k); }
  return out;
}
function fnAttributed(fn: string): Set<string> {
  const t = normalizeSource(fn); const out = new Set<string>();
  for (const m of t.matchAll(/\[([^\]]+)\]/g)) { const k = classify(m[1]); if (k) out.add(k); }
  return out;
}
const sig = (s: Iterable<string>) => [...new Set(s)].sort().join('+');

async function main(): Promise<void> {
  const rows = JSON.parse(fs.readFileSync(QUEUE, 'utf8')) as Array<{ statementNo: string; productName: string; verifiedFullSet: string[] }>;
  const stmts = rows.map((r) => String(r.statementNo));
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5433', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, ssl: false, extra: { max: 2, statement_timeout: 60000 } });
  await ds.initialize();
  try {
    const src: Array<{ stmt: string; base: string; fn: string }> = await ds.query(
      `SELECT raw_payload->'source'->>'STTEMNT_NO' stmt, raw_payload->'source'->>'BASE_STANDARD' base, raw_payload->'source'->>'MAIN_FNCTN' fn
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND raw_payload->'source'->>'STTEMNT_NO' = ANY($1)`, [stmts]);
    const byStmt = new Map(src.map((s) => [s.stmt, s]));
    let mismatch = 0; const detail: Array<Record<string, unknown>> = []; const actualGroups: Record<string, number> = {}; const queueGroups: Record<string, number> = {};
    for (const r of rows) {
      const s = byStmt.get(String(r.statementNo)); if (!s) { console.log('SOURCE_MISSING', r.statementNo); continue; }
      const std = specSet(s.base || '', SPEC_STD);
      const rob = specSet(s.base || '', SPEC_ROBUST);
      const fns = fnAttributed(s.fn || '');
      const actual = new Set([...rob].filter((k) => fns.has(k)));
      const qSig = sig(r.verifiedFullSet), aSig = sig(actual);
      queueGroups[qSig] = (queueGroups[qSig] ?? 0) + 1; actualGroups[aSig] = (actualGroups[aSig] ?? 0) + 1;
      const bad = qSig !== aSig; if (bad) mismatch++;
      detail.push({ stmt: r.statementNo, name: r.productName, queue: qSig, actual: aSig, standardSpecs: sig(std), robustSpecs: sig(rob), fnAttributed: sig(fns), MISMATCH: bad });
    }
    console.log('JSON_AUDIT_BEGIN');
    console.log(JSON.stringify({ target: rows.length, mismatch, queueGroups, actualGroups, detail }, null, 1));
    console.log('JSON_AUDIT_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
