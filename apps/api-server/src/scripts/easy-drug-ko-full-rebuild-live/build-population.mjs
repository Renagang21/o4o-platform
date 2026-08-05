/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — 단계 3 모집단 재산출
 *
 * 파일럿의 19,363 을 **목표로 쓰지 않는다.** 동결 snapshot(단계 2)과 최신 LIVE DB 로 다시 센다.
 *
 * 상호배타 7상태. 아래 **판정 순서가 곧 배타성 보장**이다 (먼저 걸리면 뒤는 보지 않는다):
 *   1 HOLD_ITEMSEQ_MAPPING     master 가 서로 다른 허가품목에 다중 연결 — 자기 원문 확정 불가
 *   2 HOLD_EXCLUDED            전문의약품 등 매장용 설명서 대상 아님
 *   3 HOLD_NO_API_SOURCE       동결 snapshot 에 해당 itemSeq 원문 없음
 *   4 HOLD_SOURCE_DRIFT_DURING_RUN  동결본과 재확인본 불일치 (이 단계에서는 동결본 자기대조 → 0)
 *   5 HOLD_SOURCE_INCOMPLETE   효능 또는 용법 결손
 *   6 HOLD_STRUCTURE_ANOMALY   생산 계약 자기검사 실패(안전 전단사 파손)
 *   7 PRODUCTION_READY
 *
 * read-only. write 0. 본문은 만들지 않는다 — 상태·연결·기존 canonical 현황만 낸다.
 *
 * 산출 (results/):
 *   population.jsonl        ProductMaster 1행 — 후속 전 단계의 유일한 입력 (미추적)
 *   population-summary.json 집계·정합 검사 (추적)
 *
 * 사용: PGPASSWORD=... node build-population.mjs [--port 15441]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { structure } from '../easy-drug-ko-full-rebuild-pilot/pilot-contract.mjs';
import { SOURCE_FIELDS, REQUIRED_FIELDS, sha256 } from './freeze-source.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const PORT = (() => {
  const i = process.argv.indexOf('--port');
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : parseInt(process.env.PROXY_PORT || '15441', 10);
})();

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const srcHash = (r) => sha256(Object.keys(SOURCE_FIELDS).map((k) => `${k} ${r[k] ?? ''}`).join(''));

/** 전문의약품 제외. 원문에 근거 없으면 제외하지 않는다(과잉 제외 금지). */
const isProfessional = (kinds) => (kinds ?? []).some((k) => k.includes('전문'));

