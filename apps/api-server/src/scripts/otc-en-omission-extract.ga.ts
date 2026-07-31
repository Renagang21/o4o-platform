/**
 * EN 정보 누락 285건 — **누락된 KO 문장 추출 + 템플릿 군집화** (READ-ONLY)
 *
 * 대상: triage 의 REAL_* 중 KO 손상이 없는 문서(= KO 는 정상인데 EN 에만 문장이 빠진 건).
 * 각 문서에서 "EN 에 없는 수치"를 담은 **KO 문장**을 찾아, 그 문장이 EN 에 대응되지 않음을 확인하고
 * 문장 템플릿(수치·연령 슬롯을 마스킹)으로 묶는다. 템플릿 수가 적으면 그룹 단위 저작이 가능하다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
function bodyText(html: string): string {
  const p: string[] = [];
  const a = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/); if (a) p.push(a[1]);
  const b = html.match(/<p class="sd-intake">([\s\S]*?)<\/p>/); if (b) p.push(b[1]);
  for (const ul of html.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || []) p.push(ul);
  for (const it of html.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || []) p.push(it);
  return T(p.join(' '));
}
/** 한국어 문장 분해 — `마십시오.이 약을` 처럼 공백 없이 이어진다 */
function koSentences(t: string): string[] {
  const out: string[] = []; let s = 0;
  for (let i = 0; i < t.length; i++) {
    if (!/[.!?]/.test(t[i])) continue;
    const n = t[i + 1] || ' ';
    if (/\s/.test(n) || /[가-힣]/.test(n) || i === t.length - 1) { const x = t.slice(s, i + 1).trim(); if (x) out.push(x); s = i + 1; }
  }
  const r = t.slice(s).trim(); if (r) out.push(r);
  return out;
}
const WORD: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', fifteen: '15', eighteen: '18', twenty: '20', first: '1', second: '2', third: '3', fourth: '4', fifth: '5', sixth: '6', seventh: '7', eighth: '8', ninth: '9', tenth: '10' };
function enNumbers(s: string): Set<string> {
  let t = s.toLowerCase().replace(/,/g, '')
    .replace(/\bone\s+and\s+a\s+half\b/g, ' 1.5 ').replace(/\b(half\s+a|a\s+half)\b/g, ' 0.5 ')
    .replace(/\bonce\b/g, ' 1 ').replace(/\btwice\b/g, ' 2 ').replace(/\bthrice\b/g, ' 3 ');
  t = t.replace(/\b([a-z]+)\b/g, (w) => WORD[w] ?? w);
  const o = new Set<string>();
  for (const n of t.match(/\d+(?:\.\d+)?/g) || []) { o.add(n); o.add(String(parseFloat(n))); }
  return o;
}
/** 수치 슬롯을 마스킹해 문장 템플릿을 만든다 */
const tpl = (s: string): string => s.replace(/\d+(?:[.,]\d+)?/g, '#').replace(/\s+/g, ' ').trim();

async function main(): Promise<void> {
  const tri: any[] = JSON.parse(fs.readFileSync(P('otc-en-residual-triage.ga.json'), 'utf8')).rows;
  const dmg = new Set<string>(((): string[] => {
    try { return JSON.parse(fs.readFileSync(P('otc-ko-canonical-damage-scan.ga.json'), 'utf8')).detail.map((d: any) => d.koId); } catch { return []; }
  })());
  const targets = tri.filter((r) => r.triage.startsWith('REAL_') && !dmg.has(r.koDescriptionId));

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5590', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');
  const ko = new Map<string, string>(), en = new Map<string, string>();
  const kid = targets.map((r) => r.koDescriptionId), eid = targets.map((r) => r.enDescriptionId);
  for (let i = 0; i < kid.length; i += 400) {
    for (const r of (await pool.query('SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])', [kid.slice(i, i + 400)])).rows) ko.set(r.id, r.content);
    for (const r of (await pool.query('SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])', [eid.slice(i, i + 400)])).rows) en.set(r.id, r.content);
  }
  await pool.end();

  const rows: any[] = [];
  const clusters = new Map<string, { template: string; docs: number; sample: string; lostKinds: Set<string> }>();
  for (const t of targets) {
    const koB = bodyText(ko.get(t.koDescriptionId) || ''), enB = bodyText(en.get(t.enDescriptionId) || '');
    const enSet = enNumbers(enB);
    /* 누락 수치를 담은 KO 문장만 고른다 */
    const missing: string[] = [];
    for (const s of koSentences(koB)) {
      const nums = [...new Set((s.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(/,/g, '')))];
      if (!nums.length) continue;
      const anyMissing = nums.some((n) => !enSet.has(n) && !enSet.has(String(parseFloat(n))));
      if (!anyMissing) continue;
      /* 범위 표기(쉼표) 해석 후에도 없는지 재확인 */
      const parts = (s.match(/\d+(?:[.,]\d+)?/g) || []).flatMap((x) => x.split(',')).filter(Boolean);
      if (parts.every((p) => enSet.has(p) || enSet.has(String(parseFloat(p))))) continue;
      missing.push(s);
    }
    if (!missing.length) continue;
    for (const s of missing.slice(0, 3)) {
      const k = tpl(s).slice(0, 120);
      const c = clusters.get(k) || { template: k, docs: 0, sample: s, lostKinds: new Set<string>() };
      c.docs++; for (const l of t.lost) c.lostKinds.add(String(l).replace(/[\d.,]/g, ''));
      clusters.set(k, c);
    }
    rows.push({ masterId: t.masterId, productName: t.productName, koDescriptionId: t.koDescriptionId,
      enDescriptionId: t.enDescriptionId, koHash: t.koHash, enHash: t.enHash, triage: t.triage,
      lost: t.lost, missingKoSentences: missing.slice(0, 3) });
  }
  const arr = [...clusters.values()].map((c) => ({ ...c, lostKinds: [...c.lostKinds].slice(0, 5) })).sort((a, b) => b.docs - a.docs);
  fs.writeFileSync(P('otc-en-omission-extract.ga.json'), JSON.stringify({
    targets: targets.length, docsWithMissingSentence: rows.length, distinctTemplates: arr.length,
    topTemplates: arr.slice(0, 40), rows,
  }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify({ targets: targets.length, docsWithMissingSentence: rows.length, distinctTemplates: arr.length,
    top: arr.slice(0, 12).map((c) => ({ docs: c.docs, t: c.template.slice(0, 80) })) }, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
