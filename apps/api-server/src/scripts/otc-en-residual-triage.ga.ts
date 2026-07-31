/**
 * WO — OTC EN 잔여 813건 일괄 정비 / 1단계: 오탐·실결함 분리 (READ-ONLY)
 *
 * 1차 감사의 NUMERIC 신호에는 **탐지기 한계로 인한 오탐**이 섞여 있다(표본 실측):
 *   ① KO 는 쉼표를 **범위 구분자**로 쓴다: "1회 200,600 mg" = 200~600, "1일 3,4회" = 3~4회.
 *      쉼표를 천단위로만 보고 제거하면 200600·34 같은 유령 수치가 만들어진다.
 *   ② 영어는 수사·서수를 쓴다: "one and a half tablets"(1.5), "the fifth month"(5).
 *   ③ 제품명·hero 는 이미 제외했으나 본문 안에서도 위 두 형태가 남아 있었다.
 *
 * 따라서 KO 수치는 **가능한 해석을 모두** 후보로 만들고(연결값·앞부분·뒷부분),
 * EN 은 수사·서수·분수 표현까지 정규화한 뒤, **어느 후보도 EN 에 없을 때만** 손실로 본다.
 *
 * ROUTE 신호는 EN 의 `take it/this medicine` 이 KO 의 비경구 동작과 대응하는지 문장 단위로 확인한다.
 *
 * Usage: ../../node_modules/.bin/tsx src/scripts/otc-en-residual-triage.ga.ts [--port 5572]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const text = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
function bodyText(html: string): string {
  const parts: string[] = [];
  const m1 = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/); if (m1) parts.push(m1[1]);
  const m2 = html.match(/<p class="sd-intake">([\s\S]*?)<\/p>/); if (m2) parts.push(m2[1]);
  for (const ul of html.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || []) parts.push(ul);
  for (const it of html.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || []) parts.push(it);
  return text(parts.join(' '));
}

/** EN 수치 집합 — 수사·서수·분수까지 정규화 */
const WORD: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  ten: '10', eleven: '11', twelve: '12', fifteen: '15', eighteen: '18', twenty: '20',
  first: '1', second: '2', third: '3', fourth: '4', fifth: '5', sixth: '6', seventh: '7',
  eighth: '8', ninth: '9', tenth: '10', eleventh: '11', twelfth: '12',
};
function enNumbers(s: string): Set<string> {
  let t = s.toLowerCase().replace(/,/g, '');
  t = t.replace(/\bone\s+and\s+a\s+half\b/g, ' 1.5 ').replace(/\bhalf\s+a\b/g, ' 0.5 ').replace(/\ba\s+half\b/g, ' 0.5 ')
    .replace(/\bonce\b/g, ' 1 ').replace(/\btwice\b/g, ' 2 ').replace(/\bthrice\b/g, ' 3 ');
  t = t.replace(/\b([a-z]+)\b/g, (w) => WORD[w] ?? w);
  const out = new Set<string>();
  for (const n of t.match(/\d+(?:\.\d+)?/g) || []) { out.add(n); out.add(String(parseFloat(n))); }
  return out;
}
/** KO 단위 수치 — 쉼표는 천단위일 수도 범위 구분자일 수도 있으므로 **모든 해석**을 후보로 낸다 */
const KO_UNIT = /((?:\d+[.,])*\d+(?:\.\d+)?)\s*(mg|밀리그램|㎎|㎍|mcg|g|그램|mL|밀리리터|㎖|L|리터|%|IU|세|개월|회|일|주|시간|분|정|캡슐|포|매|방울)/g;
const DOSE_UNIT = /^(mg|밀리그램|㎎|㎍|mcg|g|그램|mL|밀리리터|㎖|L|리터|%|IU)$/;
type KoNum = { raw: string; unit: string; candidates: string[] };
function koNumbers(s: string): KoNum[] {
  const out: KoNum[] = [];
  let m: RegExpExecArray | null; KO_UNIT.lastIndex = 0;
  while ((m = KO_UNIT.exec(s))) {
    const raw = m[1], unit = m[2];
    const cand = new Set<string>();
    cand.add(raw.replace(/,/g, ''));                       // 천단위 해석
    for (const part of raw.split(',')) if (part) cand.add(part);   // 범위 구분자 해석
    for (const c of [...cand]) cand.add(String(parseFloat(c)));
    out.push({ raw, unit, candidates: [...cand] });
  }
  return out;
}
const KO_ORAL = /(복용|먹|삼키|내복|경구)/;
const PRODUCT_ORAL = /\btak(?:e|es|ing)\s+(?:it|this\s+(?:medicine|drug))\b/i;
const ORAL_MARK = /\b(by mouth|orally|internally|swallow|swallowed|eat|eaten)\b/i;

