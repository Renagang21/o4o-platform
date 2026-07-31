/**
 * WO-O4O-DRUG-OTC-KO-STORE-HARDCUT-RECOVERY-V1
 *   — `HC-CARD-SUMMARY` 250 복구 실행기 (단일 write owner)
 *
 * 대상(조사로 확정 · 코드가 아니라 데이터가 정한다):
 *   KO STORE OTC canonical 15,908 중 **요약 컬럼이 NULL 이면서** 한눈에 보기 `작용` 타일이
 *   sd-intro 첫 줄의 **정확히 120자 접두**에서 끊긴 문서.
 *   → `otc-ko-store-hardcut-recovery-census.ga.ts` 실측 **250** (전건 summary IS NULL).
 *   기존 러너 `otc-ko-summary-rebuild.ga.ts` 는 summary NULL 행을 명시적으로 건너뛰므로 이 250 을 다루지 못한다.
 *
 * 변경: 본문 HTML 의 **표시값 2지점만** — 한눈에 보기 `작용` 타일, 그리고 그 타일과 **값이 정확히 같은** sd-hero 배지.
 * 불변: **summary 컬럼(NULL 유지 — 요약 신규 생성 금지)** · 본문 6섹션 · 수치/연령/횟수/간격/기간 ·
 *       경고 강도 · footer · sourceRef · canonical 상태 · EN/타 언어 전량.
 *
 * 새 값 규칙: 신규 규칙을 만들지 않는다. `otc-leaflet-summary.shared.ts` 의 언어 중립
 *   `deriveLeafletSummary()`(EN·KO 에서 이미 검증된 단일 함수)를 sd-intro 첫 줄에 그대로 적용한다.
 *   ① 첫 완결 문장 ② 축약은 문장 경계에서만 ③ 의미 단위·의학적 조건 보존 ④ 어절 중간 절단 금지.
 *
 * 모드:
 *   (기본) dry-run      : write 0. 대상 선정 · 새 타일 값 · content hash · planDigest.
 *   --rollback-test     : 실제 UPDATE 실행 후 **항상 ROLLBACK**. 독립 커넥션으로 residue 0 확인.
 *   --apply --confirm   : LIVE. 추가로 env OTC_KO_CARD_TILE_REBUILD=CONFIRM 필수(2중 게이트).
 *
 * 멱등: 이미 재조립된 행(타일 = 파생값)은 대상에서 빠진다(write 0).
 * audit: 0행 — canonical 교체가 아닌 in-place 표시값 교정(선례: otc-ko-summary-rebuild · drug-otc-additive-warning-apply).
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-ko-store-hardcut-card-tile-rebuild.ga.ts [--port 5512] [--limit N] [--only <masterId>]
 *   ../../node_modules/.bin/tsx src/scripts/otc-ko-store-hardcut-card-tile-rebuild.ga.ts --rollback-test
 *   OTC_KO_CARD_TILE_REBUILD=CONFIRM ../../node_modules/.bin/tsx src/scripts/otc-ko-store-hardcut-card-tile-rebuild.ga.ts --apply --confirm
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { deriveLeafletSummary } from './otc-leaflet-summary.shared.js';

const WO = 'WO-O4O-DRUG-OTC-KO-STORE-HARDCUT-RECOVERY-V1';
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const CONFIRM_ENV = 'OTC_KO_CARD_TILE_REBUILD';
const CHECKPOINT_EVERY = 100;
const CUT = 120;                     // 조사에서 확정된 카드 타일의 유일한 고정 절단값

const has = (n: string): boolean => process.argv.includes(n);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => parseInt(arg('--port') || process.env.PROXY_PORT || '5512', 10);
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');
const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

type Mode = 'dry-run' | 'rollback-test' | 'APPLY';
const MODE: Mode = has('--rollback-test') ? 'rollback-test' : (has('--apply') && has('--confirm') ? 'APPLY' : 'dry-run');

const OUT_PLAN = path.join(DATA_DIR, 'otc-ko-store-hardcut-card-tile-plan.ga.json');
const OUT_RESULT = path.join(DATA_DIR, 'otc-ko-store-hardcut-card-tile-result.ga.json');
const OUT_CKPT = path.join(DATA_DIR, 'otc-ko-store-hardcut-card-tile-checkpoint.ga.json');

const escHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unescHtml = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

/** 저장된 KO HTML 에서 효능 첫 줄(= 저작 시 efficacy.split('\n')[0])을 복원한다. */
function introFirstLine(html: string): string | null {
  const m = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  if (!m) return null;
  return unescHtml(m[1].split('<br>')[0].split('\n')[0]).trim();
}
/** 한눈에 보기 `작용` 타일 — **원본 바이트(m[0])** 를 그대로 교체 지점으로 쓴다(재이스케이프 왕복 오차 차단). */
const TILE_RE = /<span class="sd-tag">작용<\/span>(\s*)<p>([\s\S]*?)<\/p>/;
const BADGE_RE = /<span class="sd-badge">([\s\S]*?)<\/span>/g;

