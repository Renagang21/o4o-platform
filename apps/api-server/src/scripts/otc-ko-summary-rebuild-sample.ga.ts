/**
 * WO-O4O-OTC-KO-SUMMARY-HARDCUT-CENSUS-AND-CARD-REBUILD-V1
 *   — 대표 샘플 검증기 (READ-ONLY · DB write 0)
 *
 * plan 원장에서 결함 유형·경로를 고르게 덮는 대표 샘플을 뽑아
 * 기존/새 요약 · 효능 원문 첫 줄 · 교체 지점 · 줄바꿈 폭(모바일 360 / 태블릿 768)을 함께 산출한다.
 *
 * 한국어 전용 판정:
 *   - 종결: `다.` `요.` 등 — 문장 종결부호 + 닫는 괄호 허용
 *   - 어절 중간 절단: 절단 지점 양쪽이 모두 비공백
 *   - 새 요약은 원문 첫 줄의 **접두 확장**이어야 하며 원문 밖 문자를 포함할 수 없다.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-ko-summary-rebuild-sample.ga.ts [--port 5495] [--n 40]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { splitCompleteSentences } from './otc-leaflet-summary.shared.js';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const PLAN = path.join(DATA_DIR, 'otc-ko-summary-rebuild-plan.ga.json');
const OUT = path.join(DATA_DIR, 'otc-ko-summary-rebuild-sample.ga.json');
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);

const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const introFirstLine = (html: string): string => {
  const m = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  return m ? unesc(m[1].split('<br>')[0].split('\n')[0]).trim() : '';
};
const KO_TERMINATOR = /[.!?。！？][)\]"'”’）］」』]?$/;
/** 근사 줄 수 — 한글은 폭이 넓다(12.5px 본문 ≈ 12.5px/자, 태블릿 13.5px) */
const lines = (s: string, widthPx: number, charPx: number): number => Math.ceil(s.length / Math.max(1, Math.floor(widthPx / charPx)));

/** 결함 유형 태그 */
function classify(old: string, line: string, next: string): string[] {
  const t: string[] = [];
  const cutNext = line[old.length] || '';
  const cutPrev = old[old.length - 1] || '';
  t.push(/\S/.test(cutNext) && /\S/.test(cutPrev) ? 'MID_WORD' : 'BOUNDARY_CUT');
  if (splitCompleteSentences(next).length > 1) t.push('MULTI_SENTENCE');
  // 괄호가 열린 채로 끊긴 것 — 병기 표현이 반쪽만 노출된 사례
  const opens = (old.match(/[(（]/g) || []).length, closes = (old.match(/[)）]/g) || []).length;
  if (opens > closes) t.push('OPEN_PAREN');
  if (/\d/.test(next)) t.push('NUMERIC');
  if (/(세|개월|이상|미만|이하|주간|일간|회|분)/.test(next)) t.push('AGE_DURATION');
  if (/,\s*\S+,\s*\S+/.test(next)) t.push('LIST');
  if (next.length >= 250) t.push('VERY_LONG');
  if (/[·ㆍ‧]/.test(next)) t.push('MIDDLE_DOT');
  return t;
}

