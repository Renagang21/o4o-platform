/**
 * WO-…-STRUCTURAL-TRUNCATION-RECOVERY — 실행 9~14 (dry-run / rollback-test / apply)
 *
 * 공식 e약은요 원문에서 완결본이 증명된 슬롯만 **텍스트 노드 최소 치환**으로 복구한다.
 *   · 문장을 만들거나 요약·재서술하지 않는다. 원문 문장을 그대로 옮긴다.
 *   · 허용 위치(대상 슬롯) 밖 텍스트가 하나라도 달라지면 그 master 는 적용하지 않는다.
 *   · **역패치 불변**: 복구본을 원래 절단값으로 되돌리면 적용 전 content hash 와 일치해야 한다.
 *     이것이 "다른 6섹션·수치·경고·route·footer·sourceRef 불변" 의 기계적 증명이다.
 *
 * 모드
 *   dry-run       : 기본. DB write 0.
 *   --rollback-test: LIVE 와 동일 경로로 UPDATE 후 **전건 강제 rollback** (잔여 0 증명)
 *   --apply        : OTC_KO_RECOVER=CONFIRM 필요. master 단위 트랜잭션.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { slots, substitute, uid, type Slot } from './otc-zh-slots.ga.js';
import { judgeDoc } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const ROLLBACK = process.argv.includes('--rollback-test');
const APPLY = process.argv.includes('--apply') && process.env.OTC_KO_RECOVER === 'CONFIRM' && !ROLLBACK;
const sha = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');
const alnum = (s: string): string => s.replace(/[^0-9A-Za-z가-힣]/g, '');
const nums = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);
const skeleton = (h: string): string => h.replace(/>[^<]*</g, '><').replace(/^[^<]*/, '').replace(/[^>]*$/, '');
const PROHIBIT = /(마십시오|마세요|말고|말며|금지|금기|삼가|피하십시오|투여하지|복용하지|사용하지|않습니다)/;
const AGE = (s: string): string[] => [...new Set((s.match(/(?:만\s*)?\d+\s*(?:세|개월|살)\s*(?:이상|이하|미만|초과)/g) || []).map((x) => x.replace(/\s+/g, '')))];
const FREQ = (s: string): string[] => [...new Set((s.match(/1\s*일\s*\d+\s*회/g) || []).map((x) => x.replace(/\s+/g, '')))];
const DOSE = (s: string): string[] => [...new Set((s.match(/1\s*회\s*\d+(?:\.\d+)?\s*(?:정|캡슐|포|팩|병|mL|ml|㎖|g|mg|㎎|방울|매|스푼|앰플)/g) || []).map((x) => x.replace(/\s+/g, '')))];

/** 대상 슬롯만 치환한 문서를 만든다. 나머지 텍스트 노드는 원문 그대로 되돌려 놓는다. */
function rebuild(src: string, fixes: Array<{ slot: number; before: string; after: string }>): string {
  const sl = slots(src);
  const map = new Map<number, string>(fixes.map((f) => [f.slot, f.after]));
  return substitute(src, (s) => {
    const i = sl.findIndex((x) => x.start === s.start && x.end === s.end);
    return map.has(i) ? map.get(i)! : s.text;
  }).out;
}

