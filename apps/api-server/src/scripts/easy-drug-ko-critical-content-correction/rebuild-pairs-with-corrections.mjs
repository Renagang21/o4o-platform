/**
 * WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1 — 시정 전 게이트 / 시정 후 재감사 공용 입력 생성
 *
 * 선행 감사의 대조단위 파일(pairs.jsonl)에서 1차 대상 단위를 **재조립 결과로 치환**한 파일을 만든다.
 * 이 파일을 감사 엔진(`audit-ko-source-consistency.mjs`)에 **수정 없이** 그대로 물려
 * 잔존 KO_WRONG_ATTRIBUTION · KO_CONTRADICTED 를 판정한다.
 *
 *   - REPLACE master → (itemSeq, 신규 md5) 단위로 재그룹. 제품명이 다르면 단위가 갈린다(정상).
 *   - HOLD master → 비노출 예정이므로 대조단위에서 **제거**한다.
 *   - 대상 밖 단위는 원본 그대로 통과 — 귀속(computeAttribution)은 전역 문맥에서 계산되어야 하므로
 *     부분 파일이 아니라 전체 파일을 다시 만든다.
 *
 * 실행:
 *   node rebuild-pairs-with-corrections.mjs --pairs <원본 pairs.jsonl> --plan results/correction-plan.json --out <출력.jsonl>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (d !== undefined) return d;
  throw new Error(`--${n} 필요`);
};

const pairsPath = arg('pairs');
const planPath = arg('plan');
const outPath = arg('out');

const plan = JSON.parse(readFileSync(planPath, 'utf8')).rows;
const records = readFileSync(pairsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const targetUnits = new Set(plan.map((p) => `${p.itemSeq}|${p.oldMd5}`));
const byUnit = new Map(records.map((r) => [`${r.itemSeq}|${r.contentMd5}`, r]));

// 대상 단위 제거 후, REPLACE master 를 (itemSeq, 신규 md5) 로 재그룹해 다시 넣는다.
const kept = records.filter((r) => !targetUnits.has(`${r.itemSeq}|${r.contentMd5}`));

const groups = new Map();
for (const p of plan) {
  if (p.action !== 'REPLACE') continue;
  const k = `${p.itemSeq}|${p.newMd5}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(p);
}

const rebuilt = [];
for (const [k, rows] of groups) {
  const [itemSeq, newMd5] = k.split('|');
  const src = byUnit.get(`${itemSeq}|${rows[0].oldMd5}`);
  if (!src) throw new Error(`STOP: 원본 단위 없음 ${itemSeq}|${rows[0].oldMd5}`);
  if (crypto.createHash('md5').update(rows[0].newHtml).digest('hex') !== newMd5) {
    throw new Error(`STOP: 신규본 md5 불일치 ${k}`);
  }
  rebuilt.push({
    ...src,
    contentMd5: newMd5,
    content: rows[0].newHtml,
    summary: rows[0].newSummary ?? '',
    descriptionId: rows[0].oldDescId,
    nMaster: rows.length,
    masterIds: rows.map((r) => r.masterId),
    // 신규본은 이 허가품목 전용이다. 공유 지표는 재계산 결과를 그대로 반영한다.
    nPermitsSharingBody: 1,
    sharingItemSeqs: [itemSeq],
  });
}

// 품목 내 본문 분기 수 재계산 (원본·재조립 합산)
const all = [...kept, ...rebuilt];
const variants = new Map();
for (const r of all) {
  if (!variants.has(r.itemSeq)) variants.set(r.itemSeq, new Set());
  variants.get(r.itemSeq).add(r.contentMd5);
}
for (const r of all) r.nVariantsInPermit = variants.get(r.itemSeq).size;

writeFileSync(outPath, all.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

const holds = plan.filter((p) => p.action === 'HOLD');
const holdUnits = new Set(holds.map((p) => `${p.itemSeq}|${p.oldMd5}`));
process.stdout.write(JSON.stringify({
  원본단위: records.length,
  제거된대상단위: records.length - kept.length,
  재조립단위: rebuilt.length,
  출력단위: all.length,
  REPLACE_master: plan.filter((p) => p.action === 'REPLACE').length,
  HOLD_master: holds.length,
  HOLD로_비노출되는_단위: holdUnits.size,
}, null, 2) + '\n');
