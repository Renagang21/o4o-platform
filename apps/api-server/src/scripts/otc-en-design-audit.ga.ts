/**
 * OTC 영문 설명서 표준 디자인 적용 상태 조사 (READ-ONLY)
 *
 * 표준 디자인 = 저작기가 생산하는 `sd-*` 카드 계약. 렌더러(`store-desc-content` 스코프 CSS)는
 * 이 클래스 구조를 전제로 하므로, 구조가 빠지면 스타일이 적용되지 않는다.
 *
 * 필수 계약(KO 대응본이 갖고 있는 구조를 기준으로 한다 — 신설 요구가 아니다):
 *   sd-card > sd-hero(sd-badges·h1) + sd-body(sd-intro · h2 · sd-core[sd-item>sd-tag+p] · sd-warn · sd-foot)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');
const AUTHORED = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'o4o_drug_otc_topical'];
const cnt = (h: string, re: RegExp): number => (h.match(re) || []).length;

/** 문서가 표준 디자인 계약을 만족하는지 — KO 대응본을 기준으로 판정 */
function designGaps(en: string, ko: string): string[] {
  const g: string[] = [];
  if (!en.includes('sd-card')) g.push('NO_SD_CARD');
  if (!en.includes('sd-hero')) g.push('NO_SD_HERO');
  if (!en.includes('sd-body')) g.push('NO_SD_BODY');
  if (ko.includes('sd-badges') && !en.includes('sd-badges')) g.push('NO_SD_BADGES');
  if (ko.includes('sd-intro') && !en.includes('sd-intro')) g.push('NO_SD_INTRO');
  if (ko.includes('sd-core') && !en.includes('sd-core')) g.push('NO_SD_CORE');
  if (ko.includes('sd-warn') && !en.includes('sd-warn')) g.push('NO_SD_WARN');
  if (ko.includes('sd-foot') && !en.includes('sd-foot')) g.push('NO_SD_FOOT');
  if (ko.includes('sd-intake') && !en.includes('sd-intake')) g.push('NO_SD_INTAKE');
  if (cnt(ko, /<h2>/g) > 0 && cnt(en, /<h2>/g) === 0) g.push('NO_H2');
  if (!/<h1>/.test(en) && /<h1>/.test(ko)) g.push('NO_H1');
  /* sd-item 은 tag+p 쌍이어야 타일로 렌더된다 */
  for (const it of en.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || [])
    if (!/<span class="sd-tag">/.test(it) || !/<p>/.test(it)) { g.push('SD_ITEM_MALFORMED'); break; }
  /* 구조 붕괴 */
  for (const [o, c, n] of [[/<div[\s>]/g, /<\/div>/g, 'div'], [/<ul[\s>]/g, /<\/ul>/g, 'ul'],
    [/<li>/g, /<\/li>/g, 'li'], [/<p[\s>]/g, /<\/p>/g, 'p'], [/<h2>/g, /<\/h2>/g, 'h2']] as any)
    if (cnt(en, o) !== cnt(en, c)) { g.push(`UNBALANCED_${n}`); }
  if ((en.match(/<li>/g) || []).length !== (en.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || []).reduce((a, u) => a + cnt(u, /<li>/g), 0)) g.push('LI_OUTSIDE_UL');
  if (/<li>\s*<\/li>/.test(en) || /<p[^>]*>\s*<\/p>/.test(en)) g.push('EMPTY_NODE');
  if (/<style|style=/.test(en)) g.push('INLINE_STYLE');       // 렌더러 sanitizer 가 제거 → 디자인 의존 금지
  if (/<table[\s>]/i.test(en)) g.push('TABLE_FORBIDDEN');
  return [...new Set(g)];
}

async function main(): Promise<void> {
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5650', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');
  const rows = (await pool.query(
    `SELECT k.id::text "koId", k.content "koContent", k.master_id::text "masterId", pm.name "productName",
            k.source_type "sourceType", e.id::text "enId", e.content "enContent"
       FROM shared_product_descriptions k
       JOIN product_masters pm ON pm.id = k.master_id
       JOIN LATERAL (
         SELECT x.id, x.content FROM shared_product_descriptions x
          WHERE x.master_id=k.master_id AND x.source_type=k.source_type AND x.description_type='STORE'
            AND x.language='en' AND x.status='canonical' AND x.deleted_at IS NULL ORDER BY x.id LIMIT 1) e ON true
      WHERE k.deleted_at IS NULL AND k.description_type='STORE' AND k.status='canonical'
        AND COALESCE(k.language,'ko')='ko' AND k.source_type = ANY($1)
      ORDER BY k.master_id, k.id`, [AUTHORED])).rows as any[];
  await pool.end();

  const gaps: any[] = [];
  const byCode: Record<string, number> = {};
  const dist = { liPerDoc: [] as number[], liLen: [] as number[], tileLen: [] as number[], docLen: [] as number[] };
  for (const r of rows) {
    const en = String(r.enContent), ko = String(r.koContent);
    const g = designGaps(en, ko);
    dist.docLen.push(en.length);
    dist.liPerDoc.push(cnt(en, /<li>/g));
    for (const li of en.match(/<li>([\s\S]*?)<\/li>/g) || []) dist.liLen.push(li.replace(/<[^>]+>/g, '').length);
    for (const it of en.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || []) {
      const p = it.match(/<p>([\s\S]*?)<\/p>/); if (p) dist.tileLen.push(p[1].replace(/<[^>]+>/g, '').length);
    }
    if (g.length) { gaps.push({ enId: r.enId, koId: r.koId, masterId: r.masterId, productName: r.productName, sourceType: r.sourceType, enHash: md5(en), gaps: g }); for (const c of g) byCode[c] = (byCode[c] || 0) + 1; }
  }
  const pct = (a: number[], q: number): number => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
  const out = {
    population: rows.length, standardApplied: rows.length - gaps.length, gapsDocs: gaps.length, byCode,
    distribution: {
      liPerDoc: { median: pct(dist.liPerDoc, 0.5), p95: pct(dist.liPerDoc, 0.95), max: dist.liPerDoc.reduce((a,b)=>a>b?a:b,0) },
      liLen: { median: pct(dist.liLen, 0.5), p95: pct(dist.liLen, 0.95), max: dist.liLen.reduce((a,b)=>a>b?a:b,0) },
      tileLen: { median: pct(dist.tileLen, 0.5), p95: pct(dist.tileLen, 0.95), max: dist.tileLen.reduce((a,b)=>a>b?a:b,0) },
      docLen: { median: pct(dist.docLen, 0.5), p95: pct(dist.docLen, 0.95), max: dist.docLen.reduce((a,b)=>a>b?a:b,0) },
    },
    gapsSample: gaps.slice(0, 30),
  };
  fs.writeFileSync(P('otc-en-design-audit.ga.json'), JSON.stringify({ ...out, gaps }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
