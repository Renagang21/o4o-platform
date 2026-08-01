/**
 * OTC KO canonical 손상 복원 V2 — 잔여 영역(intro · intake · warn 잔여 · 작용 타일)
 *
 * V1 은 주의 목록만 다뤘고 317건을 복원했다. 잔여 281 은 영역이 다르다:
 *   intro 101 · warn:li 113 · tile:작용 63 · intake 22 · tile:주의대상 20
 *
 * 영역별 기준(V1 의 원문 재적재 기준을 그대로 승계)
 *   · warn:li  — V1 은 경고+주의+상호작용 **결합본** 접두만 인정했다. 결합 순서가 다른 문서가 있어
 *                각 섹션을 **개별**로도 대조한다. 복원분은 문장 단위 `<li>` 분할.
 *   · intro    — 효능·효과 원문으로 문단을 복원한다(목록이 아니므로 분할하지 않는다).
 *   · intake   — 용법·용량 원문으로 복원하고 문장 사이는 `<br>` 로 잇는다(기존 저작 규약).
 *   · tile:작용 — 카드 타일은 길면 안 된다. 복원된 intro 의 **첫 완결 문장**만 넣는다
 *                (요약 하드컷 교정에서 검증된 규칙과 동일).
 *   · tile:주의 대상 — 원문에 대응하는 단일 문장이 없어 기계 복원 대상이 아니다 → 미변경(검토).
 *
 * 모드: (기본) dry-run · --apply (+ env OTC_KO_DAMAGE_FIX2=CONFIRM)
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
const APPLY = process.argv.includes('--apply') && process.env.OTC_KO_DAMAGE_FIX2 === 'CONFIRM';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function sections(c: string): Record<string, string> {
  const o: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null; while ((m = re.exec(c))) o[m[1].trim()] = m[2].trim(); return o;
}
function normalize(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►ㆍᆞꮡ\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
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
/** cur 이 official 의 진접두인지 — 정규화 기준 */
const isPrefix = (cur: string, official: string): boolean => {
  const n = normalize(cur);
  return !!official && n.length > 0 && official.length > n.length && official.slice(0, n.length) === n;
};

