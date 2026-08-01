/**
 * 이번 세션에서 변경한 설명서의 **디자인·렌더 계약 검증** (READ-ONLY)
 *
 * 변경 대상(원장에서 수집): KO 원문 절단 복원 323 · EN 상한/중복 218 · EN route 2 ·
 * EN 누락 문형 복원 145 · EN 제품별 저작 18.
 *
 * sd-* 렌더 계약은 `store-desc-content` 스코프 CSS 가 담당하므로, 검증은 **구조 계약**으로 한다:
 *   · 필수 마커(sd-card·sd-hero·sd-body) 존재
 *   · 태그 균형 · 목록 항목이 <ul> 밖에 있지 않을 것 · 빈 항목 없음
 *   · 카드 타일 과다 길이(모바일 줄바꿈 붕괴 방지) — 타일은 짧게, 본문은 목록으로
 *   · 주의 목록 항목 수·길이 분포(복원으로 길어진 카드 확인)
 *   · 언어 오염(EN 에 한글 / KO 에 EN 전용 마커) 없음
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const J = (f: string): any => { try { return JSON.parse(fs.readFileSync(P(f), 'utf8')); } catch { return null; } };
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const cnt = (h: string, re: RegExp): number => (h.match(re) || []).length;

function collectIds(): { ko: string[]; en: string[] } {
  const ko = new Set<string>(), en = new Set<string>();
  for (const f of ['otc-ko-damage-restore-apply.ga.json', 'otc-ko-damage-restore-v2-apply.ga.json'])
    for (const p of (J(f)?.plans ?? [])) ko.add(p.koId);
  for (const [f, key] of [['otc-en-dose-limit-fix-apply.ga.json', 'enId'], ['otc-en-route2-fix-apply.ga.json', 'enId'],
    ['otc-en-omission-restore-apply.ga.json', 'enId'], ['otc-both18-en-restore-apply.ga.json', 'enId']] as const)
    for (const p of (J(f)?.plans ?? [])) if (p[key]) en.add(p[key]);
  return { ko: [...ko], en: [...en] };
}

function checkDoc(html: string, lang: 'ko' | 'en'): string[] {
  const bad: string[] = [];
  for (const m of ['sd-card', 'sd-hero', 'sd-body']) if (!html.includes(m)) bad.push(`MISSING_${m}`);
  for (const [o, c, n] of [[/<div[\s>]/g, /<\/div>/g, 'div'], [/<ul[\s>]/g, /<\/ul>/g, 'ul'],
    [/<li>/g, /<\/li>/g, 'li'], [/<p[\s>]/g, /<\/p>/g, 'p'], [/<h2>/g, /<\/h2>/g, 'h2']] as any)
    if (cnt(html, o) !== cnt(html, c)) bad.push(`UNBALANCED_${n}`);
  /* <li> 는 반드시 <ul> 안에 있어야 한다 */
  const liInUl = (html.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || []).reduce((a, u) => a + cnt(u, /<li>/g), 0);
  if (cnt(html, /<li>/g) !== liInUl) bad.push('LI_OUTSIDE_UL');
  /* 빈 항목 */
  if (/<li>\s*<\/li>/.test(html) || /<p[^>]*>\s*<\/p>/.test(html)) bad.push('EMPTY_NODE');
  /* 카드 타일 과다 길이 — 타일은 요약값이어야 한다 */
  for (const it of html.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || []) {
    const p = it.match(/<p>([\s\S]*?)<\/p>/); if (!p) continue;
    if (T(p[1]).length > 300) bad.push('TILE_TOO_LONG');
  }
  if (lang === 'en' && /[가-힣]/.test(html)) bad.push('HANGUL_IN_EN');
  if (lang === 'ko' && !/[가-힣]/.test(html)) bad.push('NO_HANGUL_IN_KO');
  return [...new Set(bad)];
}

async function main(): Promise<void> {
  const { ko, en } = collectIds();
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5620', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');
  const rows: any[] = [];
  for (const [ids, lang] of [[ko, 'ko'], [en, 'en']] as const)
    for (let i = 0; i < ids.length; i += 400)
      for (const r of (await pool.query(
        `SELECT id::text id, master_id::text mid, content, COALESCE(language,'ko') lg, status FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`,
        [ids.slice(i, i + 400)])).rows) rows.push({ ...r, expect: lang });
  await pool.end();

  const fails: any[] = [], liLen: number[] = [], liCount: number[] = [];
  const byCode: Record<string, number> = {};
  for (const r of rows) {
    const html = String(r.content);
    if (r.lg !== r.expect || r.status !== 'canonical') fails.push({ id: r.id, codes: ['STATE_UNEXPECTED'] });
    const bad = checkDoc(html, r.expect);
    if (bad.length) { fails.push({ id: r.id, lang: r.expect, codes: bad }); for (const b of bad) byCode[b] = (byCode[b] || 0) + 1; }
    const items = (html.match(/<li>([\s\S]*?)<\/li>/g) || []).map((x) => T(x));
    if (items.length) { liCount.push(items.length); for (const t of items) liLen.push(t.length); }
  }
  const pct = (a: number[], q: number): number => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
  const out = {
    checkedDocs: rows.length, koDocs: ko.length, enDocs: en.length,
    failures: fails.length, byCode,
    warnItemsPerDoc: { median: pct(liCount, 0.5), p90: pct(liCount, 0.9), max: Math.max(0, ...liCount) },
    warnItemLength: { median: pct(liLen, 0.5), p90: pct(liLen, 0.9), max: Math.max(0, ...liLen) },
    pass: fails.length === 0,
    sampleFailures: fails.slice(0, 20),
  };
  fs.writeFileSync(P('otc-modified-design-verify.ga.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify({ ...out, sampleFailures: out.sampleFailures.slice(0, 5) }, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
