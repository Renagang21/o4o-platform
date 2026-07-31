/**
 * WO-O4O-OTC-EN-SUMMARY-HARDCUT-REMOVAL-AND-2522-CARD-REBUILD-V1
 *   — EN canonical 설명서 요약 120자 하드컷 제거 · 카드 재조립 실행기 (단일 에이전트 · write owner)
 *
 * 대상: V4 유효 GREEN 3,476 의 EN canonical 중 **요약이 정확히 120자에서 잘린 2,522**.
 * 변경: summary 컬럼 + 본문 HTML 의 sd-hero 요약 배지 · At a glance("How it works") 타일 **표시값만**.
 * 불변: KO 전량 · EN 6섹션 번역문 · 수치/연령/기간 · route 문구 · footer · sourceRef · canonical 소유권 · TM.
 *
 * 재조립이 **재렌더와 동치**인 근거:
 *   `buildEnV3Html`(otc-v3-content-leaflet-composer.na.ts) 는 `summaryTable['How it works']` 를
 *   ① sd-hero 비-solid 배지 ② At a glance 타일 <p> — **두 곳에서만** 출력한다.
 *   따라서 두 지점의 값을 교체한 결과는 동일 payload 재렌더 산출물과 바이트 동일하다.
 *   본 실행기는 매 건 **역패치 복원 검사**(new→old 되돌리면 원본과 바이트 동일)로 이를 실측 확인한다.
 *
 * 새 요약 규칙: `otc-leaflet-summary.shared.ts` 의 언어 중립 `deriveLeafletSummary()` 단일 함수.
 *
 * 모드:
 *   (기본) dry-run      : write 0. 대상 선정 · 새 요약 · content hash · planDigest 산출.
 *   --rollback-test     : 실제 LIVE UPDATE 함수 실행 후 **항상 ROLLBACK**. 독립 커넥션 residue 0 확인.
 *   --apply --confirm   : LIVE. 추가로 env OTC_EN_SUMMARY_REBUILD=CONFIRM 필수(2중 게이트).
 *
 * 멱등: 이미 새 요약이 반영된 행은 SKIP_ALREADY_REBUILT (write 0).
 * audit: **0행**. 기존 in-place 콘텐츠 교정 모델(drug-otc-additive-warning-apply · hff-*-spd-correct)과 동일하며,
 *        canonical 교체가 아니므로 `canonical_replaced` 이벤트를 만들지 않는다. 추적은 run 별 불변 원장으로 한다.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-en-summary-rebuild.ga.ts [--port 5495] [--limit N] [--only <masterId>]
 *   ../../node_modules/.bin/tsx src/scripts/otc-en-summary-rebuild.ga.ts --rollback-test
 *   OTC_EN_SUMMARY_REBUILD=CONFIRM ../../node_modules/.bin/tsx src/scripts/otc-en-summary-rebuild.ga.ts --apply --confirm
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { deriveLeafletSummary } from './otc-leaflet-summary.shared.js';

const WO = 'WO-O4O-OTC-EN-SUMMARY-HARDCUT-REMOVAL-AND-2522-CARD-REBUILD-V1';
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const CONFIRM_ENV = 'OTC_EN_SUMMARY_REBUILD';
const CHECKPOINT_EVERY = 200;

const has = (n: string): boolean => process.argv.includes(n);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');
const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

type Mode = 'dry-run' | 'rollback-test' | 'APPLY';
const MODE: Mode = has('--rollback-test') ? 'rollback-test' : (has('--apply') && has('--confirm') ? 'APPLY' : 'dry-run');

const OUT_PLAN = path.join(DATA_DIR, 'otc-en-summary-rebuild-plan.ga.json');
const OUT_RESULT = path.join(DATA_DIR, 'otc-en-summary-rebuild-result.ga.json');
const OUT_CKPT = path.join(DATA_DIR, 'otc-en-summary-rebuild-checkpoint.ga.json');

// ── sd-* 계약 상수 ──────────────────────────────────────────────────────────
const escHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unescHtml = (s: string): string => s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const HERO_BADGE = (v: string): string => `<span class="sd-badge">${escHtml(v)}</span>`;
const GLANCE_TILE = (v: string): string => `<span class="sd-tag">How it works</span>\n        <p>${escHtml(v)}</p>`;

/** 저장된 EN HTML 에서 효능 첫 줄(= 저작 시 efficacy.split('\n')[0])을 복원한다. */
function introFirstLine(html: string): string | null {
  const m = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  if (!m) return null;
  return unescHtml(m[1].split('<br>')[0].split('\n')[0]).trim();
}

