/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — 단계 7·8 dry-run / 기존 canonical 처리 계획
 *
 * 검증 통과 master 의 **현재 DB 상태를 다시 조회**해 처리 유형을 정한다. read-only. write 0.
 *
 * 유형 (WO §8):
 *   CREATE_NEW_KO         활성 KO canonical 없음 → 신규 INSERT
 *   REPLACE_EXISTING_KO   활성 KO canonical 있고 본문이 다름 → 기존을 deprecated 로 강등 후 신규 INSERT
 *   ALREADY_CURRENT       이미 이번 원문·이번 본문과 동일 → write 0
 *   WITHDRAW_INVALID_KO   정상본이 없는데 기존 KO 를 정상본으로 계속 노출할 수 없는 경우
 *   HOLD_NO_REPLACEMENT   HOLD 제품 — 신규 게시하지 않는다
 *   GUARD_MISS            계획 시점과 현재 상태가 어긋남 (apply 단계에서 재판정)
 *
 * 강등-후-삽입을 쓰는 이유: `uniq_shared_product_descriptions_canonical_per_master_type_lang`
 * (master_id, description_type, COALESCE(language,'ko')) WHERE status='canonical' 부분 유니크
 * 인덱스가 있어 활성 canonical 은 master 당 하나뿐이고, 기존 행은 감사 목적으로 남겨야 한다(WO §8.6).
 *
 * 산출 (results/):
 *   plan.jsonl          master 별 실행 계획 (미추적 — 재생성 가능)
 *   plan-summary.json   집계 + planDigest (추적)
 *
 * 사용: PGPASSWORD=... node plan-apply.mjs [--port 15441] [--tag run1]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : dflt; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const TAG = arg('--tag', '');

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

export async function loadCurrentKo(q, masterIds) {
  const rows = [];
  const CH = 2000;
  for (let i = 0; i < masterIds.length; i += CH) {
    const chunk = masterIds.slice(i, i + CH);
    rows.push(...await q(`
      SELECT master_id::text "masterId", id::text "descId", status, source_type "sourceType",
             COALESCE(source_ref_id::text,'') "sourceRefId",
             md5(content) "md5", length(content) "len", updated_at "updatedAt"
      FROM shared_product_descriptions
      WHERE deleted_at IS NULL AND description_type='STORE'
        AND COALESCE(language,'ko')='ko' AND status='canonical'
        AND master_id = ANY($1::uuid[])
      ORDER BY master_id, id`, [chunk]));
  }
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.masterId)) map.set(r.masterId, []);
    map.get(r.masterId).push(r);
  }
  return map;
}

async function main() {
  const population = new Map(readJsonl(path.join(RESULTS, 'population.jsonl')).map((p) => [p.masterId, p]));
  const leaflets = new Map(readJsonl(path.join(RESULTS, 'leaflets.jsonl')).map((l) => [l.masterId, l]));
  const eligible = readJsonl(path.join(RESULTS, 'apply-eligible.jsonl')).map((r) => r.masterId);
  const digestOfSource = JSON.parse(fs.readFileSync(path.join(RESULTS, 'source-drift.json'), 'utf8')).frozenSnapshotDigest;

  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT,
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 900000, max: 2,
  });
  const q = async (text, params) => {
    const c = await pool.connect();
    try {
      await c.query('SET default_transaction_read_only = on');
      return (await c.query(text, params)).rows;
    } finally { c.release(); }
  };

  // 계획 순서는 masterId 사전순으로 고정한다 — 두 dry-run 이 같은 계획을 내야 한다(WO §7).
  const ordered = [...eligible].sort();
  const current = await loadCurrentKo(q, ordered);

  const plan = []; const actions = {};
  for (const masterId of ordered) {
    const leaf = leaflets.get(masterId);
    const p = population.get(masterId);
    const rows = current.get(masterId) ?? [];
    const newMd5 = md5(leaf.html);

    let action; let beforeDescId = null; let beforeMd5 = null; let note = null;
    if (rows.length === 0) action = 'CREATE_NEW_KO';
    else if (rows.length > 1) {
      // 부분 유니크 인덱스가 막고 있어 정상적으로는 나올 수 없다. 나오면 apply 하지 않고 조사한다.
      action = 'GUARD_MISS'; note = `canonicalCount=${rows.length}`;
      beforeDescId = rows[0].descId; beforeMd5 = rows[0].md5;
    } else {
      const cur = rows[0];
      beforeDescId = cur.descId; beforeMd5 = cur.md5;
      const alreadyFromThisSource = cur.sourceType === 'mfds_easy_drug' && cur.md5 === newMd5;
      action = alreadyFromThisSource ? 'ALREADY_CURRENT' : 'REPLACE_EXISTING_KO';
    }
    actions[action] = (actions[action] ?? 0) + 1;
    plan.push({
      masterId, itemSeq: p.itemSeq, action,
      officialSourceHash: leaf.officialSourceHash,
      generatedContentHash: leaf.contentHash,
      generatedMd5: newMd5,
      sourceCandidateId: leaf.sourceCandidateId,
      beforeDescId, beforeMd5, note,
    });
  }

  // 생산 대상이 아닌 master (HOLD·검증 실패) — write 0 이지만 원장에는 남긴다
  const eligibleSet = new Set(ordered);
  const notApplied = [];
  for (const [masterId, p] of population) {
    if (eligibleSet.has(masterId)) continue;
    const action = p.state === 'PRODUCTION_READY' ? 'VERIFY_FAILED_NO_REPLACEMENT' : 'HOLD_NO_REPLACEMENT';
    actions[action] = (actions[action] ?? 0) + 1;
    notApplied.push({ masterId, itemSeq: p.itemSeq, action, state: p.state, existingKoDescId: p.koDescId });
  }

  const writePlan = plan.filter((r) => r.action === 'CREATE_NEW_KO' || r.action === 'REPLACE_EXISTING_KO');
  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    step: '7-8-plan-dry-run',
    tag: TAG || null,
    frozenSnapshotDigest: digestOfSource,
    population: population.size,
    eligible: ordered.length,
    actions,
    expectedWrites: {
      insertCanonical: writePlan.length,
      demoteExisting: plan.filter((r) => r.action === 'REPLACE_EXISTING_KO').length,
      withdrawInvalid: plan.filter((r) => r.action === 'WITHDRAW_INVALID_KO').length,
      noWrite: plan.filter((r) => r.action === 'ALREADY_CURRENT').length + notApplied.length,
      otherLanguageWrites: 0,
      productMasterWrites: 0,
      productIdentifierWrites: 0,
    },
    guardMiss: plan.filter((r) => r.action === 'GUARD_MISS').length,
    holdNoReplacementWithExistingKo: notApplied.filter((r) => r.action === 'HOLD_NO_REPLACEMENT' && r.existingKoDescId).length,
    // 계획 동일성 계약: 모집단·순서·원문 hash·본문 hash·행동·before 상태를 전부 담는다
    planDigest: sha256(plan.map((r) =>
      `${r.masterId}|${r.action}|${r.officialSourceHash}|${r.generatedContentHash}|${r.beforeDescId ?? ''}|${r.beforeMd5 ?? ''}`).join('\n')),
    populationDigest: sha256(ordered.join('\n')),
    dbWrites: 0,
  };

  fs.writeFileSync(path.join(RESULTS, `plan${TAG ? `-${TAG}` : ''}.jsonl`),
    plan.concat(notApplied).map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, `plan-summary${TAG ? `-${TAG}` : ''}.json`), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  await pool.end();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
