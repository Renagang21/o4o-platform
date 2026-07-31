/**
 * WO-O4O-OTC-EN-SUMMARY-HARDCUT-REMOVAL-AND-2522-CARD-REBUILD-V1
 *   — 대표 샘플 검증기 (READ-ONLY · DB write 0)
 *
 * plan 원장에서 결함 유형·경로를 고르게 덮는 대표 샘플을 뽑아
 * 기존/새 요약 · KO 효능 첫 줄 · HTML 교체 지점 · 줄바꿈 폭(모바일 360 / 태블릿 768)을 함께 산출한다.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-en-summary-rebuild-sample.ga.ts [--port 5495] [--n 40]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { splitCompleteSentences } from './otc-leaflet-summary.shared.js';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const PLAN = path.join(DATA_DIR, 'otc-en-summary-rebuild-plan.ga.json');
const OUT = path.join(DATA_DIR, 'otc-en-summary-rebuild-sample.ga.json');
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);

const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const koIntro = (html: string): string => {
  const m = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  return m ? unesc(m[1].split('<br>')[0].split('\n')[0]).trim() : '';
};
/** 근사 줄 수 — 폭 px / 문자당 평균 px(12.5px 본문 기준 ≈ 6.6px, 태블릿 13.5px ≈ 7.1px) */
const lines = (s: string, widthPx: number, charPx: number): number => Math.ceil(s.length / Math.max(1, Math.floor(widthPx / charPx)));

/** 결함 유형 태그 */
function classify(old: string, next: string): string[] {
  const t: string[] = [];
  if (/\w$/.test(old) && /\w/.test(next[old.length] || '')) t.push('MID_WORD');
  else t.push('BOUNDARY_CUT');
  if (splitCompleteSentences(next).length > 1) t.push('MULTI_SENTENCE');
  if (/\(/.test(old) && !/\)/.test(old)) t.push('OPEN_PAREN');
  if (/\d/.test(next)) t.push('NUMERIC');
  if (/\b(year|years|month|months|age|aged|day|days|week|weeks)\b/i.test(next)) t.push('AGE_DURATION');
  if (/,\s\w+,\s\w+/.test(next)) t.push('LIST');
  if (next.length >= 400) t.push('VERY_LONG');
  if (/[a-z]{12,}/i.test(next)) t.push('LONG_TERM');
  return t;
}

async function main(): Promise<void> {
  const want = parseInt(arg('--n') || '40', 10);
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const rows: any[] = plan.rows;

  // 경로별 최소 2건 + 유형별 최소 2건이 되도록 결정론적으로 선택(masterId 정렬 기준)
  const sorted = [...rows].sort((a, b) => a.masterId.localeCompare(b.masterId));
  const picked = new Map<string, any>();
  const byRoute = new Map<string, any[]>();
  for (const r of sorted) { const k = r.route || 'null'; if (!byRoute.has(k)) byRoute.set(k, []); byRoute.get(k)!.push(r); }
  for (const [, list] of byRoute) for (const r of list.slice(0, 3)) picked.set(r.masterId, r);
  const tagCount = new Map<string, number>();
  for (const r of sorted) {
    const tags = classify(r.oldSummary, r.newSummary);
    for (const t of tags) {
      if ((tagCount.get(t) || 0) >= 3) continue;
      tagCount.set(t, (tagCount.get(t) || 0) + 1);
      picked.set(r.masterId, r);
    }
    if (picked.size >= want) break;
  }
  for (const r of sorted) { if (picked.size >= want) break; picked.set(r.masterId, r); }
  const sample = [...picked.values()].slice(0, want);

  const pool = new Pool({ host: '127.0.0.1', port: port(), user: 'o4o_api', database: 'o4o_platform', max: 4 });
  const ids = sample.map((s) => s.masterId);
  const ko = new Map<string, string>();
  for (const r of (await pool.query(
    `SELECT master_id::text, content FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND deleted_at IS NULL AND description_type='STORE'
        AND source_type='mfds_drug_otc' AND status='canonical' AND COALESCE(language,'ko')='ko'`, [ids])).rows as any[]) ko.set(r.master_id, koIntro(r.content));
  const name = new Map<string, string>();
  for (const r of (await pool.query(`SELECT id::text, name FROM product_masters WHERE id=ANY($1::uuid[])`, [ids])).rows as any[]) name.set(r.id, r.name);
  await pool.end();

  const out = sample.map((s) => ({
    masterId: s.masterId, productName: name.get(s.masterId) ?? null, route: s.route,
    tags: classify(s.oldSummary, s.newSummary),
    koEfficacyFirstLine: ko.get(s.masterId) ?? null,
    oldSummary: s.oldSummary, newSummary: s.newSummary,
    lenOld: s.lenOld, lenNew: s.lenNew,
    endsAtSentence: /[.!?。！？]$/.test(s.newSummary),
    oldIsPrefixOfNew: s.newSummary.startsWith(s.oldSummary),
    addedTail: s.newSummary.slice(s.oldSummary.length),
    wrap: { mobile360: lines(s.newSummary, 360 - 44, 6.6), tablet768: lines(s.newSummary, 768 - 68, 7.1) },
    replacedAt: ['sd-hero .sd-badge', 'At a glance "How it works" tile'],
  }));

  fs.writeFileSync(OUT, JSON.stringify({ wo: plan.wo, kind: 'sample-verification', total: out.length, planDigest: plan.planDigest, samples: out }, null, 2) + '\n', 'utf8');
  const bad = out.filter((o) => !o.endsAtSentence || !o.oldIsPrefixOfNew);
  console.log(JSON.stringify({
    sampled: out.length,
    byRoute: out.reduce((a: any, o) => (a[o.route || 'null'] = (a[o.route || 'null'] || 0) + 1, a), {}),
    byTag: out.flatMap((o) => o.tags).reduce((a: any, t) => (a[t] = (a[t] || 0) + 1, a), {}),
    endsAtSentence: out.filter((o) => o.endsAtSentence).length,
    oldIsPrefixOfNew: out.filter((o) => o.oldIsPrefixOfNew).length,
    maxMobileLines: Math.max(...out.map((o) => o.wrap.mobile360)),
    maxTabletLines: Math.max(...out.map((o) => o.wrap.tablet768)),
    anomalies: bad.map((b) => b.masterId),
  }, null, 2));
  for (const o of out.slice(0, 8)) console.log(`\n[${o.route}] ${o.productName}\n  OLD: ${o.oldSummary}\n  NEW: ${o.newSummary}`);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
