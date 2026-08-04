/**
 * WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1 — 독립검증 (**READ-ONLY**)
 *
 * 시정 러너(`apply-corrections.ts`)를 import 하지 않는다. 같은 구현을 공유하면 같은 버그를
 * 함께 통과시키므로, LIVE 상태를 자체 SQL 로 다시 읽어 **결과 불변식**만 검사한다.
 *   - 러너의 outcome 집계를 신뢰하지 않는다(러너가 무엇을 했다고 말했는지 ≠ DB 가 어떤 상태인지)
 *   - grounding 재검도 러너와 다른 방법을 쓴다: 어절 커버리지가 아니라 **문장 리터럴 포함**
 *
 * 실행:
 *   PGPASSWORD=... node verify-correction-independently.mjs --port 15441 --plan results/correction-plan.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (d !== undefined) return d;
  throw new Error(`--${n} 필요`);
};

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const WO = 'WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1';
const plan = JSON.parse(readFileSync(arg('plan', path.join(HERE, 'results', 'correction-plan.json')), 'utf8')).rows;

const pg = await import('pg');
const pool = new (pg.default?.Pool || pg.Pool)({
  host: '127.0.0.1', port: parseInt(arg('port', '15441'), 10),
  user: process.env.PGUSER || 'o4o_api', password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'o4o_platform', statement_timeout: 900000, max: 4,
});
const q = async (t, p) => (await pool.query(t, p)).rows;
await q('SET default_transaction_read_only = on');

const failures = [];
const notes = [];
const fail = (code, detail) => failures.push({ code, detail });

const replaceRows = plan.filter((p) => p.action === 'REPLACE');
const holdRows = plan.filter((p) => p.action === 'HOLD');
const allMasters = plan.map((p) => p.masterId);
const oldIds = plan.map((p) => p.oldDescId);

// ── C1 오류본 보존 상태: 전부 강등, 물리 삭제 0 ────────────────────────────────
const c1 = (await q(
  `SELECT count(*)::int total,
          count(*) FILTER (WHERE status='deprecated')::int deprecated,
          count(*) FILTER (WHERE status='canonical')::int still_canonical,
          count(*) FILTER (WHERE deleted_at IS NOT NULL)::int soft_deleted
     FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [oldIds]))[0];
if (c1.total !== plan.length) fail('C1_ROW_LOST', `오류본 ${c1.total}/${plan.length} — 물리 삭제 의심`);
if (c1.deprecated !== plan.length) fail('C1_NOT_DEPRECATED', `deprecated ${c1.deprecated}/${plan.length}`);
if (c1.still_canonical > 0) fail('C1_STILL_CANONICAL', `오류본이 아직 canonical ${c1.still_canonical}건`);
if (c1.soft_deleted > 0) fail('C1_SOFT_DELETED', `soft delete ${c1.soft_deleted}건 — 보존 계약 위반`);

// ── 수리 단계(repair-oral-prohibition) 반영 ────────────────────────────────────
// 기대 md5 는 러너의 메모리가 아니라 **감사 로그에 기록된 newMd5** 에서 읽는다.
const repairLogs = await q(
  `SELECT master_id::text mid, metadata->>'newMd5' new_md5, metadata->>'previousMd5' prev_md5
     FROM shared_product_description_audit_logs
    WHERE metadata->>'wo' = $1 AND metadata->>'phase' = 'repair-oral-prohibition'`, [WO]);
const repairedBy = new Map(repairLogs.map((r) => [r.mid, r]));

// ── C2 REPLACE: ko canonical 1건이고 계획(또는 수리) 신규본과 동일 ─────────────
const liveKo = await q(
  `SELECT master_id::text mid, count(*)::int n,
          min(md5(content)) cmd5, min(source_type) src, min(id::text) did
     FROM shared_product_descriptions
    WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND description_type='STORE'
      AND COALESCE(language,'ko')='ko' AND status='canonical'
    GROUP BY 1`, [allMasters]);
const koBy = new Map(liveKo.map((r) => [r.mid, r]));
let c2ok = 0;
for (const p of replaceRows) {
  const r = koBy.get(p.masterId);
  if (!r) { fail('C2_NO_CANONICAL', `${p.masterId} ko canonical 부재`); continue; }
  if (r.n !== 1) { fail('C2_MULTI_CANONICAL', `${p.masterId} ko canonical ${r.n}건`); continue; }
  const rep = repairedBy.get(p.masterId);
  const wantMd5 = rep ? rep.new_md5 : p.newMd5;
  if (rep && rep.prev_md5 !== p.newMd5) {
    fail('C2_REPAIR_CHAIN', `${p.masterId} 수리 이전본 ${rep.prev_md5} != 1차 시정본 ${p.newMd5}`); continue;
  }
  if (r.cmd5 !== wantMd5) { fail('C2_CONTENT_MISMATCH', `${p.masterId} md5 ${r.cmd5} != 기대 ${wantMd5}`); continue; }
  if (r.src !== 'mfds_drug_otc') { fail('C2_SOURCE_TYPE', `${p.masterId} source_type=${r.src}`); continue; }
  c2ok += 1;
}

// ── C3 HOLD: ko canonical 0건(비노출) ─────────────────────────────────────────
let c3ok = 0;
for (const p of holdRows) {
  const r = koBy.get(p.masterId);
  if (r) fail('C3_HOLD_EXPOSED', `${p.masterId} HOLD(${p.holdCode}) 인데 ko canonical ${r.n}건 노출`);
  else c3ok += 1;
}

// ── C4 EN·zh·ja write 0 ───────────────────────────────────────────────────────
const applyAt = (await q(
  `SELECT min(performed_at) t0 FROM shared_product_description_audit_logs
    WHERE metadata->>'wo' = $1`, [WO]))[0].t0;
if (!applyAt) fail('C4_NO_AUDIT', '이 WO 감사 로그 부재 — 적용 흔적 없음');
const c4 = (await q(
  `SELECT COALESCE(language,'(null)') lang, count(*)::int n,
          count(*) FILTER (WHERE updated_at >= $2)::int touched
     FROM shared_product_descriptions
    WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND COALESCE(language,'ko') <> 'ko'
    GROUP BY 1 ORDER BY 1`, [allMasters, applyAt]));
for (const r of c4) if (r.touched > 0) fail('C4_OTHER_LANG_WRITTEN', `${r.lang} ${r.touched}건 변경됨`);

// ── C5 대상 밖 write 0 ────────────────────────────────────────────────────────
const c5 = (await q(
  `SELECT count(*) FILTER (WHERE updated_at >= $1 AND id <> ALL($2::uuid[]) AND created_at < $1)::int outside_update,
          count(*) FILTER (WHERE created_at >= $1)::int inserted_total
     FROM shared_product_descriptions WHERE deleted_at IS NULL`, [applyAt, oldIds]))[0];
if (c5.outside_update > 0) fail('C5_OUTSIDE_UPDATE', `대상 밖 update ${c5.outside_update}건`);
const expectInsert = replaceRows.length + repairLogs.length;
if (c5.inserted_total !== expectInsert) {
  fail('C5_INSERT_COUNT', `적용 이후 INSERT ${c5.inserted_total} != REPLACE ${replaceRows.length} + 수리 ${repairLogs.length}`);
}
// 수리로 대체된 1차 시정본도 물리 삭제 없이 강등 보존돼야 한다
if (repairLogs.length > 0) {
  const c8 = (await q(
    `SELECT count(*)::int total, count(*) FILTER (WHERE d.status='deprecated')::int deprecated
       FROM shared_product_description_audit_logs a
       JOIN shared_product_descriptions d ON d.id = a.previous_description_id
      WHERE a.metadata->>'wo'=$1 AND a.metadata->>'phase'='repair-oral-prohibition'
        AND d.deleted_at IS NULL`, [WO]))[0];
  if (c8.total !== repairLogs.length || c8.deprecated !== repairLogs.length) {
    fail('C8_REPAIR_PREV_NOT_PRESERVED', `1차 시정본 보존 ${c8.deprecated}/${c8.total} (기대 ${repairLogs.length})`);
  } else {
    notes.push(`C8 수리로 대체된 1차 시정본 ${repairLogs.length}건 — 전부 deprecated 보존`);
  }
}
const c5b = (await q(
  `SELECT count(*)::int n, count(DISTINCT master_id)::int m,
          count(*) FILTER (WHERE event_type='canonical_replaced')::int rep,
          count(*) FILTER (WHERE event_type='canonical_withdrawn')::int wd
     FROM shared_product_description_audit_logs WHERE metadata->>'wo' = $1`, [WO]))[0];
if (c5b.n !== plan.length + repairLogs.length) {
  fail('C5_AUDIT_COUNT', `감사 로그 ${c5b.n} != 시정 ${plan.length} + 수리 ${repairLogs.length}`);
}
if (c5b.rep !== replaceRows.length + repairLogs.length || c5b.wd !== holdRows.length) {
  fail('C5_AUDIT_KIND', `replaced ${c5b.rep}/${replaceRows.length + repairLogs.length}, withdrawn ${c5b.wd}/${holdRows.length}`);
}

// ── C6 grounding 독립 재검 (문장 리터럴 포함) ─────────────────────────────────
/** 비교용 정규화 — 공백·구두점 제거 후 소문자화. 양쪽에 동일 적용한다. */
const squash = (s) => String(s).normalize('NFC')
  .replace(/[〜～∼]/g, '~').replace(/[ㆍ·․‧∙]/g, '·')
  .replace(/[.,;:()[\]{}'"“”‘’]/g, '').replace(/\s+/g, '').toLowerCase();
/**
 * 경로 동사만 무시하는 2차 비교. composeKoV4 는 경구가 아닌 제품의 원문 "복용"을 경로에 맞는
 * 동사("사용" 등)로 재표현한다 — 이는 V3/V4 저작 계약이며 사실 변경이 아니다.
 * 1차(리터럴) 비교에서 걸린 문장만 이 규칙으로 재대조하고, 그래도 남으면 실패로 올린다.
 */
const verbSquash = (s) => squash(s).replace(/복용|복약|투약|투여|점안|점적|도포|주입|사용/g, '§V');
const toText = (h) => String(h)
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h1|h2|li|div)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const seqs = [...new Set(plan.map((p) => p.itemSeq))];
const oct = new Map((await q(
  `SELECT normalized_identifier_value seq, raw_payload->'officialConsumerText' oct
     FROM product_candidates
    WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
      AND raw_payload->>'sourceKind'='easy_drug_info' AND deleted_at IS NULL
      AND normalized_identifier_value = ANY($1::text[])`, [seqs])).map((r) => [r.seq, r.oct || {}]));

const liveContent = new Map((await q(
  `SELECT master_id::text mid, content FROM shared_product_descriptions
    WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND description_type='STORE'
      AND COALESCE(language,'ko')='ko' AND status='canonical'`, [replaceRows.map((p) => p.masterId)]))
  .map((r) => [r.mid, r.content]));

let groundedOk = 0;
let verbOnly = 0;
const ungrounded = [];
for (const p of replaceRows) {
  const html = liveContent.get(p.masterId);
  const o = oct.get(p.itemSeq) || {};
  if (!html) { ungrounded.push({ masterId: p.masterId, why: 'LIVE 본문 없음' }); continue; }
  const body = squash(toText(html));
  // 공식 원문 6절의 모든 문장이 본문에 리터럴로 존재해야 한다(경로 동사 재표현분은 예외 처리).
  const corpus = ['efficacy', 'usage', 'warning', 'caution', 'sideEffect', 'interaction']
    .map((k) => String(o[k] ?? '')).join('\n');
  const sents = corpus.split(/(?<=[.!?。])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 12);
  const bodyV = verbSquash(toText(html));
  const absentStrict = sents.filter((s) => !body.includes(squash(s)));
  const absent = absentStrict.filter((s) => !bodyV.includes(verbSquash(s)));
  // 본문에 있는데 원문 어디에도 없는 "문장" — 카드 정형문구(고정 푸터·선택 포인트)는 제외
  const FIXED = ['이설명서는매장상담을돕기위한것입니다', '동일일반명코드', '이설명서는품목기준코드', '아래안전정보대상에해당하면', '한눈에보기', '일반의약품'];
  const bodySents = toText(html).split(/\n+/).map((s) => s.trim()).filter((s) => s.length >= 20);
  const corpusSq = squash(corpus);
  const corpusV = verbSquash(corpus);
  const extra = bodySents.filter((s) => {
    const sq = squash(s);
    if (FIXED.some((f) => sq.includes(f))) return false;
    return !corpusSq.includes(sq) && !corpusV.includes(verbSquash(s));
  });
  if (absent.length === 0 && extra.length === 0) {
    groundedOk += 1;
    if (absentStrict.length > 0) verbOnly += 1;
  } else {
    ungrounded.push({ masterId: p.masterId, itemSeq: p.itemSeq, absent: absent.slice(0, 2), extra: extra.slice(0, 2) });
  }
}
if (ungrounded.length > 0) {
  fail('C6_GROUNDING', `원문 대조 불일치 ${ungrounded.length}/${replaceRows.length}건`);
}

// ── C7 신규본 교차 사용 0 (한 본문이 2개 이상 허가품목에 쓰이면 오귀속 재발) ────
const bySeq = new Map();
for (const p of replaceRows) {
  if (!bySeq.has(p.newMd5)) bySeq.set(p.newMd5, new Set());
  bySeq.get(p.newMd5).add(p.itemSeq);
}
const crossed = [...bySeq.entries()].filter(([, s]) => s.size > 1);
if (crossed.length > 0) fail('C7_CROSS_PERMIT_BODY', `신규본 ${crossed.length}건이 2개 이상 허가품목에 공유됨`);

notes.push(`C1 오류본 ${plan.length}건 전부 deprecated 보존 (물리·soft 삭제 0)`);
notes.push(`C2 REPLACE ${c2ok}/${replaceRows.length} — ko canonical 1건 · 계획 md5 일치 · source_type=mfds_drug_otc`);
notes.push(`C3 HOLD ${c3ok}/${holdRows.length} — ko canonical 0건(비노출)`);
notes.push(`C4 대상 master 타 언어: ${c4.map((r) => `${r.lang} ${r.n}건(변경 ${r.touched})`).join(' / ') || '없음'}`);
notes.push(`C5 대상 밖 update ${c5.outside_update} · 신규 INSERT ${c5.inserted_total} · 감사 로그 ${c5b.n}(replaced ${c5b.rep} / withdrawn ${c5b.wd})`);
notes.push(`C6 grounding 재검 ${groundedOk}/${replaceRows.length} — 원문 문장 전량 반영 & 원문 밖 문장 0 (그중 ${verbOnly}건은 경로 동사 재표현만 차이)`);
notes.push(`C7 신규본 ${bySeq.size}종 · 2개 이상 허가품목 공유 ${crossed.length}건`);

const report = {
  verifier: 'CORRECTION_INDEPENDENT_V1',
  wo: WO,
  appliedAt: applyAt ? String(applyAt) : null,
  scope: { masters: plan.length, replace: replaceRows.length, hold: holdRows.length },
  notes,
  ungroundedSample: ungrounded.slice(0, 10),
  failures,
  result: failures.length === 0 ? 'PASS' : 'FAIL',
};
writeFileSync(path.join(HERE, 'results', 'independent-verification.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
await pool.end();
if (failures.length) process.exitCode = 2;
