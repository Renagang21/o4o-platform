/**
 * WO-O4O-OTC-STORE-EN-DOSE-LIMIT-AND-REPETITION-MINIMAL-FIX-V1
 *   — 확정 결함 최소 교정 (안전 상한 누락 225 + 인접 중복 <li> 3)
 *
 * 허용 변경은 두 가지뿐이다.
 *   ① sd-warn 목록에 **KO 에 있는 상한 문장**을 `<li>` 하나로 복원
 *   ② 인접한 완전 동일 `<li>` 중 뒤쪽 하나 제거
 * 그 밖의 byte 변경이 생기면 그 대상은 apply 에서 제외한다(역패치 byte 증명).
 *
 * 모드: (기본) dry-run · --apply --confirm (+ env OTC_EN_DOSE_FIX=CONFIRM)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const WO = 'WO-O4O-OTC-STORE-EN-DOSE-LIMIT-AND-REPETITION-MINIMAL-FIX-V1';
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const has = (n: string): boolean => process.argv.includes(n);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');
const MODE = has('--apply') && has('--confirm') ? 'APPLY' : 'dry-run';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const text = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();

/* ── KO 상한 문장 파싱 — 원문에 있는 값만 사용한다 ─────────────────────────── */
const ING: Record<string, string> = {
  아세트아미노펜: 'acetaminophen', 이부프로펜: 'ibuprofen', 나프록센: 'naproxen',
  카페인: 'caffeine', 덱스트로메토르판: 'dextromethorphan', 슈도에페드린: 'pseudoephedrine',
  아스피린: 'aspirin', 디펜히드라민: 'diphenhydramine', 비타민c: 'vitamin C',
};
type Limit = { ingredient: string | null; amount: string; unit: string; liver: boolean; koSentence: string };
function parseKoLimit(koText: string): Limit | null {
  /* "…(으)로 일일 최대 용량(4,000 mg)을 초과하여 …" / "1일 최대 X" */
  const re = /([가-힣A-Za-z0-9]+)?\s*(?:으로|로)?\s*(?:일일|1일)\s*최대\s*(?:용량|투여량|복용량)?\s*\(?\s*([\d,]+(?:\.\d+)?)\s*(mg|g|mL|밀리그램|그램)\s*\)?/;
  const m = koText.match(re);
  if (!m) return null;
  /* "아세트아미노펜**으로**" 처럼 조사가 붙어 들어오므로 떼어낸다 */
  const rawIng = (m[1] || '').replace(/[^가-힣A-Za-z]/g, '').replace(/(으로|로|은|는|이|가)$/, '');
  const ingredient = ING[rawIng.toLowerCase()] ?? ING[rawIng] ?? null;
  const unit = m[3] === '밀리그램' ? 'mg' : m[3] === '그램' ? 'g' : m[3];
  const amount = m[2];
  const idx = koText.indexOf(m[0]);
  const koSentence = koText.slice(Math.max(0, idx - 40), idx + m[0].length + 80);
  return { ingredient, amount, unit, liver: /간손상|간 손상/.test(koSentence), koSentence };
}
/** KO 값만으로 EN 문장을 구성한다(새 의학 정보 추가 없음) */
function enLimitSentence(l: Limit): string {
  const of = l.ingredient ? ` of ${l.ingredient}` : '';
  const base = `Do not take more than the maximum daily dose${of} (${l.amount} ${l.unit}).`;
  return l.liver ? `${base} Doing so may cause liver damage.` : base;
}
/** EN 에 이미 수치 상한이 있는지 — 감사기와 동일 술어 */
function enHasLimit(enBody: string): boolean {
  const a = /\d[\d,]*\s*mg\b/i.test(enBody) && /(maximum|do not exceed|no more than)/i.test(enBody);
  const b = /(maximum daily|daily maximum|do not exceed|no more than)\s*[^.]{0,40}\d/i.test(enBody)
    || /\b\d[\d,]*\s*(mg|g)\b[^.]{0,40}(maximum|limit|exceed)/i.test(enBody);
  return a || b;
}

interface Plan { enId: string; koId: string; masterId: string; kind: string[]; oldHash: string; newHash: string; newContent: string; note: string }
interface Skip { enId: string; masterId: string; code: string; detail: string }