async function main(): Promise<void> {
  assertSpec();
  const plan = JSON.parse(fs.readFileSync(P('otc-ko-structural-recovery-plan.ga.json'), 'utf8'));
  const targets = plan.targets as any[];

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5722', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  if (!APPLY && !ROLLBACK) await pool.query('SET default_transaction_read_only = on');

  const ids = targets.map((t) => t.koId);
  const live = new Map<string, { mid: string; content: string }>();
  for (let i = 0; i < ids.length; i += 400)
    for (const r of (await pool.query(`SELECT id::text id, master_id::text mid, content
       FROM shared_product_descriptions WHERE id = ANY($1::uuid[]) AND description_type='STORE'
         AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`,
      [ids.slice(i, i + 400)])).rows) live.set(r.id, { mid: r.mid, content: r.content || '' });

  /* 공식 원문 hash drift 확인 */
  const officialIds = [...new Set(targets.map((t) => t.officialId))];
  const officialHash = new Map<string, string>();
  for (let i = 0; i < officialIds.length; i += 400)
    for (const r of (await pool.query('SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])',
      [officialIds.slice(i, i + 400)])).rows) officialHash.set(r.id, sha(r.content || ''));

  const ready: any[] = [], exceptions: any[] = [];
  const exByCode: Record<string, number> = {};
  const ex = (t: any, code: string, extra?: any): void => {
    exceptions.push({ koId: t.koId, mid: t.mid, code, ...extra });
    exByCode[code] = (exByCode[code] || 0) + 1;
  };

  for (const t of targets) {
    const row = live.get(t.koId);
    if (!row) { ex(t, 'OFFICIAL_SOURCE_NOT_FOUND', { detail: 'LIVE KO row missing' }); continue; }
    if (officialHash.get(t.officialId) !== t.officialSourceHash) { ex(t, 'OFFICIAL_SOURCE_HASH_DRIFT'); continue; }
    const src = row.content;
    if (sha(src) !== t.beforeContentHash) { ex(t, 'CONTENT_DRIFT_SINCE_PLAN'); continue; }

    const sl = slots(src);
    /* 구조 마커 유일성 — 같은 텍스트가 두 번 나오면 치환 위치가 유일하지 않다 */
    let unique = true;
    for (const f of t.fixes) {
      if (!sl[f.slot] || sl[f.slot].text !== f.before) { unique = false; break; }
      if (sl.filter((s) => s.text === f.before).length !== 1) { unique = false; break; }
    }
    if (!unique) { ex(t, 'STRUCTURE_MARKER_NOT_UNIQUE'); continue; }

    const out = rebuild(src, t.fixes);
    const outSl = slots(out);

    /* ── 허용 밖 diff 검사 ─────────────────────────────────────────────── */
    const fixSlots = new Set(t.fixes.map((f: any) => f.slot));
    let collateral = false;
    if (skeleton(out) !== skeleton(src) || outSl.length !== sl.length) collateral = true;
    else for (let i = 0; i < sl.length; i++)
      if (!fixSlots.has(i) && outSl[i].text !== sl[i].text) { collateral = true; break; }
    if (collateral) { ex(t, 'OTHER_REVIEW_REQUIRED', { detail: 'COLLATERAL_DIFF' }); continue; }

    /* ── 안전 불변 ────────────────────────────────────────────────────── */
    let bad: string | null = null;
    for (const f of t.fixes) {
      const b = sl[f.slot].text, a = outSl[f.slot].text;
      if (!nums(b).every((v) => nums(a).includes(v))) bad = 'NUMERIC_CONFLICT';
      else if (PROHIBIT.test(b) && !PROHIBIT.test(a)) bad = 'NEGATION_CONFLICT';
      else if (alnum(a).length <= alnum(b).length) bad = 'OTHER_REVIEW_REQUIRED';
      else if (!alnum(a).startsWith(alnum(b))) bad = 'OTHER_REVIEW_REQUIRED';
      if (bad) break;
    }
    /* 문서 전체의 연령·횟수·1회량 지문은 **추가만** 허용하고 손실은 금지한다 */
    const bAll = sl.map((s) => s.text).join(' '), aAll = outSl.map((s) => s.text).join(' ');
    if (!bad && !AGE(bAll).every((v) => AGE(aAll).includes(v))) bad = 'AGE_CONFLICT';
    if (!bad && !FREQ(bAll).every((v) => FREQ(aAll).includes(v))) bad = 'FREQUENCY_CONFLICT';
    if (!bad && !DOSE(bAll).every((v) => DOSE(aAll).includes(v))) bad = 'DOSE_CONFLICT';
    if (bad) { ex(t, bad); continue; }

    /* ── 역패치 불변 증명 ─────────────────────────────────────────────── */
    const reverse = rebuild(out, t.fixes.map((f: any) => ({ slot: f.slot, before: f.after, after: f.before })));
    if (sha(reverse) !== t.beforeContentHash) { ex(t, 'REVERSE_PATCH_MISMATCH'); continue; }

    /* 복구 후 그 슬롯이 더 이상 절단으로 판정되지 않아야 한다 */
    const outV = judgeDoc(out, outSl);
    if (t.fixes.some((f: any) => outV[f.slot]?.blocked)) { ex(t, 'OTHER_REVIEW_REQUIRED', { detail: 'STILL_BLOCKED' }); continue; }

    ready.push({ koId: t.koId, mid: t.mid, src, out,
      beforeContentHash: t.beforeContentHash, afterContentHash: sha(out),
      officialSourceHash: t.officialSourceHash,
      fixes: t.fixes.map((f: any) => ({ slot: f.slot, kind: f.kind, cutType: f.cutType, unitId: f.unitId,
        beforeLen: f.before.length, afterLen: f.after.length })) });
  }

  /* planDigest — dry-run 2회 byte-identical 증명용 */
  const planDigest = sha(ready.map((r) => `${r.koId}:${r.beforeContentHash}:${r.afterContentHash}`).sort().join('\n'));

  /* ── 실행 ─────────────────────────────────────────────────────────────── */
  let updated = 0, guardMiss = 0, rolledBack = 0;
  const applied: any[] = [];
  if (APPLY || ROLLBACK) {
    for (const r of ready) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const q = await c.query(`
          UPDATE shared_product_descriptions SET content=$1, updated_at=now()
           WHERE id=$2::uuid AND master_id=$3::uuid AND description_type='STORE' AND status='canonical'
             AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL AND content=$4`,
          [r.out, r.koId, r.mid, r.src]);
        if (q.rowCount !== 1) { await c.query('ROLLBACK'); guardMiss++; continue; }
        if (ROLLBACK) { await c.query('ROLLBACK'); rolledBack++; }
        else { await c.query('COMMIT'); updated++; applied.push({ koId: r.koId, mid: r.mid,
          beforeContentHash: r.beforeContentHash, afterContentHash: r.afterContentHash, fixes: r.fixes }); }
      } catch { await c.query('ROLLBACK'); guardMiss++; }
      finally { c.release(); }
    }
  }
  await pool.end();

  const mode = ROLLBACK ? 'rollback-test' : APPLY ? 'apply' : 'dry-run (DB write 0)';
  const summary = {
    mode, planTargets: targets.length, ready: ready.length, exceptions: exceptions.length, exByCode,
    fixes: ready.reduce((a, r) => a + r.fixes.length, 0), planDigest,
    updated, rolledBack, guardMiss,
  };
  const file = ROLLBACK ? 'otc-ko-structural-recovery-rollback.ga.json'
    : APPLY ? 'otc-ko-structural-recovery-applied.ga.json'
    : `otc-ko-structural-recovery-dryrun${arg('--run') || ''}.ga.json`;
  fs.writeFileSync(P(file), JSON.stringify({ summary, applied,
    plan: ready.map((r) => ({ koId: r.koId, mid: r.mid, beforeContentHash: r.beforeContentHash,
      afterContentHash: r.afterContentHash, officialSourceHash: r.officialSourceHash, fixes: r.fixes })),
    exceptions }, null, 1), 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