interface Plan {
  masterId: string; descId: string;
  oldTile: string; newTile: string;
  oldHash: string; newHash: string; newContent: string;
  badgeReplaced: boolean; lenOld: number; lenNew: number;
}
interface Blocked { masterId: string; descId: string; code: string; detail: string }
const isBlocked = (p: Plan | Blocked): p is Blocked => 'code' in p;

/** 대상 1행의 재조립 계획 — 계약 위반은 전부 차단(추정 금지) */
function planOne(row: any): Plan | Blocked {
  const base = { masterId: row.master_id, descId: row.id };
  const content = String(row.content);
  if (row.summary !== null) return { ...base, code: 'SUMMARY_NOT_NULL', detail: '요약 컬럼 보유 — 본 러너 대상 아님' };

  const line = introFirstLine(content);
  if (line === null) return { ...base, code: 'NO_INTRO_SECTION', detail: 'sd-intro 단락 없음' };

  const m = content.match(TILE_RE);
  if (!m) return { ...base, code: 'NO_GLANCE_TILE', detail: '작용 타일 없음' };
  const tileMarkerOld = m[0];
  const oldTile = unescHtml(m[2]);
  if (oldTile.length !== CUT) return { ...base, code: 'NOT_FIXED_CUT', detail: `타일 길이 ${oldTile.length} ≠ ${CUT}` };
  if (!(line.length > CUT && line.slice(0, CUT) === oldTile)) {
    return { ...base, code: 'SOURCE_PARITY_MISMATCH', detail: '타일 ≠ 효능 첫 줄 120자 접두' };
  }

  const newTile = deriveLeafletSummary(line);
  if (!newTile) return { ...base, code: 'EMPTY_DERIVED_VALUE', detail: '파생값 공란' };
  if (newTile === oldTile) return { ...base, code: 'NO_CHANGE', detail: '파생값이 기존과 동일' };
  if (!newTile.startsWith(oldTile)) return { ...base, code: 'NOT_A_SUPERSET', detail: '새 값이 기존 값을 포함하지 않음' };
  if (!line.startsWith(newTile)) return { ...base, code: 'NOT_SUBSTRING_OF_SOURCE', detail: '새 값이 효능 첫 줄의 접두가 아님' };
  if (newTile.length < oldTile.length) return { ...base, code: 'SHORTER_THAN_OLD', detail: '새 값이 더 짧음' };

  if (content.split(tileMarkerOld).length - 1 !== 1) return { ...base, code: 'GLANCE_TILE_NOT_UNIQUE', detail: '작용 타일 출현 ≠ 1' };
  const tileMarkerNew = `<span class="sd-tag">작용</span>${m[1]}<p>${escHtml(newTile)}</p>`;

  /* sd-hero 배지 — **값이 타일과 정확히 같을 때만** 함께 교체한다(다르면 손대지 않는다). */
  const badges = [...content.matchAll(BADGE_RE)].filter((b) => unescHtml(b[1]) === oldTile);
  if (badges.length > 1) return { ...base, code: 'HERO_BADGE_NOT_UNIQUE', detail: `동일값 배지 ${badges.length} > 1` };
  const badgeOld = badges.length === 1 ? badges[0][0] : null;
  const badgeNew = badgeOld ? `<span class="sd-badge">${escHtml(newTile)}</span>` : null;
  if (badgeOld && content.split(badgeOld).length - 1 !== 1) {
    return { ...base, code: 'HERO_BADGE_NOT_UNIQUE', detail: '배지 마커 출현 ≠ 1' };
  }

  let newContent = content.replace(tileMarkerOld, tileMarkerNew);
  if (badgeOld && badgeNew) newContent = newContent.replace(badgeOld, badgeNew);

  /* 역패치 복원 — 허용 범위 밖 diff 0 의 실측 증명(byte 단위) */
  let restored = newContent.replace(tileMarkerNew, tileMarkerOld);
  if (badgeOld && badgeNew) restored = restored.replace(badgeNew, badgeOld);
  if (restored !== content) return { ...base, code: 'REVERSE_PATCH_MISMATCH', detail: '역패치 복원 불일치' };

  /* 길이 델타 = 교체 지점 수 × 이스케이프 길이 증가분과 정확히 일치 */
  const delta = (1 + (badgeOld ? 1 : 0)) * (escHtml(newTile).length - escHtml(oldTile).length);
  if (newContent.length - content.length !== delta) {
    return { ...base, code: 'LENGTH_DELTA_MISMATCH', detail: `delta ${newContent.length - content.length} ≠ ${delta}` };
  }

  /* 구조 불변 — 섹션 수 · 목록 수 · 마커 소실 금지(존재 요구가 아니다) */
  const h2Old = (content.match(/<h2>/g) || []).length, h2New = (newContent.match(/<h2>/g) || []).length;
  const liOld = (content.match(/<li>/g) || []).length, liNew = (newContent.match(/<li>/g) || []).length;
  if (h2Old !== h2New || liOld !== liNew) return { ...base, code: 'STRUCTURE_DRIFT', detail: `h2 ${h2Old}→${h2New} li ${liOld}→${liNew}` };
  for (const marker of ['sd-foot', 'sd-intake', 'sd-cta', 'sd-warn', 'sd-core', 'sd-intro']) {
    if (content.includes(marker) && !newContent.includes(marker)) return { ...base, code: 'MARKER_LOST', detail: `${marker} 소실` };
  }
  /* 본문 6섹션 텍스트 불변 — intro/intake/warn 는 교체 지점이 아니다 */
  const bodyOf = (h: string): string => [
    h.match(/<p class="sd-intro">([\s\S]*?)<\/p>/)?.[1] ?? '',
    h.match(/<p class="sd-intake">([\s\S]*?)<\/p>/)?.[1] ?? '',
    (h.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || []).join('|'),
    h.match(/<p class="sd-foot">([\s\S]*?)<\/p>/)?.[1] ?? '',
  ].join(' ');
  if (bodyOf(content) !== bodyOf(newContent)) return { ...base, code: 'BODY_SECTION_DRIFT', detail: '본문 6섹션 변경 감지' };

  return {
    ...base, oldTile, newTile, oldHash: md5(content), newHash: md5(newContent), newContent,
    badgeReplaced: !!badgeOld, lenOld: oldTile.length, lenNew: newTile.length,
  };
}

