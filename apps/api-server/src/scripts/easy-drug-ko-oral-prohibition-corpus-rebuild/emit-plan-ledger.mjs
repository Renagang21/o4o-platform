/**
 * WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1 — 계획 원장 추출 (파일 변환 · DB 미접근)
 *
 * `results/rebuild-plan.json` 은 재조립 본문(newHtml)을 통째로 담아 3.9MB 라 추적하지 않는다
 * (선행 WO `easy-drug-ko-critical-content-correction` 와 같은 규약). 본문은 e약은요 원문에서
 * 결정적으로 재생성되므로, 추적해야 하는 것은 **무엇을 어떤 근거로 어떻게 처분했는가** 뿐이다.
 *
 * 산출:
 *   results/rebuild-plan-ledger.jsonl   master 1행 — 본문 없이 md5·처분·경로·판정근거만
 *   results/plan-summary.json           집계
 *
 * 사용: node emit-plan-ledger.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const plan = JSON.parse(fs.readFileSync(path.join(RESULTS, 'rebuild-plan.json'), 'utf8'));

const lines = plan.rows.map((r) => JSON.stringify({
  masterId: r.masterId,
  itemSeq: r.itemSeq,
  action: r.action,
  holdCode: r.postHoldCode ?? r.holdCode ?? null,
  route: r.route ?? null,
  routeSource: r.routeSource ?? null,
  oldDescId: r.oldDescId,
  oldMd5: r.oldMd5,
  newMd5: r.newMd5 ?? null,
  detectedBy: r.detectedBy,
  anomalies: r.anomalies ?? [],
}));

fs.writeFileSync(path.join(RESULTS, 'rebuild-plan-ledger.jsonl'), lines.join('\n') + '\n', 'utf8');

const { rows, ...summary } = plan;
fs.writeFileSync(path.join(RESULTS, 'plan-summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
process.stdout.write(`ledger=${lines.length}\n${JSON.stringify(summary, null, 2)}\n`);
