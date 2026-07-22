/**
 * Agent C 완결형 2차 — 풀 전체 은닉 기능성 감사 (combo-agnostic, per-item, read-only).
 *   npx tsx src/scripts/hff-combo-c-pool-hidden-audit.ts --pool <ComboSeed[].json>
 *
 * 각 제품의 TARGET = 자기 ingredients 키. c5-audit 의 H1/H3 을 per-item 으로 적용.
 * H1: BASE 에 자기 signature 밖 **분류가능** 원료 라벨(:값) 존재.
 * H3: `라벨:값/기준` 형태인데 CLS 미분류(은닉) — SPEC_RE 미포착 잔여.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { CLS, NONFUNC, normalizeSpecText } from './hff-source-parse.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const pool = JSON.parse(fs.readFileSync(arg('pool'), 'utf8')) as Array<{ statementNo: string; productName: string; ingredients: Array<{ key: string }>; source: { baseStandard: string } }>;

const h1: Array<{ stmt: string; name: string; extras: string[] }> = [];
const h3: Array<{ stmt: string; name: string; labels: string[] }> = [];
for (const it of pool) {
  const target = new Set(it.ingredients.map((g) => g.key));
  const b = normalizeSpecText(it.source.baseStandard ?? '');
  // H1
  const found = new Set<string>();
  for (const m of b.matchAll(/([가-힣A-Za-z0-9()\-·]{1,20}(?:\s[가-힣A-Za-z0-9()\-·]{1,12})?)\s*[:：]/g)) {
    const label = m[1].trim(); if (NONFUNC.test(label)) continue;
    for (const c of CLS) { if (!c.re.test(label)) continue; if (target.has(c.k)) break; found.add(c.k); break; }
  }
  if (found.size) h1.push({ stmt: it.statementNo, name: it.productName, extras: [...found] });
  // H3
  const unk: string[] = [];
  for (const m of b.matchAll(/([가-힣A-Za-z0-9()\-·]{1,20}(?:\s(?:함량|표시량|[가-힣A-Za-z0-9()\-·]{1,12}))?)\s*[:：]\s*(?:표시량\s*)?\(?\s*[\d][\d,.]*\s*(?:mg|g|μg|mcg|IU)[^\n○]{0,40}\/\s*[\d][\d,.]*\s*(?:mg|g)/g)) {
    const label = m[1].trim().replace(/\s*(?:함량|표시량)$/, '');
    if (NONFUNC.test(label)) continue;
    if (CLS.some((c) => c.re.test(label))) continue;
    unk.push(label);
  }
  if (unk.length) h3.push({ stmt: it.statementNo, name: it.productName, labels: [...new Set(unk)] });
}
console.log(JSON.stringify({ pool: pool.length, H1_hiddenClassified: h1.length, H3_hiddenUnclassified: h3.length, H1sample: h1.slice(0, 8), H3sample: h3.slice(0, 8) }, null, 1));
const OUT = arg('out'); if (OUT) fs.writeFileSync(OUT, JSON.stringify({ h1, h3 }, null, 1));