/** LIVE UPDATE 1행 — 낙관적 잠금(md5 대조) · rowCount 1 강제 · **summary 미변경** */
async function execUpdate(c: PoolClient, p: Plan): Promise<void> {
  const r = await c.query(
    `UPDATE shared_product_descriptions
        SET content=$2, updated_at=now()
      WHERE id=$1::uuid AND status='canonical' AND description_type='STORE'
        AND COALESCE(language,'ko')='ko' AND source_type='mfds_drug_otc' AND deleted_at IS NULL
        AND summary IS NULL AND md5(content)=$3
      RETURNING id`,
    [p.descId, p.newContent, p.oldHash]);
  if (r.rowCount !== 1) throw new Error(`UPDATE rowCount ${r.rowCount}!==1 (선점 또는 hash 불일치)`);

  const v = (await c.query(
    `SELECT md5(content) h, summary, status, description_type dtype, COALESCE(language,'ko') lang,
            source_type stype, source_ref_id::text sref, master_id::text mid, deleted_at
       FROM shared_product_descriptions WHERE id=$1::uuid`, [p.descId])).rows[0];
  const fail: string[] = [];
  if (v.h !== p.newHash) fail.push('contentHash 불일치');
  if (v.summary !== null) fail.push('summary 가 NULL 이 아님(요약 신규 생성 금지 위반)');
  if (v.status !== 'canonical') fail.push(`status=${v.status}`);
  if (v.dtype !== 'STORE') fail.push(`description_type=${v.dtype}`);
  if (v.lang !== 'ko') fail.push(`language=${v.lang}`);
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
  const pool = new Pool({
    host: '127.0.0.1', port: port(), database: 'o4o_platform', statement_timeout: 900000, max: 4,
    user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD,
  });

  /* 모집단은 코호트가 아니라 전수다 — 대상은 여기서 다시 계산한다(원장 재사용 금지) */
  const rows = (await pool.query(
    `SELECT s.id::text id, s.master_id::text master_id, s.content, s.summary
       FROM shared_product_descriptions s
      WHERE s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko'
      ORDER BY s.master_id`)).rows as any[];

  const plans: Plan[] = [];
  const blocked: Blocked[] = [];
  let koCanonicalTotal = 0, summaryPresent = 0, notCut = 0, alreadyRebuilt = 0;

  for (const row of rows) {
    koCanonicalTotal++;
    if (row.summary !== null) { summaryPresent++; continue; }        // 요약 보유 행은 기존 러너 소관
    const content = String(row.content);
    const line = introFirstLine(content);
    const m = content.match(TILE_RE);
    const tile = m ? unescHtml(m[2]) : null;
    const isDefect = tile !== null && tile.length === CUT && line !== null && line.length > CUT && line.slice(0, CUT) === tile;
    if (!isDefect) {
      if (tile !== null && line !== null && deriveLeafletSummary(line) === tile) alreadyRebuilt++;  // 멱등 재실행
      else notCut++;
      continue;
    }
    const p = planOne(row);
    if (isBlocked(p)) blocked.push(p); else plans.push(p);
  }

  let units = plans;
  const only = arg('--only');
  if (only) units = units.filter((u) => u.masterId === only);
  const limit = arg('--limit') ? parseInt(arg('--limit')!, 10) : undefined;
  if (limit) units = units.slice(0, limit);

  // run 간 byte-identical 산출물 — 실행 시각·순서에 의존하지 않는다
  const planDigest = sha256(units.map((u) => `${u.masterId}|${u.oldHash}|${u.newHash}|${u.newTile}`).sort().join('\n'));
  const lenBuckets: Record<string, number> = {};
  for (const u of units) {
    const b = u.lenNew < 150 ? '120-149' : u.lenNew < 200 ? '150-199' : u.lenNew < 300 ? '200-299' : '300+';
    lenBuckets[b] = (lenBuckets[b] || 0) + 1;
  }

  writeLedger(OUT_PLAN, JSON.stringify({
    wo: WO, kind: 'card-tile-rebuild-plan', mode: MODE, planDigest,
    koCanonicalTotal, summaryPresent, summaryNullNotCut: notCut, alreadyRebuilt,
    target: units.length, blocked: blocked.length,
    badgeReplaced: units.filter((u) => u.badgeReplaced).length, lenBuckets,
    blockedByCode: blocked.reduce((a: any, b) => (a[b.code] = (a[b.code] || 0) + 1, a), {}),
    blockedRows: blocked.slice(0, 200),
    rows: units.map((u) => ({
      masterId: u.masterId, descId: u.descId, oldHash: u.oldHash, newHash: u.newHash,
      badgeReplaced: u.badgeReplaced, lenOld: u.lenOld, lenNew: u.lenNew, oldTile: u.oldTile, newTile: u.newTile,
    })),
  }, null, 2) + '\n');

  const results: any[] = [];
  const checkpoints: any[] = [];
  if (MODE !== 'dry-run') {
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const rep: any = { masterId: u.masterId, descId: u.descId, oldHash: u.oldHash, newHash: u.newHash };
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

      // 독립 커넥션 사후 확인 — GREEN 은 반영, 그 외는 residue 0
      const after = (await pool.query(
        `SELECT md5(content) h, summary FROM shared_product_descriptions WHERE id=$1::uuid`, [u.descId])).rows[0];
      if (rep.status === 'GREEN') {
        rep.postVerify = after.h === u.newHash && after.summary === null;
        if (!rep.postVerify) { rep.status = 'EXCEPTION'; rep.error = '커밋 후 독립검증 실패'; }
      } else {
        rep.residueClean = after.h === u.oldHash && after.summary === null;
      }
      results.push(rep);
      if ((i + 1) % 50 === 0 || i === units.length - 1) console.error(`[${i + 1}/${units.length}] ${rep.status}`);
      if ((i + 1) % CHECKPOINT_EVERY === 0 || i === units.length - 1) {
        checkpoints.push({
          checkpoint: checkpoints.length + 1, processed: results.length, lastMasterId: u.masterId,
          green: results.filter((r) => r.status === 'GREEN').length,
          exception: results.filter((r) => r.status === 'EXCEPTION').length,
          writeActual: results.reduce((t, r) => t + (r.writeActual || 0), 0), at: new Date().toISOString(),
        });
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
    koCanonicalTotal, summaryPresent, summaryNullNotCut: notCut, alreadyRebuilt,
    target: units.length, blocked: blocked.length,
    blockedByCode: blocked.reduce((a: any, b) => (a[b.code] = (a[b.code] || 0) + 1, a), {}),
    badgeReplaced: units.filter((u) => u.badgeReplaced).length,
    green, rollbackTestPass: rbt, exception: exc.length, residueDirty,
    writeActual: results.reduce((t, r) => t + (r.writeActual || 0), 0),
    summaryColumnWrites: 0, auditRowsWritten: 0, lenBuckets,
    pass: blocked.length === 0 && exc.length === 0 && residueDirty === 0
      && (MODE === 'dry-run' ? results.length === 0 : results.length === units.length)
      && (MODE !== 'APPLY' || green === units.length),
  };
  if (MODE !== 'dry-run') writeLedger(OUT_RESULT, JSON.stringify({ wo: WO, kind: 'card-tile-rebuild-result', summary, results, exceptions: exc }, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n=== ${MODE} · target ${units.length} · blocked ${blocked.length} · GREEN ${green} · RBT ${rbt} · EXC ${exc.length} · planDigest ${planDigest.slice(0, 16)} · PASS=${summary.pass} ===`);
  if (!summary.pass) process.exitCode = 2;
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
