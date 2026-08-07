/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — 생산 배치 수납 (DB 미접속)
 *
 * `batch-NNNN.en.json` 의 번역을 받아 두 단계로 검사한다.
 *
 *   1. 문장 게이트 (tm-lib.checkSentence) — 통과한 것만 TM 에 등재한다.
 *      오염된 문장 하나가 수백 master 로 번지므로 TM 진입 자체를 막는다.
 *   2. master 조립 + **독립검증** (en-validator.validate) — 계약 6: REUSE_SAFE 도 master 별 재조립 후 독립검증.
 *      통과 → results/en-units.jsonl (LIVE apply 후보)
 *      실패 → results/problem-queue.jsonl (state=BLOCKED) — 계약 9: DB 에 적용하지 않는다.
 *
 * CROSS_PRODUCT(다른 제품 식별값 혼입)는 별도 목록을 넘기지 않는다.
 * 본문에 한글이 남으면 HANGUL_LEFTOVER 가 먼저 잡고, 제품 식별값은 전부 한글이므로 이미 덮인다.
 *
 * **체크포인트(--checkpoint N)**: 배치 구성은 그대로 두고 **수납만** N 문장씩 끊어 실행한다.
 *   각 구간마다 문장 게이트 → TM 등재 → master 조립 → 독립검증을 끝까지 돌리고
 *   결과를 results/checkpoints.jsonl 에 남긴다. 결함이 생겼을 때 범위를 그 구간으로 좁히기 위한 것이며,
 *   배치를 다시 발행하거나 master 구성을 바꾸지 않는다.
 *
 * 멱등: 같은 배치를 다시 수납해도 결과가 같다(en-units 는 masterId 기준 최신 1건만 유효, TM 은 append-only).
 * 사용: node produce-ingest.mjs --batch 0001 [--checkpoint 100] [--sweep]
 */
import fs from 'node:fs';
import path from 'node:path';
import { validate } from './en-validator.mjs';
import { SECTION_TITLE, FIELD_LABEL, BADGE, FOOTER } from './en-frame.mjs';
import {
  RESULTS, BATCHES, tmKey, loadTM, appendTM, appendJsonl, readJsonl, streamKoUnits,
  checkSentence, bodySentences, blockedMasters, EN_UNITS_PATH, QUEUE_PATH,
} from './tm-lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const BATCH = arg('--batch', null);
const CHECKPOINT = parseInt(arg('--checkpoint', '0'), 10); // 0 = 배치 전체를 한 구간으로
const SWEEP = process.argv.includes('--sweep');
if (!BATCH) { process.stderr.write('--batch NNNN 필요\n'); process.exit(2); }

const CHECKPOINTS_PATH = path.join(RESULTS, 'checkpoints.jsonl');

const batch = JSON.parse(fs.readFileSync(path.join(BATCHES, `batch-${BATCH}.json`), 'utf8'));
const enFile = path.join(BATCHES, `batch-${BATCH}.en.json`);
const draft = fs.existsSync(enFile) ? JSON.parse(fs.readFileSync(enFile, 'utf8')) : {};

const tm = loadTM();
const target = SWEEP ? null : new Set(batch.masters);
/** 이전 회차에 막혔던 master — 이번에 통과하면 큐에 RESOLVED 를 남겨 낙인을 푼다. */
const wasBlocked = blockedMasters();
const alreadyDone = new Set(readJsonl(EN_UNITS_PATH).map((u) => u.masterId));

/** KO 단위 → EN 단위. 고정 프레임은 사전이, 본문은 TM 이 결정한다. */
function assemble(ko) {
  const missing = [];
  const segments = ko.segments.map((s) => {
    if (s.kind === 'FIXED_IDENTITY') {
      return s.field === '구분' ? { ...s, text: BADGE[s.text] ?? s.text } : { ...s };
    }
    if (s.kind === 'HEADING') return { ...s, text: SECTION_TITLE[s.text] ?? FIELD_LABEL[s.text] ?? s.text };
    if (FOOTER[s.text]) return { ...s, text: FOOTER[s.text] };
    const hit = tm.get(tmKey(s.text));
    if (!hit) { missing.push(tmKey(s.text)); return { ...s, text: '' }; }
    return { ...s, text: hit.en };
  });
  return { missing, unit: { masterId: ko.masterId, itemSeq: ko.itemSeq, segments } };
}

/* ── 구간 나누기 — 배치 구성이 아니라 수납 순서만 자른다 ────────────── */
const chunks = [];
if (CHECKPOINT > 0) {
  for (let i = 0; i < batch.sentences.length; i += CHECKPOINT) chunks.push(batch.sentences.slice(i, i + CHECKPOINT));
} else chunks.push(batch.sentences);

const totals = {
  offered: 0, admitted: 0, rejected: 0,
  produced: 0, blocked: 0, resolved: 0, pending: 0,
};
const rejectedCodes = {}, codeTally = {};
const checkpointRows = [];

