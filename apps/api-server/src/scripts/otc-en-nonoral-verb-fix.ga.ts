/**
 * WO-O4O-DRUG-OTC-EN-NONORAL-VERB-SOURCE-ADJUDICATION-AND-MINIMAL-FIX-V1
 *   — 확정 오역(`INVALID_ROUTE_VERB`) **문장 단위 최소 교정** 실행기 (단일 write owner)
 *
 * 대상: 판정 원장에서 `INVALID_ROUTE_VERB` 로 확정된 문장만.
 *       비경구 제품인데 EN 이 **제품 자체를 복용하도록** 옮긴 문장이며, 대응 KO 는 전부 `사용` 계열이다.
 *
 * 변경: 해당 문장 안의 **동사 토큰만**(take→use / taking→using). 문장의 나머지·다른 문장·다른 섹션·
 *       KO·타 언어·summary·source_ref·status·type 은 전부 불변.
 *
 * 원장을 신뢰하지 않는다 — 다음을 **LIVE 에서 다시 증명**한 뒤에만 쓴다:
 *   G-a 옛 문장이 현재 본문에 **정확히 1회** 존재
 *   G-b 옛→새 diff 가 **허용된 동사 치환 토큰뿐**(토큰 수 동일 · 그 외 토큰 byte 동일)
 *        → 숫자·연령·기간·용량·금기·질환명은 구조적으로 바뀔 수 없다
 *   G-c 교정 후 문장에 제품 대상 경구동사 잔여 0(경로 표지 있는 정상 문장은 예외)
 *   G-d 역패치 복원 → 적용 전 해시와 byte 일치
 *   G-e 길이 델타 = 치환분 합과 정확히 일치
 *   G-f 구조 불변(h2·li 수 · sd-* 마커 소실 금지) · 한글 혼입 0
 *
 * 모드:
 *   (기본) dry-run      : write 0. 계획·planDigest 산출.
 *   --rollback-test     : 실제 UPDATE 후 **항상 ROLLBACK**. 독립 커넥션으로 residue 0 확인.
 *   --apply --confirm   : LIVE. 추가로 env OTC_EN_VERB_FIX=CONFIRM 필수(2중 게이트).
 *
 * 원장 분리(WO §9): apply 계획 원장은 **멱등 재실행으로 덮어쓰지 않는다**.
 *   계획 → `-plan.ga.json` (대상 0 이면 쓰지 않음) · 결과 → `-result.ga.json`
 *   멱등 → `-idempotency.ga.json` · 체크포인트 → `-checkpoint.ga.json` (+ run-* 불변 사본)
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-en-nonoral-verb-fix.ga.ts [--port 5530] [--limit N]
 *   ../../node_modules/.bin/tsx src/scripts/otc-en-nonoral-verb-fix.ga.ts --rollback-test
 *   OTC_EN_VERB_FIX=CONFIRM ../../node_modules/.bin/tsx src/scripts/otc-en-nonoral-verb-fix.ga.ts --apply --confirm
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool, PoolClient } from 'pg';

const WO = 'WO-O4O-DRUG-OTC-EN-NONORAL-VERB-SOURCE-ADJUDICATION-AND-MINIMAL-FIX-V1';
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const CONFIRM_ENV = 'OTC_EN_VERB_FIX';
const CHECKPOINT_EVERY = 25;

const has = (n: string): boolean => process.argv.includes(n);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');
const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

type Mode = 'dry-run' | 'rollback-test' | 'APPLY';
const MODE: Mode = has('--rollback-test') ? 'rollback-test' : (has('--apply') && has('--confirm') ? 'APPLY' : 'dry-run');

const IN_LEDGERS = ['otc-en-nonoral-verb-invalid-targets-all540.ga.json', 'otc-en-nonoral-verb-invalid-targets.ga.json'];
const OUT_PLAN = P('otc-en-nonoral-verb-fix-plan.ga.json');
const OUT_RESULT = P('otc-en-nonoral-verb-fix-result.ga.json');
const OUT_IDEM = P('otc-en-nonoral-verb-fix-idempotency.ga.json');
const OUT_CKPT = P('otc-en-nonoral-verb-fix-checkpoint.ga.json');

const escHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** 허용 동사 치환 — 이 목록 밖의 토큰 변경이 하나라도 있으면 차단한다 */
const ALLOWED_SUBS = new Map<string, string>([
  ['take', 'use'], ['Take', 'Use'], ['taking', 'using'], ['Taking', 'Using'],
  ['takes', 'uses'], ['Takes', 'Uses'],
]);
const PRODUCT_OBJECT = /\btak(?:e|es|ing|en)\s+(?:it|this\s+(?:medicine|drug|product)|the\s+medicine)\b/i;
const ORAL_ROUTE_MARK = /\b(by mouth|orally|internally|swallow|swallows|swallowing|swallowed|eaten|eat)\b/i;