interface Plan {
  masterId: string; descId: string; route: string | null;
  oldSummary: string; newSummary: string;
  oldHash: string; newHash: string;
  newContent: string;
  lenOld: number; lenNew: number;
}
interface Blocked { masterId: string; descId: string; code: string; detail: string }

/** 대상 1행의 재조립 계획 산출 — 계약 위반은 전부 차단(추정 금지) */
function planOne(row: any, route: string | null): Plan | Blocked {
  const base = { masterId: row.master_id, descId: row.id };
  const content = String(row.content);
  const oldSummary = String(row.summary ?? '');

  const line = introFirstLine(content);
  if (line === null) return { ...base, code: 'NO_INTRO_SECTION', detail: 'sd-intro 단락 없음' };
  if (line.slice(0, 120) !== oldSummary) return { ...base, code: 'SOURCE_PARITY_MISMATCH', detail: '저장 summary ≠ 효능 첫 줄 120자 절단' };

  const newSummary = deriveLeafletSummary(line);
  if (!newSummary) return { ...base, code: 'EMPTY_DERIVED_SUMMARY', detail: '파생 요약 공란' };
  if (!newSummary.startsWith(oldSummary)) return { ...base, code: 'NOT_A_SUPERSET', detail: '새 요약이 기존 요약을 포함하지 않음' };
  if (newSummary.length < oldSummary.length) return { ...base, code: 'SHORTER_THAN_OLD', detail: '새 요약이 더 짧음' };

  const heroOld = HERO_BADGE(oldSummary), tileOld = GLANCE_TILE(oldSummary);
  if (content.split(heroOld).length - 1 !== 1) return { ...base, code: 'HERO_BADGE_NOT_UNIQUE', detail: 'sd-hero 요약 배지 출현 ≠ 1' };
  if (content.split(tileOld).length - 1 !== 1) return { ...base, code: 'GLANCE_TILE_NOT_UNIQUE', detail: 'At a glance 타일 출현 ≠ 1' };

  const newContent = content.replace(heroOld, HERO_BADGE(newSummary)).replace(tileOld, GLANCE_TILE(newSummary));

  // 역패치 복원 검사 — 허용 범위 밖 diff 0 의 실측 증명
  const restored = newContent.replace(HERO_BADGE(newSummary), heroOld).replace(GLANCE_TILE(newSummary), tileOld);
  if (restored !== content) return { ...base, code: 'REVERSE_PATCH_MISMATCH', detail: '역패치 복원 불일치' };

  // 길이 델타 = 교체 2회분과 정확히 일치해야 한다(다른 지점 변경 0)
  const delta = 2 * (escHtml(newSummary).length - escHtml(oldSummary).length);
  if (newContent.length - content.length !== delta) return { ...base, code: 'LENGTH_DELTA_MISMATCH', detail: `delta ${newContent.length - content.length} ≠ ${delta}` };

  // 구조 불변 검사 — 섹션 수 · footer · intake · 안전 목록
  const h2Old = (content.match(/<h2>/g) || []).length, h2New = (newContent.match(/<h2>/g) || []).length;
  const liOld = (content.match(/<li>/g) || []).length, liNew = (newContent.match(/<li>/g) || []).length;
  if (h2Old !== h2New || liOld !== liNew) return { ...base, code: 'STRUCTURE_DRIFT', detail: `h2 ${h2Old}→${h2New} li ${liOld}→${liNew}` };
  if (!newContent.includes('sd-foot') || !newContent.includes('sd-intake')) return { ...base, code: 'FOOTER_OR_INTAKE_LOST', detail: 'footer/intake 소실' };

  return {
    ...base, route, oldSummary, newSummary,
    oldHash: md5(content), newHash: md5(newContent), newContent,
    lenOld: oldSummary.length, lenNew: newSummary.length,
  };
}