for (const [ci, chunk] of chunks.entries()) {
  const cid = `${BATCH}-cp${String(ci + 1).padStart(2, '0')}`;

  /* 1. 문장 게이트 */
  const admitted = [], rejected = [];
  for (const s of chunk) {
    const en = draft[s.hash];
    if (en === undefined) { rejected.push({ hash: s.hash, ko: s.ko, violations: [{ code: 'MISSING', detail: '번역 미제출' }] }); continue; }
    const r = checkSentence(s.ko, en);
    if (r.pass) admitted.push({ hash: s.hash, ko: s.ko, en: String(en).trim(), batch: BATCH, checkpoint: cid, source: 'agent' });
    else rejected.push({ hash: s.hash, ko: s.ko, en, violations: r.violations });
  }
  appendTM(admitted);
  for (const a of admitted) tm.set(a.hash, a);

  if (rejected.length) {
    appendJsonl(QUEUE_PATH, rejected.map((r) => ({
      kind: 'SENTENCE', state: 'REJECTED', batch: BATCH, checkpoint: cid, hash: r.hash,
      ko: r.ko, en: r.en, codes: [...new Set(r.violations.map((v) => v.code))], violations: r.violations,
    })));
  }
  for (const r of rejected) for (const c of new Set(r.violations.map((v) => v.code))) rejectedCodes[c] = (rejectedCodes[c] ?? 0) + 1;

  /* 2. master 조립 + 독립검증 — 이번 구간까지의 TM 으로 완성 가능한 master 만 나온다. */
  const produced = [], blockedRows = [], resolvedRows = [];
  let pending = 0;
  for (const ko of streamKoUnits()) {
    if (target && !target.has(ko.masterId)) continue;
    if (alreadyDone.has(ko.masterId)) continue;
    const { missing, unit } = assemble(ko);
    if (missing.length) { pending++; continue; }
    const r = validate(ko, unit);
    if (r.pass) {
      produced.push({
        masterId: ko.masterId, itemSeq: ko.itemSeq, batch: BATCH, checkpoint: cid,
        koHash: ko.generatedContentHash, sentences: bodySentences(ko).length, segments: unit.segments,
      });
      if (wasBlocked.has(ko.masterId)) {
        resolvedRows.push({
          kind: 'MASTER', state: 'RESOLVED', batch: BATCH, checkpoint: cid, masterId: ko.masterId, itemSeq: ko.itemSeq,
          note: '번역 정정 후 독립검증 통과',
        });
      }
    } else {
      for (const c of r.codes) codeTally[c] = (codeTally[c] ?? 0) + 1;
      blockedRows.push({
        kind: 'MASTER', state: 'BLOCKED', batch: BATCH, checkpoint: cid, masterId: ko.masterId, itemSeq: ko.itemSeq,
        codes: r.codes, violations: r.violations.slice(0, 10),
      });
    }
  }
  appendJsonl(EN_UNITS_PATH, produced);
  appendJsonl(QUEUE_PATH, resolvedRows);
  appendJsonl(QUEUE_PATH, blockedRows);
  for (const p of produced) alreadyDone.add(p.masterId);

  totals.offered += chunk.length;
  totals.admitted += admitted.length;
  totals.rejected += rejected.length;
  totals.produced += produced.length;
  totals.blocked += blockedRows.length;
  totals.resolved += resolvedRows.length;
  totals.pending = pending; // 마지막 구간 기준(앞 구간의 pending 은 뒤 구간에서 해소된다)

  const row = {
    wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1',
    kind: 'CHECKPOINT', batch: BATCH, checkpoint: cid, index: ci + 1, of: chunks.length,
    sentences: { offered: chunk.length, admitted: admitted.length, rejected: rejected.length },
    masters: { produced: produced.length, blocked: blockedRows.length, resolved: resolvedRows.length, pendingAfter: pending },
    codes: { sentence: [...new Set(rejected.flatMap((r) => r.violations.map((v) => v.code)))], master: [...new Set(blockedRows.flatMap((b) => b.codes))] },
    pass: rejected.length === 0 && blockedRows.length === 0,
    dbWrites: 0,
  };
  checkpointRows.push(row);
  process.stdout.write(JSON.stringify(row) + '\n');
}
appendJsonl(CHECKPOINTS_PATH, checkpointRows);

const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1',
  step: 'produce-ingest',
  batch: BATCH,
  checkpointSize: CHECKPOINT || batch.sentences.length,
  checkpoints: checkpointRows.map((r) => ({
    checkpoint: r.checkpoint, sentences: r.sentences.offered, admitted: r.sentences.admitted,
    produced: r.masters.produced, blocked: r.masters.blocked, pass: r.pass,
  })),
  sentences: { offered: totals.offered, admitted: totals.admitted, rejected: totals.rejected },
  rejectedCodes,
  masters: {
    inBatch: batch.masters.length, produced: totals.produced,
    blocked: totals.blocked, resolved: totals.resolved, pending: totals.pending,
  },
  blockedTotalAfter: blockedMasters([...readJsonl(QUEUE_PATH)]).size,
  blockedCodes: codeTally,
  tmSize: tm.size,
  totalProduced: alreadyDone.size,
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, `produce-ingest-${BATCH}-result.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