interface Target { masterId: string; descId: string; route: string; oldSentence: string; newSentence: string; section: string; koSentence: string | null }
interface Plan {
  masterId: string; descId: string; route: string; edits: Target[];
  oldHash: string; newHash: string; newContent: string; deltaChars: number;
}
interface Blocked { masterId: string; descId: string; code: string; detail: string }
const isBlocked = (p: Plan | Blocked): p is Blocked => 'code' in p;

/** G-b: 옛→새 차이가 허용된 동사 치환 토큰뿐인지 — 그 외는 byte 동일해야 한다 */
function diffGuard(oldS: string, newS: string): { ok: boolean; changed: number; detail?: string } {
  const a = oldS.split(/(\s+)/), b = newS.split(/(\s+)/);
  if (a.length !== b.length) return { ok: false, changed: 0, detail: '토큰 수 불일치' };
  let changed = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const expect = ALLOWED_SUBS.get(a[i]);
    if (expect !== b[i]) return { ok: false, changed, detail: `허용되지 않은 토큰 변경 "${a[i]}"→"${b[i]}"` };
    changed++;
  }
  if (changed === 0) return { ok: false, changed: 0, detail: '변경 없음' };
  return { ok: true, changed };
}

function planOne(descId: string, masterId: string, route: string, content: string, edits: Target[]): Plan | Blocked {
  const base = { masterId, descId };
  let next = content;
  let delta = 0;
  for (const e of edits) {
    const g = diffGuard(e.oldSentence, e.newSentence);
    if (!g.ok) return { ...base, code: 'DIFF_GUARD_FAILED', detail: `${g.detail} :: ${e.oldSentence.slice(0, 60)}` };
    if (PRODUCT_OBJECT.test(e.newSentence) && !ORAL_ROUTE_MARK.test(e.newSentence)) {
      return { ...base, code: 'RESIDUAL_ORAL_VERB', detail: `교정 후에도 제품 대상 경구동사 잔여 :: ${e.newSentence.slice(0, 60)}` };
    }
    /* 본문은 HTML 이므로 이스케이프된 형태로 찾는다 */
    const findRaw = escHtml(e.oldSentence);
    const hits = next.split(findRaw).length - 1;
    if (hits !== 1) return { ...base, code: 'SENTENCE_NOT_UNIQUE', detail: `출현 ${hits} ≠ 1 :: ${e.oldSentence.slice(0, 60)}` };
    const replRaw = escHtml(e.newSentence);
    next = next.replace(findRaw, replRaw);
    delta += replRaw.length - findRaw.length;
  }
  /* G-d 역패치 — 허용 범위 밖 diff 0 의 byte 증명 */
  let restored = next;
  for (let i = edits.length - 1; i >= 0; i--) restored = restored.replace(escHtml(edits[i].newSentence), escHtml(edits[i].oldSentence));
  if (restored !== content) return { ...base, code: 'REVERSE_PATCH_MISMATCH', detail: '역패치 복원 불일치' };
  /* G-e 길이 델타 */
  if (next.length - content.length !== delta) return { ...base, code: 'LENGTH_DELTA_MISMATCH', detail: `${next.length - content.length} ≠ ${delta}` };
  /* G-f 구조 불변 */
  const h2o = (content.match(/<h2>/g) || []).length, h2n = (next.match(/<h2>/g) || []).length;
  const lio = (content.match(/<li>/g) || []).length, lin = (next.match(/<li>/g) || []).length;
  if (h2o !== h2n || lio !== lin) return { ...base, code: 'STRUCTURE_DRIFT', detail: `h2 ${h2o}→${h2n} li ${lio}→${lin}` };
  for (const marker of ['sd-card', 'sd-hero', 'sd-intro', 'sd-core', 'sd-intake', 'sd-warn', 'sd-foot']) {
    if (content.includes(marker) && !next.includes(marker)) return { ...base, code: 'MARKER_LOST', detail: `${marker} 소실` };
  }
  if (/[가-힣]/.test(next)) return { ...base, code: 'HANGUL_IN_EN', detail: 'EN 본문에 한글 혼입' };
  return { ...base, route, edits, oldHash: md5(content), newHash: md5(next), newContent: next, deltaChars: delta };
}

