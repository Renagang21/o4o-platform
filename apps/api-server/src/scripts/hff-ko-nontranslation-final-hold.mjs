/**
 * WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1  §16
 *
 * 최종 비번역 HOLD 큐. EN 관련 행은 포함하지 않는다.
 * Agent 9 행은 canonicalId 가 없으므로 candidateId + statementNo 를 기본키로 쓴다.
 *
 * 산출: data/hff-ko-nontranslation-final-hold-v1.jsonl
 *       data/hff-ko-nontranslation-final-hold-summary-v1.json
 */
import fs from 'node:fs';
import pg from 'pg';
import { sourceDamage } from './hff-ko-official-label-parser.mjs';

const D = 'apps/api-server/src/scripts/data';
const dec = JSON.parse(fs.readFileSync(`${D}/hff-ko-review-residual-decisions-v1.json`, 'utf8')).decisions;
const a9 = JSON.parse(fs.readFileSync(`${D}/hff-agent9-hold-reconciliation-v1.json`, 'utf8')).rows;

const NEXT = {
  SOURCE_REPAIR_REQUIRED: '공식 MAIN_FNCTN 원문의 대괄호·분리자 손상을 원천(ETL) 단계에서 복구한 뒤 재판정한다. 손상 복구가 유일하게 결정되지 않으므로 자동 보정하지 않는다.',
  AMBIGUOUS_FUNCTION_BOUNDARY: '사람이 공식 원문을 읽고 기능성 절 경계를 확정한다. 둘 이상의 경계 해석이 가능하므로 자동 분할하지 않는다.',
  AMBIGUOUS_INGREDIENT_OWNERSHIP: '사람이 공식 원문을 읽고 각 기능성 절의 원료 귀속을 확정한다. 라벨·본문 대응이 유일하게 결정되지 않으므로 자동 귀속하지 않는다.',
  UNSUPPORTED_RENDERER_STRUCTURE: '현재 canonical 이 라벨 없는 평면 목록(sd-why) family 이다. 원료 라벨 구조로 바꾸는 것은 삽입 전용 계약 밖이므로 별도 renderer 구조 WO 에서 처리한다.',
  CANONICAL_STRUCTURE_UNSAFE: 'canonical 의 기능성 섹션 구조(다중 섹션·불균형 목록 등)가 삽입 전용 패치를 지지하지 않는다. 구조 재설계 WO 에서 처리한다.',
  NO_INTAKE_DATA: '공식 SRV_USE(섭취량 및 섭취방법)가 비어 있다. 원천 데이터 갱신 전까지 설명서를 생성하지 않는다. 외부 일반 정보로 보완하지 않는다.',
  NO_FUNCTIONAL_DATA: '공식 MAIN_FNCTN(기능성)이 비어 있다. 원천 데이터 갱신 전까지 설명서를 생성하지 않는다.',
  HINT_UNDER_EXTRACTION: '공식 INTAKE_HINT1 추출이 진행 중이다. 추출 완료 후 재판정한다.',
  PRODUCTMASTER_UNCLEAR: 'product_candidates 가 ProductMaster 에 연결돼 있지 않다. 매칭·승격이 선행돼야 canonical 생성이 가능하다.',
  SOURCE_CONFLICT: '원천 candidate 행이 삭제됐거나 현재 DB 에서 확인되지 않는다. 원천 정합 확인 후 재판정한다.',
};

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const holdA = dec.filter((r) => r.finalStatus.startsWith('HOLD_'));
const evid = new Map();
for (let i = 0; i < holdA.length; i += 200) {
  for (const r of (await c.query(`
    SELECT spd.id, pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
      FROM shared_product_descriptions spd
      LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
        AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
     WHERE spd.id = ANY($1)`, [holdA.slice(i, i + 200).map((x) => x.canonicalId)])).rows) evid.set(r.id, r.fn ?? '');
}
await c.end();

const rows = [];
for (const r of holdA) {
  const reason = r.finalStatus.replace(/^HOLD_/, '');
  const fn = evid.get(r.canonicalId) ?? '';
  rows.push({
    track: 'KO_REVIEW_OR_AGENT9', source: 'KO_REVIEW_RESIDUAL',
    candidateId: r.candidateId, statementNo: r.statementNo,
    productMasterId: r.productMasterId, canonicalId: r.canonicalId,
    productName: r.productName, rendererFamily: r.rendererFamily,
    finalStatus: r.finalStatus, holdReason: reason,
    officialSourceEvidence: {
      field: 'product_candidates.raw_payload.source.MAIN_FNCTN',
      present: !!fn.trim(), length: fn.trim().length,
      sourceDamage: sourceDamage(fn) ?? null,
      excerpt: fn.trim().slice(0, 300),
    },
    currentProblem: { queueHoldReason: r.queueHoldReason, ...r.detail },
    requiredNextAction: NEXT[reason],
  });
}
for (const r of a9) {
  const reason = r.finalStatus.replace(/^HOLD_/, '');
  rows.push({
    track: 'KO_REVIEW_OR_AGENT9', source: 'AGENT9_HOLD',
    candidateId: r.candidateId, statementNo: r.statementNo,
    productMasterId: r.productMasterId, canonicalId: null,
    productName: r.productName, rendererFamily: null,
    finalStatus: r.finalStatus, holdReason: reason,
    officialSourceEvidence: {
      field: 'product_candidates.raw_payload.source',
      hasMainFnctn: r.officialFields.hasFn, hasSrvUse: r.officialFields.hasSrv,
      hasIntakeHint1: r.officialFields.hasHint, hasBaseStandard: r.officialFields.hasBase,
      mainFnctnLength: r.officialFields.fnLen, srvUseLength: r.officialFields.srvLen,
    },
    currentProblem: {
      originalHoldReason: r.originalHoldReason, originalStillHolds: r.originalStillHolds,
      productMasterLinked: !!r.productMasterId, koCanonicalCnt: r.koCanonicalCnt,
      additionalHoldReasons: r.additionalHoldReasons,
      contractReadyIfMasterLinked: r.contractReadyIfMasterLinked,
    },
    requiredNextAction: NEXT[reason],
  });
}

fs.writeFileSync(`${D}/hff-ko-nontranslation-final-hold-v1.jsonl`, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');

const tally = (a, f) => a.reduce((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const key = (r) => `${r.candidateId}|${r.statementNo}`;
const summary = {
  builtAt: new Date().toISOString(), wo: 'WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1',
  rows: rows.length,
  bySource: tally(rows, (r) => r.source),
  byHoldReason: tally(rows, (r) => r.holdReason),
  byFinalStatus: tally(rows, (r) => r.finalStatus),
  koReviewRows: rows.filter((r) => r.source === 'KO_REVIEW_RESIDUAL').length,
  agent9Rows: rows.filter((r) => r.source === 'AGENT9_HOLD').length,
  uniqueKeys: new Set(rows.map(key)).size,
  duplicateKeys: rows.length - new Set(rows.map(key)).size,
  canonicalIdDuplicates: (() => { const ids = rows.map((r) => r.canonicalId).filter(Boolean); return ids.length - new Set(ids).size; })(),
  englishRows: 0,
  note: 'EN 관련 행(기능성 HOLD 824 · EN 짝 없는 KO 25,415)은 이 큐에 포함하지 않는다. 번역 채팅방 범위.',
};
fs.writeFileSync(`${D}/hff-ko-nontranslation-final-hold-summary-v1.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 2));