async function main(): Promise<void> {
  if (MODE === 'APPLY' && process.env.OTC_EN_DOSE_FIX !== 'CONFIRM') { console.error('LOCKED: OTC_EN_DOSE_FIX=CONFIRM 필요'); process.exit(3); }
  const rows: any[] = [];
  for (const lb of ['batch01', 'batch02-05']) rows.push(...J(`otc-store-en-audit-${lb}-review-required.ga.json`).rows);
  const doseRows = rows.filter((r) => r.softSignals.includes('DOSE_LIMIT_SENTENCE_MISSING'));
  const repRows: any[] = [];
  for (const lb of ['batch01', 'batch02-05']) repRows.push(...J(`otc-store-en-audit-${lb}-retranslate-invalid.ga.json`).rows);
  const targets = new Map<string, { r: any; dose: boolean; rep: boolean }>();
  for (const r of doseRows) targets.set(r.enDescriptionId, { r, dose: true, rep: false });
  for (const r of repRows) {
    const t = targets.get(r.enDescriptionId);
    if (t) t.rep = true; else targets.set(r.enDescriptionId, { r, dose: false, rep: true });
  }
  const inputStats = { dose: doseRows.length, repetition: repRows.length, distinctTargets: targets.size,
    overlap: doseRows.filter((d) => repRows.some((x) => x.enDescriptionId === d.enDescriptionId)).length };

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5560', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  const ids = [...targets.keys()];
  const koIds = [...targets.values()].map((t) => t.r.koDescriptionId);
  const live = new Map<string, any>();
  for (const r of (await pool.query(
    `SELECT id::text id, master_id::text mid, content, md5(content) h, updated_at, language, status, description_type dt, source_type st
       FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids])).rows) live.set(r.id, r);
  const koLive = new Map<string, any>();
  for (const r of (await pool.query(`SELECT id::text id, content, md5(content) h FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [koIds])).rows) koLive.set(r.id, r);

  const plans: Plan[] = [], skips: Skip[] = [];
  for (const [enId, t] of targets) {
    const cur = live.get(enId), ko = koLive.get(t.r.koDescriptionId);
    if (!cur) { skips.push({ enId, masterId: t.r.masterId, code: 'EN_ROW_MISSING', detail: '' }); continue; }
    if (cur.h !== t.r.enHash) { skips.push({ enId, masterId: t.r.masterId, code: 'CONCURRENT_CHANGE_DETECTED', detail: 'enHash 불일치' }); continue; }
    if (!ko || ko.h !== t.r.koHash) { skips.push({ enId, masterId: t.r.masterId, code: 'CONCURRENT_CHANGE_DETECTED', detail: 'koHash 불일치' }); continue; }
    if (cur.language !== 'en' || cur.status !== 'canonical' || cur.dt !== 'STORE') { skips.push({ enId, masterId: t.r.masterId, code: 'FIELD_UNEXPECTED', detail: `${cur.language}/${cur.status}` }); continue; }
    const before = String(cur.content);
    let next = before; const kind: string[] = []; let note = ''; let inserted = '';

    /* ② 인접 중복 <li> 제거 (먼저 — 구조 단순화) */
    if (t.rep) {
      const lis = [...before.matchAll(/<li>([\s\S]*?)<\/li>/g)];
      let removed = false;
      for (let i = 1; i < lis.length; i++) {
        if (norm(text(lis[i][1])) && norm(text(lis[i][1])) === norm(text(lis[i - 1][1]))) {
          const koT = text(String(ko.content));
          if (koT.split(norm(text(lis[i][1])).slice(0, 20)).length - 1 > 1) break;   // KO 에도 2회면 손대지 않는다
          const seg = lis[i][0];
          const at = next.indexOf(seg, next.indexOf(lis[i - 1][0]) + lis[i - 1][0].length);
          if (at < 0) break;
          /* 앞의 개행·들여쓰기까지 함께 제거해 구조 유지 */
          const pre = next.slice(0, at).match(/\n\s*$/);
          next = next.slice(0, at - (pre ? pre[0].length : 0)) + next.slice(at + seg.length);
          removed = true; kind.push('REPETITION_REMOVED'); break;
        }
      }
      if (!removed && !t.dose) { skips.push({ enId, masterId: t.r.masterId, code: 'REVIEW_REQUIRED', detail: '인접 완전동일 <li> 미확인' }); continue; }
    }

    /* ① 상한 문장 복원 */
    if (t.dose) {
      const koT = text(String(ko.content));
      const lim = parseKoLimit(koT);
      if (!lim) { if (kind.length === 0) { skips.push({ enId, masterId: t.r.masterId, code: 'REVIEW_REQUIRED', detail: 'KO 상한 파싱 실패' }); continue; } }
      else if (enHasLimit(text(next))) { /* 이미 있음 → NO_OP */ if (kind.length === 0) { skips.push({ enId, masterId: t.r.masterId, code: 'NO_OP', detail: 'EN 에 이미 상한 존재' }); continue; } }
      else {
        const sentence = enLimitSentence(lim);
        const ul = next.match(/<ul class="sd-warn">/);
        if (!ul) { if (kind.length === 0) { skips.push({ enId, masterId: t.r.masterId, code: 'REVIEW_REQUIRED', detail: 'sd-warn 목록 없음' }); continue; } }
        else {
          const insertAt = next.indexOf('</ul>', next.indexOf('<ul class="sd-warn">'));
          inserted = `\n      <li>${esc(sentence)}</li>`;
          next = next.slice(0, insertAt) + inserted + '\n    ' + next.slice(insertAt);
          kind.push('DOSE_LIMIT_RESTORED'); note = sentence;
        }
      }
    }
    if (!kind.length) { skips.push({ enId, masterId: t.r.masterId, code: 'NO_OP', detail: '변경 없음' }); continue; }

    /* 가드: 허용 변경 외 byte 동일 — 역패치로 증명 */
    let restored = next;
    /* 삽입한 정확한 리터럴만 되돌린다(정규식 이스케이프 왕복 오차 차단) */
    if (kind.includes('DOSE_LIMIT_RESTORED')) restored = restored.replace(inserted + '\n    ', '');
    if (kind.includes('REPETITION_REMOVED')) { /* 삭제는 역패치 불가 → 길이·구조로 증명 */ }
    if (kind.length === 1 && kind[0] === 'DOSE_LIMIT_RESTORED' && restored !== before) {
      skips.push({ enId, masterId: t.r.masterId, code: 'DIFF_GUARD_FAILED', detail: '역패치 불일치' }); continue;
    }
    const liDelta = (next.match(/<li>/g) || []).length - (before.match(/<li>/g) || []).length;
    const expect = (kind.includes('DOSE_LIMIT_RESTORED') ? 1 : 0) - (kind.includes('REPETITION_REMOVED') ? 1 : 0);
    if (liDelta !== expect) { skips.push({ enId, masterId: t.r.masterId, code: 'DIFF_GUARD_FAILED', detail: `li delta ${liDelta} ≠ ${expect}` }); continue; }
    for (const [o, c] of [[/<div[\s>]/g, /<\/div>/g], [/<ul[\s>]/g, /<\/ul>/g], [/<li>/g, /<\/li>/g], [/<p[\s>]/g, /<\/p>/g]] as any) {
      if ((next.match(o) || []).length !== (next.match(c) || []).length) { skips.push({ enId, masterId: t.r.masterId, code: 'HTML_BROKEN', detail: '' }); }
    }
    if (skips.length && skips[skips.length - 1].enId === enId) continue;
    if (/[가-힣]/.test(next)) { skips.push({ enId, masterId: t.r.masterId, code: 'HANGUL_IN_EN', detail: '' }); continue; }
    plans.push({ enId, koId: t.r.koDescriptionId, masterId: t.r.masterId, kind, oldHash: cur.h, newHash: md5(next), newContent: next, note });
  }

  const results: any[] = [];
  if (MODE === 'APPLY') {
    for (const p of plans) {
      const c = await pool.connect();
      try {
        const r = await c.query(
          `UPDATE shared_product_descriptions SET content=$2, updated_at=now()
            WHERE id=$1::uuid AND language='en' AND status='canonical' AND description_type='STORE'
              AND deleted_at IS NULL AND md5(content)=$3 RETURNING id`, [p.enId, p.newContent, p.oldHash]);
        if (r.rowCount === 1) results.push({ enId: p.enId, status: 'GREEN', kind: p.kind });
        else results.push({ enId: p.enId, status: 'CONCURRENT_CHANGE_DETECTED', kind: p.kind });
      } catch (e) { results.push({ enId: p.enId, status: 'EXCEPTION', error: e instanceof Error ? e.message : String(e) }); }
      finally { c.release(); }
    }
  }
  await pool.end();
  const summary = {
    wo: WO, mode: MODE, inputStats,
    planned: plans.length,
    plannedByKind: plans.reduce((a: any, p) => { const k = p.kind.join('+'); a[k] = (a[k] || 0) + 1; return a; }, {}),
    skipped: skips.length, skipByCode: skips.reduce((a: any, s) => { a[s.code] = (a[s.code] || 0) + 1; return a; }, {}),
    green: results.filter((r) => r.status === 'GREEN').length,
    concurrent: results.filter((r) => r.status === 'CONCURRENT_CHANGE_DETECTED').length,
    exception: results.filter((r) => r.status === 'EXCEPTION').length,
  };
  const tag = MODE === 'APPLY' ? 'apply' : 'dryrun';
  fs.writeFileSync(P(`otc-en-dose-limit-fix-${tag}.ga.json`), JSON.stringify({ summary, plans: plans.map(({ newContent, ...p }) => p), skips, results }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
