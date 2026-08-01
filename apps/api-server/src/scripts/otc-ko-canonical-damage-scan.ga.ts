/**
 * OTC KO canonical 손상 조각 스캔 (READ-ONLY)
 *
 * HFF 트랙에서 "미확정 문구" 상위가 실은 **KO canonical 의 손상 조각**(예: `아연 : (`,
 * `정상적인 면역기능에 필요 (`, `* 비타민B1, (국문)`)으로 확인됐다.
 * 같은 유형이 OTC KO 에도 있는지, 그리고 그것이 EN "정보 누락" 판정의 원인인지 확인한다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const AUTHORED = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'o4o_drug_otc_topical'];
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** 문서에서 텍스트 단위(문단·목록항목·타일)를 뽑는다 */
function units(html: string): Array<{ kind: string; text: string }> {
  const out: Array<{ kind: string; text: string }> = [];
  const g = (re: RegExp, kind: string): void => { const m = html.match(re); if (m) for (const l of m[1].split(/<br\s*\/?>|\n/)) { const t = T(l); if (t) out.push({ kind, text: t }); } };
  g(/<p class="sd-intro">([\s\S]*?)<\/p>/, 'intro');
  g(/<p class="sd-intake">([\s\S]*?)<\/p>/, 'intake');
  for (const ul of html.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || [])
    for (const li of ul.match(/<li>([\s\S]*?)<\/li>/g) || []) { const t = T(li); if (t) out.push({ kind: 'warn:li', text: t }); }
  for (const it of html.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || []) {
    const tag = it.match(/<span class="sd-tag">([\s\S]*?)<\/span>/), p = it.match(/<p>([\s\S]*?)<\/p>/);
    if (tag && p) { const t = T(p[1]); if (t) out.push({ kind: `tile:${T(tag[1])}`, text: t }); }
  }
  return out;
}

/** 손상 서명 — HFF 에서 확인된 유형 + 일반적 파편 */
function damage(t: string): string[] {
  const d: string[] = [];
  const open = (t.match(/[(（]/g) || []).length, close = (t.match(/[)）]/g) || []).length;
  if (open > close) d.push('UNBALANCED_PAREN_OPEN');
  if (close > open) d.push('UNBALANCED_PAREN_CLOSE');
  if (/[(:,·]\s*$/.test(t)) d.push('ENDS_WITH_PUNCT_FRAGMENT');     // "아연 : (" 형태
  if (/^\s*[*※·]/.test(t)) d.push('LEADING_MARKER');                 // "* 비타민B1"
  if (/\((국문|영문|한글)\)/.test(t)) d.push('LANG_MARKER_LEFTOVER');
  if (/[가-힣]\s*:\s*\($/.test(t)) d.push('LABEL_COLON_OPEN');
  /* 짧은 값 자체는 결함이 아니다 — "파프(카타플라스마)" 같은 정상 제형명이 다수(실측 861 중 대부분).
     **매달린 구두점으로 끝나는** 짧은 조각만 손상으로 본다. */
  if (t.length <= 12 && /[:(,·]\s*$/.test(t)) d.push('TOO_SHORT_FRAGMENT');
  return d;
}

async function main(): Promise<void> {
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5584', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');
  const rows = (await pool.query(
    `SELECT k.id::text id, k.master_id::text mid, pm.name pname, k.source_type st, k.content
       FROM shared_product_descriptions k JOIN product_masters pm ON pm.id=k.master_id
      WHERE k.deleted_at IS NULL AND k.description_type='STORE' AND k.status='canonical'
        AND COALESCE(k.language,'ko')='ko' AND k.source_type = ANY($1)
      ORDER BY k.master_id, k.id`, [AUTHORED])).rows as any[];
  await pool.end();

  const byCode: Record<string, number> = {}, docsByCode: Record<string, Set<string>> = {};
  const samples: Record<string, string[]> = {};
  const damagedDocs = new Set<string>();
  const detail: any[] = [];
  for (const r of rows) {
    const hits: any[] = [];
    for (const u of units(String(r.content))) {
      const d = damage(u.text);
      if (!d.length) continue;
      hits.push({ kind: u.kind, text: u.text.slice(0, 120), codes: d });
      for (const c of d) {
        byCode[c] = (byCode[c] || 0) + 1;
        (docsByCode[c] ||= new Set()).add(r.id);
        (samples[c] ||= []).length < 4 && samples[c].push(`[${u.kind}] ${u.text.slice(0, 90)}`);
      }
    }
    if (hits.length) { damagedDocs.add(r.id); detail.push({ koId: r.id, masterId: r.mid, productName: r.pname, sourceType: r.st, hits: hits.slice(0, 5) }); }
  }

  /* triage 의 "실제 누락" 판정과 교차 */
  let cross: any = null;
  try {
    const tri = JSON.parse(fs.readFileSync(path.join(DATA, 'otc-en-residual-triage.ga.json'), 'utf8')).rows as any[];
    const real = tri.filter((x) => x.triage.startsWith('REAL_'));
    cross = {
      realTotal: real.length,
      realWithDamagedKo: real.filter((x) => damagedDocs.has(x.koDescriptionId)).length,
      realCleanKo: real.filter((x) => !damagedDocs.has(x.koDescriptionId)).length,
    };
  } catch { /* skip */ }

  const out = {
    scannedDocs: rows.length, damagedDocs: damagedDocs.size,
    occurrencesByCode: byCode,
    docsByCode: Object.fromEntries(Object.entries(docsByCode).map(([k, v]) => [k, v.size])),
    samples, crossWithTriage: cross,
  };
  fs.writeFileSync(path.join(DATA, 'otc-ko-canonical-damage-scan.ga.json'), JSON.stringify({ ...out, detail }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
