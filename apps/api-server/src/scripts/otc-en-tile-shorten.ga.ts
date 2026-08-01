/**
 * [RETIRED — 생산 규칙 아님]
 *
 * 정책 정정(2026-08): OTC 영문 설명서에는 문서·본문·카드·타일의 **글자 수 제한을 두지 않는다.**
 * 300자 초과는 결함이 아니며 축약·절단·요약하지 않는다. 길이는 콘텐츠 속성이고
 * 표시 책임은 렌더러(CSS 줄바꿈·높이 확장)에 있다.
 *
 * 이 스크립트는 그 정정 **이전**에 작성된 타일 축약 시도이며 실행하지 않는다.
 * 실제로도 dry-run planned 0 이었다(전건 첫 문장 자체가 300자 초과 → 안전한 축약 불가).
 * 기록 목적으로만 남긴다. 길이 관련 검증은 `otc-en-render-nolimit-verify.ga.ts` 를 쓴다.
 */
/**
 * OTC 영문 카드 타일 표준화 — 과다 길이 타일을 **문장 경계로** 줄인다 (dry-run / apply)
 *
 * 표준 디자인에서 `sd-core > sd-item` 은 카드의 요약 타일이다. 본문이 통째로 들어가면
 * 모바일 카드가 무너진다(실측: 타일 텍스트 중앙값 56자, 상위 583건이 300자 초과, 최대 900자).
 *
 * 규칙 — 요약 하드컷 교정에서 검증된 것과 동일한 축을 쓴다:
 *   · **첫 완결 문장**만 남긴다. 문장 중간 절단은 하지 않는다.
 *   · 첫 문장이 여전히 300자를 넘으면 손대지 않는다(임의 절단 금지 → 검토).
 *   · 타일 텍스트는 본문(sd-intro 등)에 이미 존재하므로 정보 손실이 아니다 — 그 점을 건별로 증명한다.
 *   · 허용 변경은 해당 타일 `<p>` 한 곳뿐. 역패치 byte 일치로 그 외 변경 0 을 증명한다.
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
const APPLY = process.argv.includes('--apply') && process.env.OTC_EN_TILE_FIX === 'CONFIRM';
const AUTHORED = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'o4o_drug_otc_topical'];
const LIMIT = 300;
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** 영어 첫 완결 문장 — 괄호 안 종결부호·소수점·약어는 경계가 아니다 */
function firstSentence(t: string): string {
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (/[.!?]/.test(c) && depth === 0) {
      const prev = t[i - 1] || '', next = t[i + 1] || ' ';
      if (c === '.' && /\d/.test(prev) && /\d/.test(next)) continue;
      if (c === '.' && /\b[A-Z]$/.test(t.slice(0, i))) continue;
      if (next && !/\s/.test(next)) continue;
      return t.slice(0, i + 1).trim();
    }
  }
  return t.trim();
}

async function main(): Promise<void> {
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5650', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  const rows = (await pool.query(
    `SELECT id::text id, master_id::text mid, content, md5(content) h FROM shared_product_descriptions
      WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND language='en'
        AND source_type = ANY($1)`, [AUTHORED])).rows as any[];

  const plans: any[] = [], skips: any[] = [];
  for (const r of rows) {
    const before = String(r.content);
    let next = before; const acts: any[] = [];
    for (const item of before.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || []) {
      const tag = item.match(/<span class="sd-tag">([\s\S]*?)<\/span>/);
      const pm = item.match(/<p>([\s\S]*?)<\/p>/);
      if (!tag || !pm) continue;
      const raw = pm[1], cur = T(raw);
      if (cur.length <= LIMIT) continue;
      const first = firstSentence(cur);
      if (!first || first.length > LIMIT) { skips.push({ id: r.id, code: 'FIRST_SENTENCE_STILL_LONG', tag: T(tag[1]), len: first.length }); continue; }
      if (first.length >= cur.length) continue;
      /* 정보 손실 아님을 증명: 줄인 뒤 잘려나간 부분이 본문(intro/intake/warn)에 존재해야 한다 */
      const body = T((before.match(/<p class="sd-intro">[\s\S]*?<\/p>/) || [''])[0]
        + (before.match(/<p class="sd-intake">[\s\S]*?<\/p>/) || [''])[0]
        + (before.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || []).join(' '));
      if (!body.includes(cur.slice(0, Math.min(120, cur.length)))) { skips.push({ id: r.id, code: 'NOT_DUPLICATED_IN_BODY', tag: T(tag[1]) }); continue; }
      const oldP = `<p>${raw}</p>`;
      if (next.split(oldP).length - 1 !== 1) { skips.push({ id: r.id, code: 'TILE_NOT_UNIQUE' }); continue; }
      const newP = `<p>${first.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
      next = next.replace(oldP, newP);
      acts.push({ tag: T(tag[1]), before: cur.length, after: first.length, oldP, newP });
    }
    if (!acts.length) continue;
    /* 역패치 byte 증명 */
    let back = next;
    for (const a of acts) back = back.replace(a.newP, a.oldP);
    if (back !== before) { skips.push({ id: r.id, code: 'REVERSE_PATCH_MISMATCH' }); continue; }
    if ((next.match(/<div class="sd-item">/g) || []).length !== (before.match(/<div class="sd-item">/g) || []).length) { skips.push({ id: r.id, code: 'TILE_COUNT_CHANGED' }); continue; }
    if (/[가-힣]/.test(next)) { skips.push({ id: r.id, code: 'HANGUL_IN_EN' }); continue; }
    plans.push({ enId: r.id, masterId: r.mid, oldHash: r.h, newHash: md5(next), newContent: next, tiles: acts.map(({ oldP, newP, ...a }) => a) });
  }

  const results: any[] = [];
  if (APPLY) for (const p of plans) {
    const q = await pool.query(
      `UPDATE shared_product_descriptions SET content=$2, updated_at=now()
        WHERE id=$1::uuid AND language='en' AND status='canonical' AND description_type='STORE'
          AND deleted_at IS NULL AND md5(content)=$3 RETURNING id`, [p.enId, p.newContent, p.oldHash]);
    results.push({ enId: p.enId, status: q.rowCount === 1 ? 'GREEN' : 'CONCURRENT_CHANGE_DETECTED' });
  }
  await pool.end();
  const summary = { mode: APPLY ? 'APPLY' : 'dry-run', scanned: rows.length, planned: plans.length,
    tilesShortened: plans.reduce((a, p) => a + p.tiles.length, 0),
    skipped: skips.length, skipByCode: skips.reduce((a: any, s) => { a[s.code] = (a[s.code] || 0) + 1; return a; }, {}),
    green: results.filter((r) => r.status === 'GREEN').length,
    concurrent: results.filter((r) => r.status !== 'GREEN').length };
  fs.writeFileSync(P(`otc-en-tile-shorten-${APPLY ? 'apply' : 'dryrun'}.ga.json`),
    JSON.stringify({ summary, plans: plans.map(({ newContent, ...p }) => p), skips: skips.slice(0, 200), results }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
