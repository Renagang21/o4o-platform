/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — 단계 9·11 LIVE 적용 / rollback 시험
 *
 * `--rollback` 과 LIVE 는 **같은 write 함수**(`applyMaster`)를 쓴다. 다른 것은 마지막 한 줄
 * (COMMIT vs ROLLBACK) 뿐이다. 그래야 rollback 시험이 실제 write 경로를 시험한 것이 된다.
 *
 * master 1건 = transaction 1개. 계약:
 *   · 기존 활성 KO canonical 을 `SELECT … FOR UPDATE` 로 잠근다
 *   · before content hash guard — 계획 시점과 다르면 그 master 만 GUARD_MISS 로 건너뛴다
 *   · REPLACE 는 기존 행을 지우지 않고 `status='deprecated'` 로 강등한다(감사 추적 보존)
 *   · 신규 정상본을 canonical 로 INSERT
 *   · **같은 transaction 안에서** post-verify: 활성 canonical 1개 · 본문 md5 일치
 *   · 실패 master 는 rollback 하고 문제 큐에 넣는다. 다음 master 를 계속 처리한다
 *
 * 손대지 않는 것: ProductMaster · ProductIdentifier · 다른 언어 본문 · sourceRef · 대상 밖 행.
 *
 * 산출 (results/):
 *   apply-result-{mode}.jsonl   master 별 결과 (미추적)
 *   apply-summary-{mode}.json   집계 (추적)
 *
 * 사용:
 *   PGPASSWORD=... node apply-live.mjs --rollback   # 강제 rollback 시험
 *   PGPASSWORD=... node apply-live.mjs --live       # 실제 적용
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const CONCURRENCY = parseInt(arg('--concurrency', '4'), 10);
const LIVE = process.argv.includes('--live');
const ROLLBACK = process.argv.includes('--rollback');
const LIMIT = parseInt(arg('--limit', '0'), 10);

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

const SELECT_ACTIVE = `
  SELECT id::text "descId", md5(content) "md5", status, source_type "sourceType"
  FROM shared_product_descriptions
  WHERE master_id = $1::uuid AND description_type='STORE'
    AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL
  ORDER BY id
  FOR UPDATE`;

/**
 * master 1건 write. commit 여부는 호출부가 정한다 — LIVE 와 rollback 시험이 같은 경로를 타야 한다.
 * 반환: { status, ... }. 예외를 던지지 않고 결과로 돌려준다(개별 실패가 전체를 멈추지 않는다).
 */
