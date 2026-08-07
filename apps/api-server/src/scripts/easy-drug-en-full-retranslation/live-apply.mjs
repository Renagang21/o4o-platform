/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1
 * 단계 10~13: dry-run · rollback test · LIVE apply. **세 모드가 완전히 같은 코드 경로**를 탄다.
 *
 *   --mode dry       읽기 전용. 트랜잭션 없이 사전조건만 재확인한다 (DB write 0).
 *   --mode rollback  실제 트랜잭션으로 UPDATE/INSERT 후 in-TX 검증까지 하고 **ROLLBACK**.
 *   --mode live      같은 경로로 수행하고 **COMMIT**.
 *
 * 번역을 만들지도 고치지도 않는다. plan ledger 의 productionEnHash 와 1비트라도 다르면 적용하지 않는다.
 * master 단위 개별 트랜잭션이라 한 건의 데이터 문제는 APPLY_BLOCKED 로 남기고 루프는 계속한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import pg from 'pg';
import { RESULTS, EN_UNITS_PATH } from './tm-lib.mjs';
import { renderEnHtml, verifyRoundTrip } from './en-render.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const MODE = arg('--mode', 'dry');
const PORT = parseInt(arg('--port', '15461'), 10);
const LIMIT = parseInt(arg('--limit', '0'), 10);
const EXPECT_DIGEST = arg('--expect-digest', '');
const TAG = arg('--tag', MODE);
const PLAN = arg('--plan', path.join(RESULTS, 'live-apply-plan.jsonl'));
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');
if (!['dry', 'rollback', 'live'].includes(MODE)) throw new Error(`unknown --mode ${MODE}`);

const MAX_CONSECUTIVE_BLOCKED = 20;   // 연속 실패가 이만큼이면 개별 데이터 문제가 아니라 구조 문제다 → 전체 중지
const MAX_BLOCKED = 200;              // 누적 상한

function* streamJsonl(file) {
  const fd = fs.openSync(file, 'r');
  const decoder = new StringDecoder('utf8');
  try {
    const buf = Buffer.alloc(1 << 20);
    let tail = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n === 0) break;
      const lines = (tail + decoder.write(buf.subarray(0, n))).split('\n');
      tail = lines.pop() ?? '';
      for (const l of lines) if (l.trim()) yield JSON.parse(l);
    }
    tail += decoder.end();
    if (tail.trim()) yield JSON.parse(tail);
  } finally { fs.closeSync(fd); }
}

/* ── plan 재적재 + digest 재계산 ─────────────────────────────── */
const planRows = [...streamJsonl(PLAN)];
const digest = crypto.createHash('sha256')
  .update(planRows.map((r) => JSON.stringify(r)).join('\n'), 'utf8').digest('hex');
if (EXPECT_DIGEST && digest !== EXPECT_DIGEST) {
  throw new Error(`plan digest 불일치: ${digest} != ${EXPECT_DIGEST} — 계획이 바뀌었으므로 적용 중지`);
}

const segs = new Map();
for (const u of streamJsonl(EN_UNITS_PATH)) segs.set(u.masterId, u.segments);

const targets = planRows.filter((r) => r.action === 'UPDATE_SINGLE_HIDDEN_EN' || r.action === 'CREATE_NEW_EN');
// Cloud SQL Auth Proxy 의 access token 은 ~1시간이라 전 모집단 1회 실행이 중간에 끊긴다.
// master 단위 개별 트랜잭션이라 shard 로 잘라 이어 붙여도 결과가 같다(--offset/--limit).
const OFFSET = parseInt(arg('--offset', '0'), 10);
const work = targets.slice(OFFSET, LIMIT > 0 ? OFFSET + LIMIT : undefined);

/* ── DB ──────────────────────────────────────────────────────── */
const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform' });
// 프록시 토큰 만료로 연결이 끊기면 pg 가 unhandled 'error' 로 프로세스를 죽여 결과 파일조차 남지 않는다.
// 여기서 받아 두고 루프에서 stopReason 으로 정리한 뒤 부분 결과를 기록한다.
let connectionError = null;
client.on('error', (e) => { connectionError = String(e.message || e); });
const isConnectionLoss = (m) => /Connection terminated|ECONNRESET|ECONNREFUSED|server closed|terminating connection|Client has encountered/i.test(m);