/** LIVE UPDATE 1행 — 낙관적 잠금 + EN 고정 조건 · rowCount 1 강제 */
async function execUpdate(c: PoolClient, p: Plan): Promise<void> {
  const r = await c.query(
    `UPDATE shared_product_descriptions
        SET content=$2, updated_at=now()
      WHERE id=$1::uuid AND status='canonical' AND description_type='STORE'
        AND language='en' AND source_type='mfds_drug_otc' AND deleted_at IS NULL
        AND md5(content)=$3
      RETURNING id`, [p.descId, p.newContent, p.oldHash]);
  if (r.rowCount !== 1) throw new Error(`UPDATE rowCount ${r.rowCount}!==1 (선점 또는 hash 불일치)`);
  const v = (await c.query(
    `SELECT md5(content) h, status, description_type dtype, language lang, source_type stype,
            source_ref_id::text sref, master_id::text mid, summary, deleted_at
       FROM shared_product_descriptions WHERE id=$1::uuid`, [p.descId])).rows[0];
  const fail: string[] = [];
  if (v.h !== p.newHash) fail.push('contentHash 불일치');
  if (v.status !== 'canonical') fail.push(`status=${v.status}`);
  if (v.dtype !== 'STORE') fail.push(`description_type=${v.dtype}`);
  if (v.lang !== 'en') fail.push(`language=${v.lang}`);
  if (v.stype !== 'mfds_drug_otc') fail.push(`source_type=${v.stype}`);
  if (v.mid !== p.masterId) fail.push('master_id 변경');
  if (v.deleted_at !== null) fail.push('deleted_at 설정됨');
  if (fail.length) throw new Error(`사후검증 실패 [${fail.join(',')}]`);
}

let RUN_STARTED = '';
const runTag = (s: string): string => s.replace(/[-:]/g, '').replace(/\..*$/, '');
function writeLedger(file: string, payload: string): void {
  fs.writeFileSync(file, payload, 'utf8');
  fs.writeFileSync(file.replace(/\.ga\.json$/, `.run-${runTag(RUN_STARTED)}.ga.json`), payload, 'utf8');
}