async function main(): Promise<void> {
  const want = parseInt(arg('--n') || '40', 10);
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const rows: any[] = plan.rows;

  const pool = new Pool({ host: '127.0.0.1', port: port(), user: 'o4o_api', database: 'o4o_platform', max: 4 });
  await pool.query('SET default_transaction_read_only = on');

  // 경로별 · 유형별로 고르게 덮도록 결정론적으로 선택(masterId 정렬 기준)
  const sorted = [...rows].sort((a, b) => a.masterId.localeCompare(b.masterId));
  const picked = new Map<string, any>();
  const byRoute = new Map<string, any[]>();
  for (const r of sorted) { const k = r.route || 'null'; if (!byRoute.has(k)) byRoute.set(k, []); byRoute.get(k)!.push(r); }
  for (const [, list] of byRoute) for (const r of list.slice(0, 4)) picked.set(r.masterId, r);
  const tagCount = new Map<string, number>();
  for (const r of sorted) {
    for (const t of classify(r.oldSummary, r.newSummary, r.newSummary)) {
      if ((tagCount.get(t) || 0) >= 4) continue;
      tagCount.set(t, (tagCount.get(t) || 0) + 1);
      picked.set(r.masterId, r);
    }
    if (picked.size >= want) break;
  }
  for (const r of sorted) { if (picked.size >= want) break; picked.set(r.masterId, r); }
  const sample = [...picked.values()].slice(0, want);

  const ids = sample.map((s) => s.masterId);
  const intro = new Map<string, string>();
  for (const r of (await pool.query(
    `SELECT master_id::text, content FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND deleted_at IS NULL AND description_type='STORE'
        AND source_type='mfds_drug_otc' AND status='canonical' AND COALESCE(language,'ko')='ko'`, [ids])).rows as any[]) intro.set(r.master_id, introFirstLine(r.content));
  const name = new Map<string, string>();
  for (const r of (await pool.query(`SELECT id::text, name FROM product_masters WHERE id=ANY($1::uuid[])`, [ids])).rows as any[]) name.set(r.id, r.name);
  await pool.end();

  const out = sample.map((s) => {
    const line = intro.get(s.masterId) ?? '';
    return {
      masterId: s.masterId, productName: name.get(s.masterId) ?? null, route: s.route,
      tags: classify(s.oldSummary, line, s.newSummary),
      efficacyFirstLine: line,
      oldSummary: s.oldSummary, newSummary: s.newSummary,
      lenOld: s.lenOld, lenNew: s.lenNew,
      endsAtSentence: KO_TERMINATOR.test(s.newSummary),
      oldIsPrefixOfNew: s.newSummary.startsWith(s.oldSummary),
      /** 새 요약이 원문 첫 줄 안에 그대로 들어있는가 — 원문에 없는 문자 추가 0 의 증명 */
      newIsSubstringOfSource: line.startsWith(s.newSummary),
      addedTail: s.newSummary.slice(s.oldSummary.length),
      parenBalanced: (s.newSummary.match(/[(（]/g) || []).length === (s.newSummary.match(/[)）]/g) || []).length,
      wrap: { mobile360: lines(s.newSummary, 360 - 44, 12.5), tablet768: lines(s.newSummary, 768 - 68, 13.5) },
      replacedAt: ['sd-hero .sd-badge', '한눈에 보기 `작용` 타일'],
    };
  });

  fs.writeFileSync(OUT, JSON.stringify({ wo: plan.wo, kind: 'sample-verification', total: out.length, planDigest: plan.planDigest, samples: out }, null, 2) + '\n', 'utf8');
  const bad = out.filter((o) => !o.endsAtSentence || !o.oldIsPrefixOfNew || !o.newIsSubstringOfSource || !o.parenBalanced);
  console.log(JSON.stringify({
    sampled: out.length,
    byRoute: out.reduce((a: any, o) => (a[o.route || 'null'] = (a[o.route || 'null'] || 0) + 1, a), {}),
    byTag: out.flatMap((o) => o.tags).reduce((a: any, t) => (a[t] = (a[t] || 0) + 1, a), {}),
    endsAtSentence: out.filter((o) => o.endsAtSentence).length,
    oldIsPrefixOfNew: out.filter((o) => o.oldIsPrefixOfNew).length,
    newIsSubstringOfSource: out.filter((o) => o.newIsSubstringOfSource).length,
    parenBalanced: out.filter((o) => o.parenBalanced).length,
    maxMobileLines: Math.max(...out.map((o) => o.wrap.mobile360)),
    maxTabletLines: Math.max(...out.map((o) => o.wrap.tablet768)),
    anomalies: bad.map((b) => ({ masterId: b.masterId, ends: b.endsAtSentence, prefix: b.oldIsPrefixOfNew, sub: b.newIsSubstringOfSource, paren: b.parenBalanced })),
  }, null, 2));
  for (const o of out.slice(0, 8)) console.log(`\n[${o.route}] ${o.productName}\n  OLD: ${o.oldSummary}\n  NEW: ${o.newSummary}`);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