async function main(): Promise<void> {
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5614', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  const scan = JSON.parse(fs.readFileSync(P('otc-ko-canonical-damage-scan.ga.json'), 'utf8'));
  const ids: string[] = scan.detail.map((d: any) => d.koId);
  const ko = new Map<string, any>(), src = new Map<string, Record<string, string>>();
  for (let i = 0; i < ids.length; i += 300)
    for (const r of (await pool.query(`SELECT id::text id, master_id::text mid, content, md5(content) h, source_type st FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids.slice(i, i + 300)])).rows) ko.set(r.id, r);
  const mids = [...new Set([...ko.values()].map((r) => r.mid))];
  for (let i = 0; i < mids.length; i += 300)
    for (const r of (await pool.query(
      `SELECT DISTINCT ON (master_id) master_id::text mid, content FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
          AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
        ORDER BY master_id, (status='canonical') DESC, length(content) DESC`, [mids.slice(i, i + 300)])).rows)
      src.set(r.mid, sections(r.content));

  const plans: any[] = [], skips: any[] = [];
  for (const [id, row] of ko) {
    const content = String(row.content); const sec = src.get(row.mid);
    if (!sec) { skips.push({ id, code: 'NO_OFFICIAL_SOURCE' }); continue; }
    const cautionParts = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).map(normalize);
    const off = {
      cautionAll: normalize([sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n')),
      indication: normalize(sec['효능·효과'] || ''), dosage: normalize(sec['용법·용량'] || ''),
    };
    let next = content; const acts: any[] = [];

    /* ① warn:li 잔여 — 결합본 + 개별 섹션 모두 대조 */
    for (const ul of content.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || [])
      for (const liRaw of ul.match(/<li>([\s\S]*?)<\/li>/g) || []) {
        const cur = T(liRaw); if (!damaged(cur)) continue;
        const cand = [off.cautionAll, ...cautionParts].find((c) => isPrefix(cur, c));
        if (!cand) continue;
        const items = koSentences(cand).filter(Boolean); if (!items.length) continue;
        if (next.split(liRaw).length - 1 !== 1) continue;
        next = next.replace(liRaw, items.map((s) => `<li>${esc(s)}</li>`).join('\n      '));
        acts.push({ area: 'warn:li', beforeLen: cur.length, afterLen: cand.length, items: items.length });
      }

    /* ② intro — 효능·효과 원문으로 문단 복원 */
    const introM = content.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
    let restoredIntro: string | null = null;
    if (introM) {
      const cur = T(introM[1]);
      if (damaged(cur) && isPrefix(cur, off.indication)) {
        restoredIntro = off.indication;
        next = next.replace(introM[0], `<p class="sd-intro">${esc(off.indication)}</p>`);
        acts.push({ area: 'intro', beforeLen: cur.length, afterLen: off.indication.length });
      }
    }

    /* ③ intake — 용법·용량 원문으로 복원(문장 사이 <br>) */
    const intakeM = content.match(/<p class="sd-intake">([\s\S]*?)<\/p>/);
    if (intakeM) {
      const cur = T(intakeM[1]);
      if (damaged(cur) && isPrefix(cur, off.dosage)) {
        const body = koSentences(off.dosage).map((s) => esc(s)).join('<br>');
        next = next.replace(intakeM[0], `<p class="sd-intake">${body}</p>`);
        acts.push({ area: 'intake', beforeLen: cur.length, afterLen: off.dosage.length });
      }
    }

    /* ④ tile:작용 — 복원된 intro 의 첫 완결 문장만(카드 타일은 길면 안 된다) */
    const tileRe = /(<span class="sd-tag">작용<\/span>\s*<p>)([\s\S]*?)(<\/p>)/;
    const tm = content.match(tileRe);
    if (tm) {
      const cur = T(tm[2]);
      const base = restoredIntro ?? off.indication;
      if (damaged(cur) && isPrefix(cur, normalize(base))) {
        const first = koSentences(base)[0];
        if (first && first.length >= cur.length) {
          next = next.replace(tm[0], `${tm[1]}${esc(first)}${tm[3]}`);
          acts.push({ area: 'tile:작용', beforeLen: cur.length, afterLen: first.length });
        }
      }
    }

    if (!acts.length) {
      /* 왜 복원 대상이 아닌지 구분한다: 원문을 충실히 옮겼는데 **원문 자체 괄호가 불균형**인 경우가 다수다
         (실측: `관절통(요(허리)통…`, `공기연하증(공기삼킴증) 등)의`). 이는 우리 절단이 아니라 원천 표기 결함이다. */
      const all = [off.cautionAll, off.indication, off.dosage, ...cautionParts].filter(Boolean);
      const units: string[] = [];
      const im = content.match(/<p class="sd-intro">([\s\S]*?)<\/p>/); if (im) units.push(T(im[1]));
      const km = content.match(/<p class="sd-intake">([\s\S]*?)<\/p>/); if (km) units.push(T(km[1]));
      for (const ul of content.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || [])
        for (const li of ul.match(/<li>([\s\S]*?)<\/li>/g) || []) units.push(T(li));
      const dmgUnits = units.filter((u) => damaged(u));
      const faithful = dmgUnits.length > 0 && dmgUnits.every((u) => all.some((o) => o.includes(normalize(u))));
      skips.push({ id, code: faithful ? 'FAITHFUL_COPY_OFFICIAL_TYPO' : 'NOT_MATCHED' });
      continue;
    }
    /* 가드 */
    const nums = (s: string): string[] => (T(s).match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(/,/g, ''));
    const after = nums(next); let lost = 0;
    for (const n of new Set(nums(content))) if (!after.includes(n)) lost++;
    if (lost) { skips.push({ id, code: 'NUMERIC_LOST', detail: lost }); continue; }
    for (const [o, c] of [[/<ul[\s>]/g, /<\/ul>/g], [/<li>/g, /<\/li>/g], [/<p[\s>]/g, /<\/p>/g], [/<div[\s>]/g, /<\/div>/g]] as any)
      if ((next.match(o) || []).length !== (next.match(c) || []).length) { skips.push({ id, code: 'HTML_BROKEN' }); }
    if (skips.length && skips[skips.length - 1].id === id) continue;
    plans.push({ koId: id, masterId: row.mid, sourceType: row.st, oldHash: row.h, newHash: md5(next), newContent: next, acts });
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
  const byArea: Record<string, number> = {};
  for (const p of plans) for (const a of p.acts) byArea[a.area] = (byArea[a.area] || 0) + 1;
  const summary = { mode: APPLY ? 'APPLY' : 'dry-run', scanned: ids.length, planned: plans.length,
    unitsByArea: byArea, skipped: skips.length,
    skipByCode: skips.reduce((a: any, s) => { a[s.code] = (a[s.code] || 0) + 1; return a; }, {}),
    green: results.filter((r) => r.status === 'GREEN').length,
    concurrent: results.filter((r) => r.status !== 'GREEN').length };
  fs.writeFileSync(P(`otc-ko-damage-restore-v2-${APPLY ? 'apply' : 'dryrun'}.ga.json`),
    JSON.stringify({ summary, plans: plans.map(({ newContent, ...p }) => p), skips: skips.slice(0, 200), results }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
