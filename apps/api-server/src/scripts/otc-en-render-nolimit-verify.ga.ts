/**
 * OTC 영문 설명서 — **글자 수 제한 없음** 원칙 검증 (READ-ONLY)
 *
 * 정책(정정): 문서·본문·카드·타일에 글자 수 상한을 두지 않는다.
 *   300자 초과를 오류·축약 대상으로 분류하지 않으며 문장 절단·요약을 하지 않는다.
 *   길이는 **콘텐츠 속성**이고, 표시 책임은 렌더러(CSS)에 있다.
 *
 * 따라서 검사 대상은 두 가지뿐이다.
 *   ① 콘텐츠: HTML 구조가 렌더 가능한가(길이는 보지 않는다)
 *   ② 렌더러: 내용을 **잘라내는 CSS**가 있는가
 *      — text-overflow:ellipsis · -webkit-line-clamp · 고정 height · max-height
 *      — overflow:hidden 이 **높이 고정과 함께** 쓰이면 세로 잘림이 된다(단독이면 아님)
 *      — white-space:nowrap 이 긴 텍스트에 걸리면 가로 잘림이 된다
 *
 * 잘라내는 규칙이 발견되면 공통 렌더러를 고쳐야 한다(콘텐츠를 줄이지 않는다).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const AUTHORED = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'o4o_drug_otc_topical'];
const RENDERER = path.resolve(process.cwd(), '../../packages/content-editor/src/components/ContentRenderer.tsx');
const T = (h: string): string => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** 렌더러 CSS 에서 **내용을 잘라내는** 선언만 추출한다 */
function scanRendererForClipping(css: string): { risks: any[]; wrapGuards: string[] } {
  const risks: any[] = [], wrapGuards: string[] = [];
  const rules = css.split('\n').filter((l) => l.includes('.store-desc-content'));
  for (const line of rules) {
    const hit: string[] = [];
    if (/text-overflow\s*:\s*ellipsis/.test(line)) hit.push('TEXT_OVERFLOW_ELLIPSIS');
    if (/-webkit-line-clamp/.test(line)) hit.push('LINE_CLAMP');
    if (/max-height\s*:\s*(?!none)/.test(line)) hit.push('MAX_HEIGHT');
    /* height 고정(auto/100%/0/보더용 3px 등 장식 제외) */
    const h = line.match(/[^-]height\s*:\s*([^;}]+)/);
    if (h && !/auto|100%|inherit|unset/.test(h[1])) {
      const isDecoration = /::after|::before|\.sd-body h2|li::before|sd-warn li::before/.test(line);
      if (!isDecoration) hit.push(`FIXED_HEIGHT(${h[1].trim()})`);
    }
    if (/white-space\s*:\s*nowrap/.test(line)) hit.push('NOWRAP');
    if (hit.length) risks.push({ selectorLine: line.trim().slice(0, 160), flags: hit });
    if (/overflow-wrap\s*:\s*(anywhere|break-word)|word-break|white-space\s*:\s*normal/.test(line)) wrapGuards.push(line.trim().slice(0, 120));
  }
  return { risks, wrapGuards };
}