async function main(): Promise<void> {
  if (MODE === 'APPLY' && process.env[CONFIRM_ENV] !== 'CONFIRM') {
    console.error(`LOCKED: confirm env(${CONFIRM_ENV}=CONFIRM) 미설정 — LIVE apply 금지`); process.exit(3);
  }
  RUN_STARTED = new Date().toISOString();

  /* 판정 원장 병합(중복 제거) — 원장은 **대상 후보**일 뿐, 검증은 아래에서 LIVE 로 다시 한다 */
  const seen = new Set<string>();
  const targets: Target[] = [];
  for (const f of IN_LEDGERS) {
    let rows: any[] = [];
    try { rows = JSON.parse(fs.readFileSync(P(f), 'utf8')).rows; } catch { continue; }
    for (const r of rows) {
      if (r.verdict !== 'INVALID_ROUTE_VERB' || !r.needsFix || !r.proposedSentence) continue;
      const key = `${r.enDescriptionId}||${r.enSentence}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({
        masterId: r.masterId, descId: r.enDescriptionId, route: r.route, section: r.section,
        oldSentence: r.enSentence, newSentence: r.proposedSentence, koSentence: r.koSentence,
      });
    }
  }
  const byDesc = new Map<string, Target[]>();
  for (const t of targets) { const a = byDesc.get(t.descId) || []; a.push(t); byDesc.set(t.descId, a); }

  const pool = new Pool({
    host: '127.0.0.1', port: parseInt(arg('--port') || process.env.PROXY_PORT || '5530', 10),
    database: 'o4o_platform', statement_timeout: 900000, max: 4,
    user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD,
  });
  const live = (await pool.query(
    `SELECT id::text id, master_id::text mid, content FROM shared_product_descriptions
      WHERE id = ANY($1::uuid[]) AND status='canonical' AND description_type='STORE'
        AND language='en' AND source_type='mfds_drug_otc' AND deleted_at IS NULL`, [[...byDesc.keys()]])).rows as any[];
  const liveBy = new Map(live.map((r) => [r.id, r]));

  const plans: Plan[] = [], blocked: Blocked[] = [], already: string[] = [];
  for (const [descId, edits] of byDesc) {
    const row = liveBy.get(descId);
    if (!row) { blocked.push({ masterId: edits[0].masterId, descId, code: 'EN_ROW_NOT_FOUND', detail: 'EN canonical 부재' }); continue; }
    const content = String(row.content);
    /* 멱등: 이미 교정된 행(옛 문장이 없고 새 문장이 있다)은 대상에서 제외 */
    const pending = edits.filter((e) => content.includes(escHtml(e.oldSentence)));
    const done = edits.filter((e) => !content.includes(escHtml(e.oldSentence)) && content.includes(escHtml(e.newSentence)));
    if (pending.length === 0 && done.length === edits.length) { already.push(descId); continue; }
    if (pending.length !== edits.length) {
      blocked.push({ masterId: edits[0].masterId, descId, code: 'PARTIAL_STATE', detail: `pending ${pending.length}/${edits.length}` });
      continue;
    }
    const p = planOne(descId, row.mid, edits[0].route, content, edits);
    if (isBlocked(p)) blocked.push(p); else plans.push(p);
  }

  let units = plans;
  const limit = arg('--limit') ? parseInt(arg('--limit')!, 10) : undefined;
  if (limit) units = units.slice(0, limit);

  const planDigest = sha256(units.map((u) => `${u.descId}|${u.oldHash}|${u.newHash}|${u.edits.map((e) => e.newSentence).join('¶')}`).sort().join('\n'));
  const byRoute: Record<string, number> = {};
  for (const u of units) byRoute[u.route] = (byRoute[u.route] || 0) + 1;
  const planPayload = {
    wo: WO, kind: 'en-verb-fix-plan', mode: MODE, planDigest,
    ledgerTargets: targets.length, targetDescriptions: units.length,
    targetSentences: units.reduce((t, u) => t + u.edits.length, 0),
    alreadyFixed: already.length, blocked: blocked.length,
    blockedByCode: blocked.reduce((a: any, b) => (a[b.code] = (a[b.code] || 0) + 1, a), {}),
    byRoute,
    rows: units.map((u) => ({
      masterId: u.masterId, descId: u.descId, route: u.route, oldHash: u.oldHash, newHash: u.newHash,
      deltaChars: u.deltaChars,
      edits: u.edits.map((e) => ({ section: e.section, old: e.oldSentence, new: e.newSentence, ko: e.koSentence })),
    })),
  };
  /** 멱등 재실행(대상 0)이 apply 계획 원장을 덮어쓰지 않도록 **파일을 분리**한다 */
  if (units.length === 0) writeLedger(OUT_IDEM, JSON.stringify({ ...planPayload, kind: 'en-verb-fix-idempotency' }, null, 2) + '\n');
  else writeLedger(OUT_PLAN, JSON.stringify(planPayload, null, 2) + '\n');

  const results: any[] = [], checkpoints: any[] = [];
  if (MODE !== 'dry-run') {
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const rep: any = { masterId: u.masterId, descId: u.descId, edits: u.edits.length, oldHash: u.oldHash, newHash: u.newHash };
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query('SAVEPOINT sp_row');
        try {
          await execUpdate(c, u);
          await c.query('RELEASE SAVEPOINT sp_row');
          if (MODE === 'APPLY') { await c.query('COMMIT'); rep.status = 'GREEN'; rep.writeActual = 1; }
          else { await c.query('ROLLBACK'); rep.status = 'ROLLBACK_TEST_PASS'; rep.writeActual = 0; rep.txWritten = 1; }
        } catch (e) {
          await c.query('ROLLBACK TO SAVEPOINT sp_row').catch(() => undefined);
          await c.query('ROLLBACK').catch(() => undefined);
          rep.status = 'EXCEPTION'; rep.writeActual = 0; rep.error = e instanceof Error ? e.message : String(e);
        }
      } finally { c.release(); }
      const after = (await pool.query(`SELECT md5(content) h FROM shared_product_descriptions WHERE id=$1::uuid`, [u.descId])).rows[0];
      if (rep.status === 'GREEN') {
        rep.postVerify = after.h === u.newHash;
        if (!rep.postVerify) { rep.status = 'EXCEPTION'; rep.error = '커밋 후 독립검증 실패'; }
      } else rep.residueClean = after.h === u.oldHash;
      results.push(rep);
      if ((i + 1) % 20 === 0 || i === units.length - 1) console.error(`[${i + 1}/${units.length}] ${rep.status}`);
      if ((i + 1) % CHECKPOINT_EVERY === 0 || i === units.length - 1) {
        checkpoints.push({ checkpoint: checkpoints.length + 1, processed: results.length, lastDescId: u.descId,
          green: results.filter((r) => r.status === 'GREEN').length,
          exception: results.filter((r) => r.status === 'EXCEPTION').length,
          writeActual: results.reduce((t, r) => t + (r.writeActual || 0), 0), at: new Date().toISOString() });
        writeLedger(OUT_CKPT, JSON.stringify({ wo: WO, kind: 'checkpoint', every: CHECKPOINT_EVERY, checkpoints }, null, 2) + '\n');
      }
    }
  }
  await pool.end();

  const green = results.filter((r) => r.status === 'GREEN').length;
  const rbt = results.filter((r) => r.status === 'ROLLBACK_TEST_PASS').length;
  const exc = results.filter((r) => r.status === 'EXCEPTION');
  const residueDirty = results.filter((r) => r.residueClean === false).length;
  const summary = {
    wo: WO, mode: MODE, startedAt: RUN_STARTED, planDigest,
    ledgerTargets: targets.length, targetDescriptions: units.length,
    targetSentences: units.reduce((t, u) => t + u.edits.length, 0),
    alreadyFixed: already.length, blocked: blocked.length,
    blockedByCode: blocked.reduce((a: any, b) => (a[b.code] = (a[b.code] || 0) + 1, a), {}),
    byRoute, green, rollbackTestPass: rbt, exception: exc.length, residueDirty,
    writeActual: results.reduce((t, r) => t + (r.writeActual || 0), 0),
    koWrites: 0, otherLanguageWrites: 0, auditRowsWritten: 0,
    pass: blocked.length === 0 && exc.length === 0 && residueDirty === 0
      && (MODE === 'dry-run' ? results.length === 0 : results.length === units.length)
      && (MODE !== 'APPLY' || green === units.length),
  };
  if (MODE !== 'dry-run') writeLedger(OUT_RESULT, JSON.stringify({ wo: WO, kind: 'en-verb-fix-result', summary, results, exceptions: exc, blocked }, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n=== ${MODE} · desc ${units.length} · sent ${summary.targetSentences} · blocked ${blocked.length} · GREEN ${green} · RBT ${rbt} · EXC ${exc.length} · digest ${planDigest.slice(0, 16)} · PASS=${summary.pass} ===`);
  if (!summary.pass) process.exitCode = 2;
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