const isBlocked = (p: Plan | Blocked): p is Blocked => 'code' in p;

/** LIVE UPDATE 1행 — 낙관적 잠금(md5 대조) · rowCount 1 강제 */
async function execUpdate(c: PoolClient, p: Plan): Promise<void> {
  const r = await c.query(
    `UPDATE shared_product_descriptions
        SET content=$2, summary=$3, updated_at=now()
      WHERE id=$1::uuid AND status='canonical' AND description_type='STORE'
        AND language='en' AND source_type='mfds_drug_otc' AND deleted_at IS NULL
        AND md5(content)=$4
      RETURNING id`,
    [p.descId, p.newContent, p.newSummary, p.oldHash]);
  if (r.rowCount !== 1) throw new Error(`UPDATE rowCount ${r.rowCount}!==1 (선점 또는 hash 불일치)`);

  const v = (await c.query(
    `SELECT md5(content) h, summary, status, language, source_ref_id::text sref
       FROM shared_product_descriptions WHERE id=$1::uuid`, [p.descId])).rows[0];
  const fail: string[] = [];
  if (v.h !== p.newHash) fail.push('contentHash 불일치');
  if (v.summary !== p.newSummary) fail.push('summary 불일치');
  if (v.status !== 'canonical') fail.push(`status=${v.status}`);
  if (v.language !== 'en') fail.push(`language=${v.language}`);
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
  const pool = new Pool({ host: '127.0.0.1', port: port(), user: 'o4o_api', database: 'o4o_platform', statement_timeout: 900000, max: 4 });

  const routeBy = new Map<string, string>();
  for (const r of (await pool.query(
    `SELECT master_id, metadata->>'route' route FROM shared_product_description_audit_logs
      WHERE metadata->>'batchId' LIKE 'otc-v4%'`)).rows as any[]) if (!routeBy.has(r.master_id)) routeBy.set(r.master_id, r.route);

  const rows = (await pool.query(
    `WITH m AS (SELECT DISTINCT master_id FROM shared_product_description_audit_logs WHERE metadata->>'batchId' LIKE 'otc-v4%')
     SELECT s.id::text id, s.master_id::text master_id, s.content, s.summary
       FROM shared_product_descriptions s JOIN m ON m.master_id=s.master_id
      WHERE s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='en'
      ORDER BY s.master_id`)).rows as any[];

  const plans: Plan[] = [];
  const blocked: Blocked[] = [];
  const already: string[] = [];
  let enCanonicalTotal = 0, displayPass = 0;

  for (const row of rows) {
    enCanonicalTotal++;
    const sum = String(row.summary ?? '');
    const isDefect = sum.length === 120 && !/[.!?]\s*$/.test(sum);
    if (!isDefect) {
      // 멱등 재실행 판별: 이미 재조립된 행인지(= 파생 요약과 일치) 확인
      const line = introFirstLine(String(row.content));
      if (line !== null && deriveLeafletSummary(line) === sum) already.push(row.master_id);
      else displayPass++;
      continue;
    }
    const p = planOne(row, routeBy.get(row.master_id) ?? null);
    if (isBlocked(p)) blocked.push(p); else plans.push(p);
  }

  let units = plans;
  const only = arg('--only');
  if (only) units = units.filter((u) => u.masterId === only);
  const limit = arg('--limit') ? parseInt(arg('--limit')!, 10) : undefined;
  if (limit) units = units.slice(0, limit);

  // run 간 byte-identical 산출물 — 실행 시각·순서에 의존하지 않는다
  const planDigest = sha256(units.map((u) => `${u.masterId}|${u.oldHash}|${u.newHash}|${u.newSummary}`).sort().join('\n'));
  const lenBuckets: Record<string, number> = {};
  for (const u of units) {
    const b = u.lenNew < 120 ? '<120' : u.lenNew < 200 ? '120-199' : u.lenNew < 300 ? '200-299' : u.lenNew < 400 ? '300-399' : '400+';
    lenBuckets[b] = (lenBuckets[b] || 0) + 1;
  }
  const byRoute: Record<string, number> = {};
  for (const u of units) byRoute[u.route || 'null'] = (byRoute[u.route || 'null'] || 0) + 1;

  writeLedger(OUT_PLAN, JSON.stringify({
    wo: WO, kind: 'summary-rebuild-plan', mode: MODE, planDigest,
    enCanonicalTotal, displayPass, alreadyRebuilt: already.length, target: units.length, blocked: blocked.length,
    byRoute, lenBuckets, blockedRows: blocked,
    rows: units.map((u) => ({ masterId: u.masterId, descId: u.descId, route: u.route, oldHash: u.oldHash, newHash: u.newHash, lenOld: u.lenOld, lenNew: u.lenNew, oldSummary: u.oldSummary, newSummary: u.newSummary })),
  }, null, 2) + '\n');

  const results: any[] = [];
  const checkpoints: any[] = [];
  if (MODE !== 'dry-run') {
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const rep: any = { masterId: u.masterId, descId: u.descId, route: u.route, oldHash: u.oldHash, newHash: u.newHash };
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
          await c.query('ROLLBACK TO SAVEPOINT sp_row');
          await c.query('ROLLBACK');
          rep.status = 'EXCEPTION'; rep.writeActual = 0; rep.error = e instanceof Error ? e.message : String(e);
        }
      } finally { c.release(); }

      // 독립 커넥션 사후 확인 — GREEN 은 반영, 그 외는 residue 0
      const after = (await pool.query(`SELECT md5(content) h, summary FROM shared_product_descriptions WHERE id=$1::uuid`, [u.descId])).rows[0];
      if (rep.status === 'GREEN') {
        rep.postVerify = after.h === u.newHash && after.summary === u.newSummary;
        if (!rep.postVerify) { rep.status = 'EXCEPTION'; rep.error = '커밋 후 독립검증 실패'; }
      } else {
        rep.residueClean = after.h === u.oldHash && after.summary === u.oldSummary;
      }
      results.push(rep);
      if ((i + 1) % 50 === 0 || i === units.length - 1) console.error(`[${i + 1}/${units.length}] ${rep.status}`);
      if ((i + 1) % CHECKPOINT_EVERY === 0 || i === units.length - 1) {
        checkpoints.push({ checkpoint: checkpoints.length + 1, processed: results.length, lastMasterId: u.masterId,
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
    wo: WO, mode: MODE, startedAt: RUN_STARTED, port: port(), planDigest,
    enCanonicalTotal, displayPass, alreadyRebuilt: already.length, target: units.length,
    blocked: blocked.length, blockedByCode: blocked.reduce((a: any, b) => (a[b.code] = (a[b.code] || 0) + 1, a), {}),
    green, rollbackTestPass: rbt, exception: exc.length, residueDirty,
    writeActual: results.reduce((t, r) => t + (r.writeActual || 0), 0),
    auditRowsWritten: 0,
    byRoute, lenBuckets,
    pass: blocked.length === 0 && exc.length === 0 && residueDirty === 0
      && (MODE === 'dry-run' ? results.length === 0 : results.length === units.length)
      && (MODE !== 'APPLY' || green === units.length),
  };
  if (MODE !== 'dry-run') writeLedger(OUT_RESULT, JSON.stringify({ wo: WO, kind: 'summary-rebuild-result', summary, results, exceptions: exc }, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n=== ${MODE} · target ${units.length} · blocked ${blocked.length} · GREEN ${green} · RBT ${rbt} · EXC ${exc.length} · planDigest ${planDigest.slice(0, 16)} · PASS=${summary.pass} ===`);
  if (!summary.pass) process.exitCode = 2;
}

main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