async function main(): Promise<void> {
  const css = fs.readFileSync(RENDERER, 'utf8');
  const rendererScan = scanRendererForClipping(css);

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5656', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');
  const rows = (await pool.query(
    `SELECT e.id::text id, pm.name nm, e.content FROM shared_product_descriptions e
       JOIN product_masters pm ON pm.id = e.master_id
      WHERE e.deleted_at IS NULL AND e.description_type='STORE' AND e.status='canonical'
        AND e.language='en' AND e.source_type = ANY($1)`, [AUTHORED])).rows as any[];
  await pool.end();

  /* 콘텐츠: 길이는 보지 않고 렌더 가능성만 본다 */
  let structOk = 0; const structBad: any[] = [];
  const metrics = rows.map((r) => {
    const c = String(r.content);
    const li = (c.match(/<li>([\s\S]*?)<\/li>/g) || []).map(T);
    const tiles = (c.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || [])
      .map((x) => { const p = x.match(/<p>([\s\S]*?)<\/p>/); return p ? T(p[1]).length : 0; });
    const bad: string[] = [];
    for (const [o, cl, n] of [[/<div[\s>]/g, /<\/div>/g, 'div'], [/<ul[\s>]/g, /<\/ul>/g, 'ul'], [/<li>/g, /<\/li>/g, 'li'], [/<p[\s>]/g, /<\/p>/g, 'p']] as any)
      if ((c.match(o) || []).length !== (c.match(cl) || []).length) bad.push(`UNBALANCED_${n}`);
    if (!c.includes('sd-card')) bad.push('NO_SD_CARD');
    if (/<style|style=/.test(c)) bad.push('INLINE_STYLE');
    if (bad.length) structBad.push({ id: r.id, nm: r.nm, bad }); else structOk++;
    return { id: r.id, nm: r.nm, docLen: c.length, liN: li.length,
      liMax: li.reduce((a, b) => Math.max(a, b.length), 0),
      tileMax: tiles.reduce((a, b) => Math.max(a, b), 0), c };
  });

  const top = (k: 'docLen' | 'liN' | 'liMax' | 'tileMax'): any =>
    metrics.reduce((a, b) => (b[k] > a[k] ? b : a));
  const cases = [
    { label: '최장 문서', d: top('docLen') }, { label: '주의 항목 최다', d: top('liN') },
    { label: '최장 항목', d: top('liMax') }, { label: '최장 타일', d: top('tileMax') },
  ];
  /* 타일 300자 초과 상위 3건도 함께 렌더 확인(축약 대상이 아니라 표시 확인 대상) */
  for (const d of metrics.filter((m) => m.tileMax > 300).sort((a, b) => b.tileMax - a.tileMax).slice(1, 4))
    cases.push({ label: `장문 타일 ${d.tileMax}자`, d });

  const style = (css.match(/`([\s\S]*\.store-desc-content[\s\S]*?)`/) || [])[1] || '';
  const html = `<!doctype html><meta charset="utf-8"><title>OTC EN — no length limit render check</title>
<style>${style}</style>
<body style="margin:0;padding:16px;background:#f4f6f8">
<p style="font:600 13px system-ui;color:#334">글자 수 제한 없음 원칙 검증 — 아래 카드가 잘리지 않고 전부 표시되어야 한다.</p>
${cases.map((c) => `<h3 style="font:600 14px system-ui">${c.label} — ${c.d.nm} (len ${c.d.docLen} · li ${c.d.liN} · liMax ${c.d.liMax} · tileMax ${c.d.tileMax})</h3>
<div class="store-desc-content" style="max-width:420px;margin:0 0 28px">${c.d.c}</div>`).join('\n')}
</body>`;
  fs.writeFileSync('C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/3a791f59-65d1-4486-8192-9f94189dd50c/scratchpad/otc-render-nolimit.html', html, 'utf8');

  const out = {
    policy: 'NO_LENGTH_LIMIT — 길이는 결함이 아니며 축약·절단하지 않는다',
    population: rows.length, structureOk: structOk, structureBad: structBad.length, structureBadSample: structBad.slice(0, 10),
    tilesOver300: metrics.filter((m) => m.tileMax > 300).length,
    tilesOver300Handling: '축약하지 않음 — 원문 보존. 렌더 표시만 확인',
    lengthExtremes: {
      docLen: top('docLen').docLen, liPerDoc: top('liN').liN, liLen: top('liMax').liMax, tileLen: top('tileMax').tileMax,
    },
    rendererClippingRisks: rendererScan.risks,
    rendererWrapGuards: rendererScan.wrapGuards,
    rendererVerdict: rendererScan.risks.length === 0 ? 'NO_CLIPPING_RULE' : 'CLIPPING_RULE_FOUND',
    renderPreview: 'scratchpad/otc-render-nolimit.html',
    renderCases: cases.map((c) => ({ label: c.label, enId: c.d.id, product: c.d.nm, docLen: c.d.docLen, liN: c.d.liN, liMax: c.d.liMax, tileMax: c.d.tileMax })),
  };
  fs.writeFileSync(P('otc-en-render-nolimit-verify.ga.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