async function main() {
  const frozenPath = path.join(RESULTS, 'frozen-source.jsonl');
  if (!fs.existsSync(frozenPath)) throw new Error('STOP: frozen-source.jsonl 없음 — freeze-source.mjs 선행 필요');
  const frozen = new Map(readJsonl(frozenPath).map((r) => [r.itemSeq, r]));
  const drift = JSON.parse(fs.readFileSync(path.join(RESULTS, 'source-drift.json'), 'utf8'));

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

  // ── itemSeq 별 e약은요 product_candidates 행 (신규 KO 의 source_ref_id 가 된다) ──
  const cand = await q(`
    SELECT normalized_identifier_value AS "itemSeq", id::text AS "candidateId"
    FROM product_candidates
    WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
      AND raw_payload->>'sourceKind'='easy_drug_info' AND deleted_at IS NULL
    ORDER BY normalized_identifier_value, id`);
  const candFirst = new Map();
  const candCount = new Map();
  for (const r of cand) {
    if (!candFirst.has(r.itemSeq)) candFirst.set(r.itemSeq, r.candidateId);
    candCount.set(r.itemSeq, (candCount.get(r.itemSeq) ?? 0) + 1);
  }

  // ── ProductMaster 연결 + 기존 언어별 canonical 현황 ─────────────────────────
  const masters = await q(`
    WITH lk AS (
      SELECT DISTINCT pi.product_master_id AS master_id, pi.normalized_value AS item_seq
      FROM product_identifiers pi
      WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
    ),
    pcnt AS (
      SELECT product_master_id AS master_id, count(DISTINCT normalized_value)::int n
      FROM product_identifiers
      WHERE identifier_type='MFDS_CODE' AND deleted_at IS NULL
      GROUP BY 1
    ),
    std AS (
      SELECT pi.product_master_id AS master_id,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'전문일반구분','')), NULL) class_kinds,
             min(NULLIF(pc.raw_payload->'source'->>'제형','')) dosage_form
      FROM product_identifiers pi
      JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
        AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
      WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
      GROUP BY 1
    ),
    ko AS (
      SELECT master_id,
             count(*)::int n,
             (array_agg(id::text ORDER BY updated_at DESC NULLS LAST, id))[1] id,
             (array_agg(md5(content) ORDER BY updated_at DESC NULLS LAST, id))[1] md5,
             (array_agg(length(content) ORDER BY updated_at DESC NULLS LAST, id))[1] len,
             (array_agg(source_type ORDER BY updated_at DESC NULLS LAST, id))[1] source_type,
             (array_agg(COALESCE(source_ref_id::text,'') ORDER BY updated_at DESC NULLS LAST, id))[1] source_ref_id
      FROM shared_product_descriptions
      WHERE deleted_at IS NULL AND description_type='STORE'
        AND COALESCE(language,'ko')='ko' AND status='canonical'
      GROUP BY 1
    ),
    tr AS (
      SELECT master_id,
             count(*) FILTER (WHERE language='en')::int en,
             count(*) FILTER (WHERE language='zh')::int zh,
             count(*) FILTER (WHERE language='ja')::int ja
      FROM shared_product_descriptions
      WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
        AND COALESCE(language,'ko') <> 'ko'
      GROUP BY 1
    )
    SELECT lk.master_id::text "masterId", pm.name "productName", lk.item_seq "itemSeq",
           COALESCE(pcnt.n, 1) "permitCodeCount",
           COALESCE(std.class_kinds, '{}') "classKinds", std.dosage_form "dosageForm",
           ko.id "koDescId", ko.md5 "koMd5", ko.len "koLen", ko.source_type "koSourceType",
           NULLIF(ko.source_ref_id,'') "koSourceRefId", COALESCE(ko.n,0) "koCanonicalCount",
           COALESCE(tr.en,0) "enCount", COALESCE(tr.zh,0) "zhCount", COALESCE(tr.ja,0) "jaCount"
    FROM lk
    JOIN product_masters pm ON pm.id = lk.master_id
    LEFT JOIN pcnt ON pcnt.master_id = lk.master_id
    LEFT JOIN std ON std.master_id = lk.master_id
    LEFT JOIN ko ON ko.master_id = lk.master_id
    LEFT JOIN tr ON tr.master_id = lk.master_id
    ORDER BY lk.item_seq, lk.master_id`);

  // 이 트랙의 모집단 = e약은요 원문이 붙는 허가품목에 연결된 master
  const linked = masters.filter((m) => frozen.has(m.itemSeq) || candFirst.has(m.itemSeq));

  const STATES = ['PRODUCTION_READY', 'HOLD_ITEMSEQ_MAPPING', 'HOLD_EXCLUDED', 'HOLD_NO_API_SOURCE',
    'HOLD_SOURCE_DRIFT_DURING_RUN', 'HOLD_SOURCE_INCOMPLETE', 'HOLD_STRUCTURE_ANOMALY'];
  const counts = Object.fromEntries(STATES.map((s) => [s, 0]));
  const rows = [];
  const readyItemSeq = new Set();

  for (const m of linked) {
    const src = frozen.get(m.itemSeq) ?? null;
    let state = null; let reason = null;

    if (m.permitCodeCount > 1) { state = 'HOLD_ITEMSEQ_MAPPING'; reason = `permitCodeCount=${m.permitCodeCount}`; }
    else if (isProfessional(m.classKinds)) { state = 'HOLD_EXCLUDED'; reason = 'PROFESSIONAL_USE'; }
    else if (!src) { state = 'HOLD_NO_API_SOURCE'; reason = '동결 snapshot 에 itemSeq 없음'; }
    else if (srcHash(src) !== src.sourceHash) { state = 'HOLD_SOURCE_DRIFT_DURING_RUN'; reason = '동결본 hash 자기대조 불일치'; }
    else {
      const missing = REQUIRED_FIELDS.filter((k) => !(src[k] ?? '').trim());
      if (missing.length) { state = 'HOLD_SOURCE_INCOMPLETE'; reason = missing.join(','); }
      else {
        const st = structure(src, { productName: m.productName, dosageForm: m.dosageForm, entpName: src.entpName });
        if (st.anomalies.includes('SAFETY_PARTITION_BROKEN')) { state = 'HOLD_STRUCTURE_ANOMALY'; reason = 'SAFETY_PARTITION_BROKEN'; }
        else if (st.anomalies.length) { state = 'HOLD_SOURCE_INCOMPLETE'; reason = st.anomalies.join(','); }
        else { state = 'PRODUCTION_READY'; readyItemSeq.add(m.itemSeq); }
      }
    }

    counts[state] += 1;
    rows.push({
      masterId: m.masterId, itemSeq: m.itemSeq, productName: m.productName,
      state, reason,
      dosageForm: m.dosageForm, classKinds: m.classKinds, permitCodeCount: m.permitCodeCount,
      officialSourceHash: src ? src.sourceHash : null,
      sourceCandidateId: candFirst.get(m.itemSeq) ?? null,
      koDescId: m.koDescId, koMd5: m.koMd5, koLen: m.koLen,
      koSourceType: m.koSourceType, koSourceRefId: m.koSourceRefId,
      koCanonicalCount: m.koCanonicalCount,
      enCount: m.enCount, zhCount: m.zhCount, jaCount: m.jaCount,
    });
  }
  rows.sort((a, b) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0));

  // ── 정합 검사 (WO §3 필수) ─────────────────────────────────────────────────
  const stateSum = Object.values(counts).reduce((a, b) => a + b, 0);
  const masterIds = rows.map((r) => r.masterId);
  const dupMaster = masterIds.length - new Set(masterIds).size;
  const perItem = new Map();
  for (const r of rows) perItem.set(r.itemSeq, (perItem.get(r.itemSeq) ?? 0) + 1);
  const dist = {};
  for (const n of perItem.values()) {
    const b = n === 1 ? '1' : n <= 5 ? '2-5' : n <= 20 ? '6-20' : n <= 100 ? '21-100' : '100+';
    dist[b] = (dist[b] ?? 0) + 1;
  }

  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    step: '3-population',
    frozenSnapshotDigest: drift.frozenSnapshotDigest,
    method: '동결 snapshot + 최신 LIVE 재계산. 파일럿 19,363 을 목표로 사용하지 않았다.',

    identifierMastersAll: masters.length,
    linkedMasters: linked.length,
    linkedItemSeq: perItem.size,
    mastersPerItemSeq: dist,
    maxMastersPerItemSeq: Math.max(...perItem.values()),

    states: counts,
    holdTotal: stateSum - counts.PRODUCTION_READY,
    productionReadyRate: +((counts.PRODUCTION_READY / stateSum) * 100).toFixed(2),
    readyItemSeq: readyItemSeq.size,

    holdReasons: rows.filter((r) => r.state !== 'PRODUCTION_READY')
      .reduce((a, r) => ({ ...a, [`${r.state}:${r.reason}`]: (a[`${r.state}:${r.reason}`] ?? 0) + 1 }), {}),

    integrity: {
      stateSumEqualsLinked: stateSum === linked.length,
      unclassified: linked.length - stateSum,
      duplicateMasters: dupMaster,
      frozenItemSeq: frozen.size,
      frozenItemSeqUnlinked: [...frozen.keys()].filter((k) => !perItem.has(k)).length,
      candidateItemSeqMultipleRows: [...candCount.values()].filter((n) => n > 1).length,
      readyWithoutSourceCandidate: rows.filter((r) => r.state === 'PRODUCTION_READY' && !r.sourceCandidateId).length,
      readyWithoutSourceHash: rows.filter((r) => r.state === 'PRODUCTION_READY' && !r.officialSourceHash).length,
      koCanonicalDuplicatePerMaster: rows.filter((r) => r.koCanonicalCount > 1).length,
    },

    existingCanonical: {
      readyWithExistingKo: rows.filter((r) => r.state === 'PRODUCTION_READY' && r.koDescId).length,
      readyWithoutExistingKo: rows.filter((r) => r.state === 'PRODUCTION_READY' && !r.koDescId).length,
      holdWithExistingKo: rows.filter((r) => r.state !== 'PRODUCTION_READY' && r.koDescId).length,
      koSourceTypeDistribution: rows.filter((r) => r.koDescId)
        .reduce((a, r) => ({ ...a, [r.koSourceType]: (a[r.koSourceType] ?? 0) + 1 }), {}),
    },

    derivedTranslations: {
      readyWithEn: rows.filter((r) => r.state === 'PRODUCTION_READY' && r.enCount > 0).length,
      readyWithZh: rows.filter((r) => r.state === 'PRODUCTION_READY' && r.zhCount > 0).length,
      readyWithJa: rows.filter((r) => r.state === 'PRODUCTION_READY' && r.jaCount > 0).length,
      note: '이번 WO 에서 본문 write 0. 단계 10 에서 상태만 분류한다.',
    },
    dbWrites: 0,
  };

  fs.writeFileSync(path.join(RESULTS, 'population.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'population-summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  await pool.end();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
