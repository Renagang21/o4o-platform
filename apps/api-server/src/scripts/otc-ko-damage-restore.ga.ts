/**
 * OTC KO canonical 손상 조각 복원 (dry-run / apply)
 *
 * ── 원문 재적재 기준 (본 실행에서 확정) ──────────────────────────────────────
 * 1. 복원 근거는 공식 원문(e약은요 `mfds_easy_drug`)뿐이다. 새 의학 문장을 만들지 않는다.
 * 2. 손상 단위(열린 괄호 잔존·구두점 절단)가 **공식 원문 정규화 텍스트의 진접두**임을 건별로 증명한다.
 *    증명되지 않으면 손대지 않는다.
 * 3. **잘린 문장만 완성하고 끝내지 않는다.** 안전 섹션에서 뒤따르는 원문 문장을 누락하면
 *    같은 결함이 남는다(CLAUDE.md 콘텐츠 원칙: 효능·용법·금기·주의사항 누락 금지).
 *    → 절단 지점 이후의 원문을 **끝까지** 복원한다.
 * 4. 가독성은 삭제가 아니라 **분할**로 해결한다. 복원분은 문장 단위로 쪼개
 *    `<li>` 여러 개로 넣는다(sd-warn 은 항목당 한 줄로 렌더된다).
 * 5. 수치·단위·연령·기간은 원문 값을 그대로 옮긴다(재작성·환산 금지).
 * 6. 손상 단위 외 본문은 byte 불변임을 증명한다.
 *
 * 모드: (기본) dry-run · --apply (+ env OTC_KO_DAMAGE_FIX=CONFIRM)
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
const APPLY = process.argv.includes('--apply') && process.env.OTC_KO_DAMAGE_FIX === 'CONFIRM';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/* 공식 원문 파싱 — 저작기와 동일 규약 */
function sections(c: string): Record<string, string> {
  const o: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null; while ((m = re.exec(c))) o[m[1].trim()] = m[2].trim(); return o;
}
function normalize(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
/** 한국어 문장 분해 — `마십시오.이 약을` 처럼 공백 없이 이어진다 */
function koSentences(t: string): string[] {
  const out: string[] = []; let s = 0;
  for (let i = 0; i < t.length; i++) {
    if (!/[.!?]/.test(t[i])) continue;
    const prev = t[i - 1] || '', next = t[i + 1] || ' ';
    if (/\d/.test(prev) && /\d/.test(next)) continue;
    if (/\s/.test(next) || /[가-힣]/.test(next) || i === t.length - 1) { const x = t.slice(s, i + 1).trim(); if (x) out.push(x); s = i + 1; }
  }
  const r = t.slice(s).trim(); if (r) out.push(r);
  return out;
}
const damaged = (t: string): boolean => {
  const o = (t.match(/[(（]/g) || []).length, c = (t.match(/[)）]/g) || []).length;
  return o > c || /[(:,·]\s*$/.test(t);
};

async function main(): Promise<void> {
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5602', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  const scan = JSON.parse(fs.readFileSync(P('otc-ko-canonical-damage-scan.ga.json'), 'utf8'));
  const ids: string[] = scan.detail.map((d: any) => d.koId);
  const ko = new Map<string, any>(), src = new Map<string, Record<string, string>>();
  for (let i = 0; i < ids.length; i += 300) {
    for (const r of (await pool.query(
      `SELECT id::text id, master_id::text mid, content, md5(content) h, source_type st FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`,
      [ids.slice(i, i + 300)])).rows) ko.set(r.id, r);
  }
  const mids = [...ko.values()].map((r) => r.mid);
  for (let i = 0; i < mids.length; i += 300) {
    for (const r of (await pool.query(
      `SELECT DISTINCT ON (master_id) master_id::text mid, content FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
          AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
        ORDER BY master_id, (status='canonical') DESC, length(content) DESC`, [mids.slice(i, i + 300)])).rows)
      src.set(r.mid, sections(r.content));
  }

  const plans: any[] = [], skips: any[] = [];
  for (const [id, row] of ko) {
    const content = String(row.content);
    const sec = src.get(row.mid);
    if (!sec) { skips.push({ id, code: 'NO_OFFICIAL_SOURCE' }); continue; }
    const official = {
      caution: normalize([sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n')),
      dosage: normalize(sec['용법·용량'] || ''), indication: normalize(sec['효능·효과'] || ''),
    };
    let next = content; const restored: any[] = [];
    /* 주의 목록의 손상 <li> 만 대상으로 한다(안전 섹션 우선) */
    for (const ul of content.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || []) {
      for (const liRaw of ul.match(/<li>([\s\S]*?)<\/li>/g) || []) {
        const cur = T(liRaw);
        if (!damaged(cur)) continue;
        const nt = normalize(cur);
        if (!official.caution || !(official.caution.length > nt.length && official.caution.slice(0, nt.length) === nt)) continue;
        /* 절단 이후 원문을 끝까지 복원하고 문장 단위로 분할 */
        const full = official.caution;
        const items = koSentences(full).filter(Boolean);
        if (items.length < 1) continue;
        const block = items.map((s) => `<li>${esc(s)}</li>`).join('\n      ');
        if (next.split(liRaw).length - 1 !== 1) { skips.push({ id, code: 'LI_NOT_UNIQUE' }); continue; }
        next = next.replace(liRaw, block);
        restored.push({ before: cur.slice(0, 80), beforeLen: cur.length, afterItems: items.length, afterLen: full.length });
      }
    }
    if (!restored.length) { skips.push({ id, code: 'NO_PROVEN_DAMAGE' }); continue; }
    /* 가드: 손상 단위 외 본문 불변 — sd-warn 밖 영역 byte 비교 */
    const strip = (h: string): string => h.replace(/<ul class="sd-warn">[\s\S]*?<\/ul>/g, '@@WARN@@');
    if (strip(next) !== strip(content)) { skips.push({ id, code: 'OUTSIDE_WARN_CHANGED' }); continue; }
    /* 수치 보존: 복원 후 수치 집합은 이전의 상위집합이어야 한다 */
    const nums = (s: string): string[] => (T(s).match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(/,/g, ''));
    const beforeNums = new Set(nums(content)); let lost = 0;
    for (const n of beforeNums) if (!nums(next).includes(n)) lost++;
    if (lost) { skips.push({ id, code: 'NUMERIC_LOST', detail: lost }); continue; }
    for (const [o, c] of [[/<ul[\s>]/g, /<\/ul>/g], [/<li>/g, /<\/li>/g]] as any)
      if ((next.match(o) || []).length !== (next.match(c) || []).length) { skips.push({ id, code: 'HTML_BROKEN' }); }
    if (skips.length && skips[skips.length - 1].id === id) continue;
    plans.push({ koId: id, masterId: row.mid, sourceType: row.st, oldHash: row.h, newHash: md5(next), newContent: next, restored });
  }

  const results: any[] = [];
  if (APPLY) for (const p of plans) {
    const q = await pool.query(
      `UPDATE shared_product_descriptions SET content=$2, updated_at=now()
        WHERE id=$1::uuid AND COALESCE(language,'ko')='ko' AND status='canonical' AND description_type='STORE'
          AND deleted_at IS NULL AND md5(content)=$3 RETURNING id`, [p.koId, p.newContent, p.oldHash]);
    results.push({ koId: p.koId, status: q.rowCount === 1 ? 'GREEN' : 'CONCURRENT_CHANGE_DETECTED' });
  }
  await pool.end();
  const summary = { mode: APPLY ? 'APPLY' : 'dry-run', scanned: ids.length, planned: plans.length,
    restoredUnits: plans.reduce((a, p) => a + p.restored.length, 0),
    skipped: skips.length, skipByCode: skips.reduce((a: any, s) => { a[s.code] = (a[s.code] || 0) + 1; return a; }, {}),
    green: results.filter((r) => r.status === 'GREEN').length,
    concurrent: results.filter((r) => r.status !== 'GREEN').length };
  fs.writeFileSync(P(`otc-ko-damage-restore-${APPLY ? 'apply' : 'dryrun'}.ga.json`),
    JSON.stringify({ summary, plans: plans.map(({ newContent, ...p }) => p), skips: skips.slice(0, 200), results }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