await client.connect();
if (MODE === 'dry') await client.query('SET default_transaction_read_only = on');

const SQL_KO = `SELECT id::text "descId", md5(content) "md5", content, source_type "sourceType", status, (deleted_at IS NULL) alive
                FROM shared_product_descriptions WHERE id = $1::uuid`;
const SQL_EN_ALL = `SELECT id::text "descId", status, md5(content) "md5"
                    FROM shared_product_descriptions
                    WHERE master_id = $1::uuid AND description_type='STORE' AND language='en' AND deleted_at IS NULL`;
const SQL_EN_ONE = `SELECT id::text "descId", status, md5(content) "md5", content
                    FROM shared_product_descriptions WHERE id = $1::uuid AND deleted_at IS NULL`;

const counts = { updated: 0, inserted: 0, alreadyCurrent: 0, applyBlocked: 0, examined: 0 };
const blocked = [];
const undo = MODE === 'live' ? fs.createWriteStream(path.join(RESULTS, 'live-apply-undo.jsonl'), { flags: 'a' }) : null;
let consecutive = 0;
let stopReason = null;

for (const r of work) {
  counts.examined++;
  if (counts.examined % 1000 === 0) process.stderr.write(`${TAG} ${counts.examined}/${work.length} u=${counts.updated} i=${counts.inserted} c=${counts.alreadyCurrent} b=${counts.applyBlocked}\n`);
  const inTx = MODE !== 'dry';
  try {
    if (inTx) await client.query('BEGIN');

    // 1) KO canonical 재확인 (적용 순간 기준)
    const ko = (await client.query(inTx ? `${SQL_KO} FOR SHARE` : SQL_KO, [r.koDescriptionId])).rows[0];
    if (!ko || !ko.alive || ko.status !== 'canonical') throw new Error('KO canonical 소실');
    if (ko.md5 !== r.expectedKoHash) throw new Error(`KO drift ${ko.md5} != ${r.expectedKoHash}`);

    // 2) production artifact → EN HTML 재직렬화 (plan 시점과 1비트라도 다르면 중단)
    const seg = segs.get(r.masterId);
    if (!seg) throw new Error('en-units 세그먼트 없음');
    const rend = renderEnHtml(ko.content, seg);
    const rt = verifyRoundTrip(rend.html, rend.nodeTexts);
    if (!rt.ok) throw new Error(`round-trip ${rt.reason}`);
    const enHtml = rend.html;
    if (md5(enHtml) !== r.productionEnHash) throw new Error('productionEnHash 불일치');

    // 3) EN 현재 상태 재확인
    const enRows = (await client.query(SQL_EN_ALL, [r.masterId])).rows;
    const canonical = enRows.filter((x) => x.status === 'canonical');
    const hidden = enRows.filter((x) => x.status === 'hidden');
    if (canonical.length) {
      if (canonical.length === 1 && canonical[0].md5 === r.productionEnHash) {
        counts.alreadyCurrent++; consecutive = 0;
        if (inTx) await client.query('ROLLBACK');
        continue;                                   // 멱등 재실행 경로
      }
      throw new Error(`이미 canonical EN 존재(${canonical.length})`);
    }

    let targetId = null;
    if (r.action === 'UPDATE_SINGLE_HIDDEN_EN') {
      if (hidden.length !== 1) throw new Error(`hidden ${hidden.length} != 1`);
      if (hidden[0].descId !== r.existingEnId) throw new Error('hidden row id 변경');
      targetId = r.existingEnId;
    } else {
      if (enRows.length !== 0) throw new Error(`CREATE 대상인데 살아있는 EN ${enRows.length}건`);
    }

    if (MODE === 'dry') { counts[r.action === 'CREATE_NEW_EN' ? 'inserted' : 'updated']++; consecutive = 0; continue; }

    // 4) 쓰기
    if (targetId) {
      const prev = (await client.query(`${SQL_EN_ONE} FOR UPDATE`, [targetId])).rows[0];
      if (!prev || prev.status !== 'hidden') throw new Error('lock 후 hidden 아님');
      if (undo) undo.write(JSON.stringify({ masterId: r.masterId, action: 'UPDATE', descId: targetId, prevStatus: prev.status, prevMd5: prev.md5, prevContent: prev.content }) + '\n');
      const u = await client.query(
        `UPDATE shared_product_descriptions SET content=$1, status='canonical', updated_at=now()
         WHERE id=$2::uuid AND status='hidden' AND deleted_at IS NULL`, [enHtml, targetId]);
      if (u.rowCount !== 1) throw new Error(`UPDATE rowCount ${u.rowCount}`);
      counts.updated++;
    } else {
      const ins = await client.query(
        `INSERT INTO shared_product_descriptions (master_id, content, source_type, source_ref_id, status, language, description_type)
         VALUES ($1::uuid, $2, $3, $4::uuid, 'canonical', 'en', 'STORE') RETURNING id::text "descId"`,
        [r.masterId, enHtml, ko.sourceType, r.koDescriptionId]);
      targetId = ins.rows[0].descId;
      if (undo) undo.write(JSON.stringify({ masterId: r.masterId, action: 'INSERT', descId: targetId }) + '\n');
      counts.inserted++;
    }

    // 5) in-TX 사후 검증 — 커밋 전에 결과를 되읽어 확인한다
    const back = (await client.query(
      `SELECT md5(content) "md5", status, language, description_type "dt", (deleted_at IS NULL) alive
       FROM shared_product_descriptions WHERE id=$1::uuid`, [targetId])).rows[0];
    if (!back || !back.alive) throw new Error('post-verify: row 없음');
    if (back.md5 !== r.productionEnHash) throw new Error('post-verify: 해시 불일치');
    if (back.status !== 'canonical' || back.language !== 'en' || back.dt !== 'STORE') throw new Error('post-verify: 상태 불일치');
    const cnt = (await client.query(
      `SELECT count(*)::int n FROM shared_product_descriptions
       WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='en'
         AND status='canonical' AND deleted_at IS NULL`, [r.masterId])).rows[0].n;
    if (cnt !== 1) throw new Error(`post-verify: canonical EN ${cnt}건`);

    await client.query(MODE === 'live' ? 'COMMIT' : 'ROLLBACK');
    consecutive = 0;
  } catch (e) {
    const msg = String(e.message || e);
    if (connectionError || isConnectionLoss(msg)) {
      // 데이터 문제가 아니라 채널 문제다. 이 master 는 미착수로 두고 남은 구간은 다음 shard 에서 이어간다.
      counts.examined--;
      stopReason = `연결 끊김(${connectionError || msg}) — 프록시 재기동 후 --offset ${OFFSET + counts.examined} 로 재개`;
      break;
    }
    if (MODE !== 'dry') { try { await client.query('ROLLBACK'); } catch { /* 연결 자체가 끊긴 경우 */ } }
    counts.applyBlocked++; consecutive++;
    if (blocked.length < 200) blocked.push({ masterId: r.masterId, itemSeq: r.itemSeq, action: r.action, reason: String(e.message || e) });
    if (consecutive >= MAX_CONSECUTIVE_BLOCKED) { stopReason = `연속 ${consecutive}건 실패 — 개별 데이터 문제가 아님`; break; }
    if (counts.applyBlocked >= MAX_BLOCKED) { stopReason = `누적 차단 ${counts.applyBlocked}건 상한 도달`; break; }
  }
}
if (undo) await new Promise((res) => undo.end(res));
try { await client.end(); } catch { /* 이미 끊긴 연결 */ }

const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1',
  step: `live-apply(${MODE})`,
  planDigest: digest,
  planRows: planRows.length,
  targets: targets.length,
  shard: { offset: OFFSET, size: work.length, nextOffset: OFFSET + counts.examined },
  examined: counts.examined,
  updated: counts.updated,
  inserted: counts.inserted,
  alreadyCurrent: counts.alreadyCurrent,
  applyBlocked: counts.applyBlocked,
  reconciled: counts.updated + counts.inserted + counts.alreadyCurrent + counts.applyBlocked === counts.examined,
  stopReason,
  blockedSample: blocked.slice(0, 30),
  committed: MODE === 'live',
  dbWrites: MODE === 'live' ? counts.updated + counts.inserted : 0,
};
fs.writeFileSync(path.join(RESULTS, `live-apply-${TAG}-result.json`), JSON.stringify({ ...out, blockedAll: blocked }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(out, null, 2));
if (stopReason) process.exit(2);
