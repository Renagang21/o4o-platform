/**
 * WO-O4O-EASY-DRUG-KO-DERIVED-TRANSLATION-UNPUBLISH-V1 — 파생 EN·ZH 공개 노출 중단
 *
 * 교체 전 KO 에서 파생된 번역이 QR·태블릿·공개 목록에 계속 노출되는 것을 막는다.
 * **바꾸는 것은 `status` 한 컬럼뿐이다.** 본문·source_ref_id 는 byte-identical 로 유지한다.
 *
 * 대상 원장은 커밋된 census(`translation-status-ledger.jsonl`)를 쓰되, **LIVE 에서 다시 guard**
 * 한다. census 시점과 지금이 다르면 그 행은 건드리지 않고 GUARD_MISS 로 뺀다.
 *
 * dry-run · rollback · live 는 **같은 write 함수**(`hideBatch`)를 쓴다. COMMIT/ROLLBACK 한 줄만 다르다.
 *
 * guard (행 단위):
 *   · `status='canonical'` · `COALESCE(language,'ko') <> 'ko'` · `description_type='STORE'`
 *   · `md5(content)` 가 census 원장과 일치 · master 가 이번 모집단 안
 * post-verify (같은 transaction 안):
 *   · status='hidden' · md5(content) 불변 · source_ref_id 불변
 *
 * 산출 (results/):
 *   hide-plan-{tag}.jsonl        대상 원장 (미추적)
 *   hide-summary-{mode}.json     집계 + planDigest (추적)
 *
 * 사용:
 *   PGPASSWORD=... node hide-derived-translations.mjs --dry-run --tag run1
 *   PGPASSWORD=... node hide-derived-translations.mjs --rollback
 *   PGPASSWORD=... node hide-derived-translations.mjs --live
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const TAG = arg('--tag', '');
const BATCH = parseInt(arg('--batch', '200'), 10);
const LIVE = process.argv.includes('--live');
const ROLLBACK = process.argv.includes('--rollback');
const DRY = process.argv.includes('--dry-run');

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

const SELECT_LOCK = `
  SELECT id::text "descId", master_id::text "masterId", COALESCE(language,'ko') lang,
         status, md5(content) "md5", COALESCE(source_ref_id::text,'') "sourceRefId",
         description_type "descriptionType"
  FROM shared_product_descriptions
  WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL
  ORDER BY id
  FOR UPDATE`;

/**
 * 한 배치 write. commit 여부는 호출부가 정한다 — dry-run·rollback·LIVE 가 같은 경로를 타야 한다.
 * 예외를 던지지 않고 결과로 돌려준다(배치 실패가 전체를 멈추지 않는다).
 */