async function main(): Promise<void> {
  const rows: any[] = JSON.parse(fs.readFileSync(P('otc-store-en-audit-postfix-verify-review-required.ga.json'), 'utf8')).rows;
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5572', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');
  const ko = new Map<string, string>(), en = new Map<string, string>();
  const koIds = rows.map((r) => r.koDescriptionId), enIds = rows.map((r) => r.enDescriptionId);
  for (let i = 0; i < koIds.length; i += 500) {
    for (const r of (await pool.query('SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])', [koIds.slice(i, i + 500)])).rows) ko.set(r.id, r.content);
    for (const r of (await pool.query('SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])', [enIds.slice(i, i + 500)])).rows) en.set(r.id, r.content);
  }
  await pool.end();

  const out: any[] = [];
  const cnt: Record<string, number> = {};
  const bump = (k: string): void => { cnt[k] = (cnt[k] || 0) + 1; };
  for (const r of rows) {
    const koB = bodyText(ko.get(r.koDescriptionId) || ''), enB = bodyText(en.get(r.enDescriptionId) || '');
    const enSet = enNumbers(enB);
    const lost = koNumbers(koB).filter((n) => !n.candidates.some((c) => enSet.has(c)));
    const lostDose = lost.filter((n) => DOSE_UNIT.test(n.unit));
    const lostAge = lost.filter((n) => /^(세|개월)$/.test(n.unit));
    const routeReal = r.softSignals.includes('POSSIBLE_ROUTE_VERB_ISSUE')
      && PRODUCT_ORAL.test(enB) && !ORAL_MARK.test(enB) && !KO_ORAL.test(koB);
    const doseLimitStill = r.softSignals.includes('DOSE_LIMIT_SENTENCE_MISSING');

    let cls: string;
    if (lost.length === 0 && !routeReal && !doseLimitStill) cls = 'FALSE_POSITIVE';
    else if (doseLimitStill) cls = 'REVIEW_DOSE_LIMIT';
    else if (routeReal) cls = 'REVIEW_ROUTE';
    else if (lostDose.length) cls = 'REAL_DOSE_VALUE_MISSING';
    else if (lostAge.length) cls = 'REAL_AGE_CONDITION_MISSING';
    else cls = 'REAL_OTHER_VALUE_MISSING';
    bump(cls);
    out.push({
      masterId: r.masterId, productName: r.productName, koDescriptionId: r.koDescriptionId,
      enDescriptionId: r.enDescriptionId, koHash: r.koHash, enHash: r.enHash,
      originalSignals: r.softSignals, triage: cls,
      lost: lost.map((n) => `${n.raw}${n.unit}`).slice(0, 10),
      lostDose: lostDose.map((n) => `${n.raw}${n.unit}`), lostAge: lostAge.map((n) => `${n.raw}${n.unit}`),
    });
  }
  fs.writeFileSync(P('otc-en-residual-triage.ga.json'), JSON.stringify({ total: out.length, byClass: cnt, rows: out }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify({ total: out.length, byClass: cnt }, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