export async function applyMaster(client, planRow, leaf, { commit }) {
  const newMd5 = md5(leaf.html);
  await client.query('BEGIN');
  try {
    const active = (await client.query(SELECT_ACTIVE, [planRow.masterId])).rows;

    // ── guard: 계획 시점 상태와 일치하는가 ──────────────────────────────────
    if (planRow.action === 'CREATE_NEW_KO' && active.length !== 0) {
      await client.query('ROLLBACK');
      return { status: 'GUARD_MISS', reason: `expected 0 active, found ${active.length}` };
    }
    if (planRow.action === 'REPLACE_EXISTING_KO') {
      if (active.length !== 1) {
        await client.query('ROLLBACK');
        return { status: 'GUARD_MISS', reason: `expected 1 active, found ${active.length}` };
      }
      if (active[0].descId !== planRow.beforeDescId || active[0].md5 !== planRow.beforeMd5) {
        await client.query('ROLLBACK');
        return { status: 'GUARD_MISS', reason: 'before content hash 불일치' };
      }
    }
    if (planRow.action !== 'CREATE_NEW_KO' && planRow.action !== 'REPLACE_EXISTING_KO') {
      await client.query('ROLLBACK');
      return { status: 'SKIPPED', reason: planRow.action };
    }

    // ── 기존 canonical 강등 (물리 삭제 아님 — 감사 추적 보존) ────────────────
    let demoted = 0;
    if (planRow.action === 'REPLACE_EXISTING_KO') {
      const r = await client.query(`
        UPDATE shared_product_descriptions
        SET status='deprecated', updated_at=now()
        WHERE id = $1::uuid AND status='canonical' AND deleted_at IS NULL`, [planRow.beforeDescId]);
      demoted = r.rowCount;
      if (demoted !== 1) {
        await client.query('ROLLBACK');
        return { status: 'GUARD_MISS', reason: `demote rowCount=${demoted}` };
      }
    }

    // ── 신규 정상본 ────────────────────────────────────────────────────────
    const ins = await client.query(`
      INSERT INTO shared_product_descriptions
        (master_id, content, summary, source_type, source_ref_id, status, language, description_type)
      VALUES ($1::uuid, $2, $3, 'mfds_easy_drug', $4::uuid, 'canonical', 'ko', 'STORE')
      RETURNING id::text`, [planRow.masterId, leaf.html, leaf.summary, leaf.sourceCandidateId || null]);
    const newId = ins.rows[0].id;

    // ── 같은 transaction 안에서 post-verify ────────────────────────────────
    const after = (await client.query(`
      SELECT id::text "descId", md5(content) "md5", source_type "sourceType"
      FROM shared_product_descriptions
      WHERE master_id = $1::uuid AND description_type='STORE'
        AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`,
    [planRow.masterId])).rows;
    if (after.length !== 1) {
      await client.query('ROLLBACK');
      return { status: 'POST_VERIFY_FAIL', reason: `active canonical=${after.length}` };
    }
    if (after[0].descId !== newId || after[0].md5 !== newMd5 || after[0].sourceType !== 'mfds_easy_drug') {
      await client.query('ROLLBACK');
      return { status: 'POST_VERIFY_FAIL', reason: 'canonical 본문·출처 불일치' };
    }

    await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    return { status: commit ? 'APPLIED' : 'ROLLED_BACK', newDescId: newId, demoted, newMd5 };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* 연결이 이미 끊긴 경우 */ }
    return { status: 'ERROR', reason: String(e?.message ?? e) };
  }
}

async function main() {
  if (LIVE === ROLLBACK) throw new Error('STOP: --live 또는 --rollback 중 하나를 지정한다');
  const mode = LIVE ? 'live' : 'rollback';

  const plan = readJsonl(path.join(RESULTS, 'plan-run2.jsonl'))
    .filter((r) => r.action === 'CREATE_NEW_KO' || r.action === 'REPLACE_EXISTING_KO');
  const leaflets = new Map(readJsonl(path.join(RESULTS, 'leaflets.jsonl')).map((l) => [l.masterId, l]));
  const targets = (LIMIT > 0 ? plan.slice(0, LIMIT) : plan);

  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT,
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 120000, max: CONCURRENCY + 1,
  });

  const results = []; const counts = {};
  const startedAt = new Date().toISOString();
  let cursor = 0;

  const worker = async () => {
    const client = await pool.connect();
    try {
      for (;;) {
        const i = cursor; cursor += 1;
        if (i >= targets.length) break;
        const row = targets[i];
        const leaf = leaflets.get(row.masterId);
        const r = leaf
          ? await applyMaster(client, row, leaf, { commit: LIVE })
          : { status: 'ERROR', reason: 'leaflet 없음' };
        counts[r.status] = (counts[r.status] ?? 0) + 1;
        results.push({ masterId: row.masterId, itemSeq: row.itemSeq, action: row.action, ...r });
        if (results.length % 2000 === 0) process.stderr.write(`${results.length}/${targets.length}\n`);
      }
    } finally { client.release(); }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  results.sort((a, b) => (a.masterId < b.masterId ? -1 : 1));
  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    step: LIVE ? '9-live-apply' : '11-rollback-test',
    mode, concurrency: CONCURRENCY,
    startedAt, finishedAt: new Date().toISOString(),
    targets: targets.length,
    statuses: counts,
    problemQueue: results.filter((r) => r.status === 'GUARD_MISS' || r.status === 'POST_VERIFY_FAIL' || r.status === 'ERROR')
      .slice(0, 50),
    systemFailures: results.filter((r) => r.status === 'ERROR').length,
  };

  fs.writeFileSync(path.join(RESULTS, `apply-result-${mode}.jsonl`), results.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, `apply-summary-${mode}.json`), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  await pool.end();
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (invokedDirectly) main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