export async function hideBatch(client, rows, { commit }) {
  const want = new Map(rows.map((r) => [r.descId, r]));
  await client.query('BEGIN');
  try {
    const locked = (await client.query(SELECT_LOCK, [[...want.keys()]])).rows;
    const ok = []; const miss = [];
    const beforeById = new Map();
    for (const r of locked) {
      const w = want.get(r.descId);
      const bad = r.status !== 'canonical' ? `status=${r.status}`
        : r.lang === 'ko' ? 'language=ko'
          : r.descriptionType !== 'STORE' ? `descriptionType=${r.descriptionType}`
            : r.md5 !== w.translationMd5 ? 'content md5 불일치'
              : null;
      if (bad) miss.push({ descId: r.descId, reason: bad });
      else { ok.push(r.descId); beforeById.set(r.descId, r); }
    }
    for (const id of want.keys()) {
      if (!locked.some((r) => r.descId === id)) miss.push({ descId: id, reason: '행 없음(삭제·미존재)' });
    }

    let updated = 0;
    if (ok.length) {
      // 본문·source_ref 는 SET 하지 않는다. WHERE 에 status 를 한 번 더 걸어 경합을 막는다.
      const u = await client.query(`
        UPDATE shared_product_descriptions
        SET status='hidden', updated_at=now()
        WHERE id = ANY($1::uuid[]) AND status='canonical' AND deleted_at IS NULL
          AND COALESCE(language,'ko') <> 'ko'
        RETURNING id::text`, [ok]);
      updated = u.rows.length;
      if (updated !== ok.length) {
        await client.query('ROLLBACK');
        return { status: 'GUARD_MISS', reason: `update rowCount ${updated} != ${ok.length}`, updated: 0, miss };
      }

      // ── 같은 transaction 안 post-verify: status 만 바뀌고 본문·source_ref 는 그대로인가 ──
      const after = (await client.query(`
        SELECT id::text "descId", status, md5(content) "md5", COALESCE(source_ref_id::text,'') "sourceRefId"
        FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ok])).rows;
      for (const a of after) {
        const b = beforeById.get(a.descId);
        if (a.status !== 'hidden' || a.md5 !== b.md5 || a.sourceRefId !== b.sourceRefId) {
          await client.query('ROLLBACK');
          return { status: 'POST_VERIFY_FAIL', reason: `descId=${a.descId}`, updated: 0, miss };
        }
      }
    }

    await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    return { status: commit ? 'APPLIED' : 'ROLLED_BACK', updated, miss };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* 연결이 이미 끊긴 경우 */ }
    return { status: 'ERROR', reason: String(e?.message ?? e), updated: 0, miss: [] };
  }
}

async function main() {
  const modes = [LIVE, ROLLBACK, DRY].filter(Boolean).length;
  if (modes !== 1) throw new Error('STOP: --live · --rollback · --dry-run 중 하나만 지정한다');
  const mode = LIVE ? 'live' : ROLLBACK ? 'rollback' : 'dry-run';

  const ledger = readJsonl(path.join(RESULTS, 'translation-status-ledger.jsonl'))
    .filter((r) => r.classification !== 'ALREADY_FROM_CURRENT_KO')
    .sort((a, b) => (a.descId < b.descId ? -1 : 1));

  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT,
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 300000, max: 2,
  });

  // ── LIVE guard 재확인 (계획 단계에서도 현재 상태를 다시 읽는다) ─────────────
  const client = await pool.connect();
  const plan = []; const skipped = [];
  for (let i = 0; i < ledger.length; i += 500) {
    const chunk = ledger.slice(i, i + 500);
    const now = new Map((await client.query(`
      SELECT id::text "descId", master_id::text "masterId", COALESCE(language,'ko') lang,
             status, md5(content) "md5", COALESCE(source_ref_id::text,'') "sourceRefId"
      FROM shared_product_descriptions
      WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`, [chunk.map((r) => r.descId)]))
      .rows.map((r) => [r.descId, r]));
    for (const r of chunk) {
      const cur = now.get(r.descId);
      if (!cur) { skipped.push({ descId: r.descId, reason: 'ROW_GONE' }); continue; }
      if (cur.status !== 'canonical') { skipped.push({ descId: r.descId, reason: `STATUS_${cur.status}` }); continue; }
      if (cur.md5 !== r.translationMd5) { skipped.push({ descId: r.descId, reason: 'CONTENT_CHANGED' }); continue; }
      if (cur.lang === 'ko') { skipped.push({ descId: r.descId, reason: 'LANG_KO' }); continue; }
      plan.push({ ...r, currentStatus: cur.status, currentMd5: cur.md5, currentSourceRefId: cur.sourceRefId });
    }
  }
  client.release();

  const byLang = {}; const byClass = {};
  for (const r of plan) {
    byLang[r.lang] = (byLang[r.lang] ?? 0) + 1;
    byClass[r.classification] = (byClass[r.classification] ?? 0) + 1;
  }
  const planDigest = sha256(plan.map((r) => `${r.descId}|${r.masterId}|${r.lang}|${r.translationMd5}|${r.classification}`).join('\n'));

  let applied = 0; const problems = []; let batches = 0;
  if (!DRY) {
    for (let i = 0; i < plan.length; i += BATCH) {
      const c = await pool.connect();
      try {
        const r = await hideBatch(c, plan.slice(i, i + BATCH), { commit: LIVE });
        batches += 1;
        applied += r.updated;
        if (r.status === 'GUARD_MISS' || r.status === 'POST_VERIFY_FAIL' || r.status === 'ERROR') {
          problems.push({ batchStart: i, status: r.status, reason: r.reason });
        }
        if (r.miss?.length) problems.push(...r.miss.slice(0, 5).map((m) => ({ batchStart: i, ...m })));
      } finally { c.release(); }
      if (batches % 20 === 0) process.stderr.write(`${i + BATCH}/${plan.length}\n`);
    }
  }

  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-DERIVED-TRANSLATION-UNPUBLISH-V1',
    step: 'hide-derived-translations',
    mode, tag: TAG || null, batchSize: BATCH,
    ledgerRows: ledger.length,
    planned: plan.length,
    skippedAtPlan: skipped.length,
    skipReasons: skipped.reduce((a, s) => ({ ...a, [s.reason]: (a[s.reason] ?? 0) + 1 }), {}),
    byLang, byClass,
    planDigest,
    batches,
    statusUpdated: LIVE ? applied : 0,
    rolledBackUpdates: ROLLBACK ? applied : 0,
    problems: problems.slice(0, 50),
    problemCount: problems.length,
    contentWrites: 0,
    sourceRefWrites: 0,
    koWrites: 0,
  };
  fs.writeFileSync(path.join(RESULTS, `hide-plan${TAG ? `-${TAG}` : ''}.jsonl`),
    plan.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, `hide-summary-${mode}${TAG ? `-${TAG}` : ''}.json`), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  await pool.end();
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (invokedDirectly) main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
