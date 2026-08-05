/**
 * WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1 — 단계 2 재조립 계획 (READ-ONLY · write 0)
 *
 * 실행기준 6·7·8항:
 *   6. 문자열 치환 금지 — 파손 문장만 되돌리는 patch 를 만들지 않는다.
 *   7. 제품별 e약은요 원문으로 KO canonical 을 **통째로 재조립**한다.
 *   8. 저작기 수정본(`rewriteKoByRoute` / `stripOralProhibitionSentences` 반영분)으로 재렌더한다.
 *
 * 재조립 엔진은 선행 WO 의 검증된 계약을 그대로 재사용한다
 * (`../easy-drug-ko-critical-content-correction/correction-contract.js`).
 * 여기서 새로 하는 일은 두 가지뿐이다.
 *   (a) 대상 원장을 감사 verdict-index 가 아니라 이번 WO 의 후보 실측 결과에서 읽는다.
 *   (b) 재조립 결과를 **같은 판정기로 다시 판정**해, 파손이 남으면 REPLACE 를 HOLD 로 강등한다.
 *       저작기를 고쳤어도 원문 자체가 결손인 제품(itemSeq 200807607: 원문이 "내복하지 하십시오")이
 *       있으므로, 재렌더가 곧 무결이라고 가정하면 안 된다.
 *
 * WO 원칙 6: 원문 연결 실패·경로 충돌·재조립 후 잔존 파손은 전부 HOLD(비노출)다.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  connect, fetchTargetMasters, planMaster,
  type TargetUnit, type CorrectionPlanRow, type Db,
} from '../easy-drug-ko-critical-content-correction/correction-contract.js';
import { WO, judgeBody, octFullText, selfContradictions } from './prohibition-contract.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const MEASURE = path.join(RESULTS, 'candidate-measure.json');

/** 이번 WO 의 판정 라벨 — 선행 WO 의 verdict 자리에 그대로 흘려보낸다(계약 변경 0). */
const VERDICT = 'KO_ORAL_PROHIBITION_DAMAGED';

/** 재조립 후에도 파손이 남은 경우. 선행 계약의 HoldCode union 밖이므로 별도 필드로 싣는다. */
export interface RebuildPlanRow extends CorrectionPlanRow {
  detectedBy: string[];
  /** 재조립 산출물 재판정 결과 — REPLACE 로 남으려면 반드시 clean 이어야 한다. */
  postCheck: {
    damaged: boolean;
    detectedBy: string[];
    lostSentences: string[];
    contradictionSentences: string[];
  } | null;
  postHoldCode: 'POST_RENDER_DAMAGE' | null;
}

interface MeasureFile {
  damagedUnits: number;
  damaged: Array<{ itemSeq: string; contentMd5: string; nMaster: number; detectedBy: string[] }>;
}

function loadMeasuredTargets(): { targets: TargetUnit[]; detectedBy: Map<string, string[]> } {
  const m: MeasureFile = JSON.parse(fs.readFileSync(MEASURE, 'utf8'));
  const detectedBy = new Map<string, string[]>();
  const targets: TargetUnit[] = [];
  for (const d of m.damaged) {
    const key = `${d.itemSeq}|${d.contentMd5}`;
    if (detectedBy.has(key)) throw new Error(`STOP: 대상 (itemSeq,md5) 중복 — ${key}`);
    detectedBy.set(key, d.detectedBy);
    targets.push({ itemSeq: d.itemSeq, contentMd5: d.contentMd5, verdict: VERDICT, sourceType: '', nMaster: d.nMaster });
  }
  if (targets.length !== m.damagedUnits) {
    throw new Error(`STOP: 대상 수 불일치 ${targets.length} != ${m.damagedUnits}`);
  }
  // itemSeq 가 빈 단위는 원문 귀속 자체가 불가능하다 — 계획 단계에서 조회조차 하지 않는다(WO 원칙 6).
  const orphan = targets.filter((t) => !t.itemSeq);
  if (orphan.length) throw new Error(`STOP: itemSeq 미귀속 대상 ${orphan.length}건 — 후보 산출 재검토 필요`);
  return { targets, detectedBy };
}

async function main(): Promise<void> {
  const { targets, detectedBy } = loadMeasuredTargets();
  const db: Db = await connect();
  await db.query('SET default_transaction_read_only = on');

  const masters = await fetchTargetMasters(db, targets);
  process.stderr.write(`targets=${targets.length} masters=${masters.length}\n`);

  const rows: RebuildPlanRow[] = [];
  for (const m of masters) {
    const p = planMaster(m) as CorrectionPlanRow;
    const key = `${m.itemSeq}|${m.contentMd5}`;
    let postCheck: RebuildPlanRow['postCheck'] = null;
    let postHoldCode: RebuildPlanRow['postHoldCode'] = null;
    let row: RebuildPlanRow = { ...p, detectedBy: detectedBy.get(key) ?? [], postCheck, postHoldCode };

    if (p.action === 'REPLACE' && p.newHtml) {
      const j = judgeBody(octFullText(m.oct), p.newHtml);
      const contra = selfContradictions(p.newHtml);
      postCheck = {
        damaged: j.damaged || contra.length > 0,
        detectedBy: j.detectedBy,
        lostSentences: j.lostSentences,
        contradictionSentences: contra,
      };
      if (postCheck.damaged) {
        postHoldCode = 'POST_RENDER_DAMAGE';
        row = {
          ...p,
          newMd5: null, newHtml: null, newSummary: null,
          action: 'HOLD',
          anomalies: [
            '재조립 후에도 경구 금지 파손 잔존',
            ...j.lostSentences.slice(0, 3).map((s) => `소실: ${s.slice(0, 90)}`),
            ...contra.slice(0, 3).map((s) => `자기모순: ${s.slice(0, 90)}`),
          ],
          detectedBy: detectedBy.get(key) ?? [],
          postCheck, postHoldCode,
        };
      } else {
        row = { ...p, detectedBy: detectedBy.get(key) ?? [], postCheck, postHoldCode };
      }
    }
    rows.push(row);
  }

  const byAction: Record<string, number> = {};
  const byHold: Record<string, number> = {};
  for (const r of rows) {
    byAction[r.action] = (byAction[r.action] || 0) + 1;
    const h = r.postHoldCode ?? r.holdCode;
    if (h) byHold[h] = (byHold[h] || 0) + 1;
  }
  const replaceRows = rows.filter((r) => r.action === 'REPLACE');
  const newMd5Set = new Set(replaceRows.map((r) => r.newMd5));

  const summary = {
    wo: WO, mode: 'READ-ONLY PLAN (write 0)',
    engine: 'composeKoV4 via easy-drug-ko-critical-content-correction/correction-contract',
    targetUnits: targets.length,
    plannedMasters: rows.length,
    byAction, byHold,
    distinctNewBodies: newMd5Set.size,
    replaceUnchangedMd5: replaceRows.filter((r) => r.newMd5 === r.oldMd5).length,
    postRenderDamage: rows.filter((r) => r.postHoldCode === 'POST_RENDER_DAMAGE').length,
  };
  if (summary.replaceUnchangedMd5 > 0) throw new Error('STOP: REPLACE 인데 본문 md5 가 동일 — 계약 위반');

  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(path.join(RESULTS, 'rebuild-plan.json'),
    JSON.stringify({ ...summary, rows }, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');

  await db.destroy();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
