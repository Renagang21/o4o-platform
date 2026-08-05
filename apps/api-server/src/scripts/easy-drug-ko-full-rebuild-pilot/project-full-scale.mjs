/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1 — 단계 10 전량 생산 규모 산출
 *
 * 파일럿 비율을 곱해서 "예상" 하지 않는다. 파일럿과 **같은 생산 계약**(pilot-contract.mjs)을
 * e약은요 연결 전 모집단에 실제로 적용해서 생산 가능/HOLD 를 세어 본다.
 * 여기서도 HTML 본문은 저장하지 않는다 — 판정과 수치만 낸다. DB 미접근·write 0.
 *
 * 산출: results/full-scale-projection.json (추적)
 *
 * 사용: node project-full-scale.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { structure, buildHtml } from './pilot-contract.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

function main() {
  const census = readJsonl(path.join(RESULTS, 'master-census.jsonl'));
  const api = new Map(readJsonl(path.join(RESULTS, 'source-snapshot.jsonl')).map((r) => [r.itemSeq, r]));

  const status = {
    PRODUCIBLE: 0,
    HOLD_EXCLUDED: 0,           // 전문의약품·다중 허가품목 연결 — 매장용 설명서 대상 아님
    HOLD_NO_API_SOURCE: 0,      // e약은요 API 미조회 → WO 기준 "원문 확인 불가"
    HOLD_SOURCE_INCOMPLETE: 0,  // 효능 또는 용법 결손
    HOLD_STRUCTURE_ANOMALY: 0,  // 계약 자기검사 실패(안전 전단사 파손)
  };
  const excludedReason = {};
  const itemSeqProducible = new Set();
  let htmlBytes = 0;

  for (const m of census) {
    if (m.excluded) {
      status.HOLD_EXCLUDED += 1;
      excludedReason[m.excluded] = (excludedReason[m.excluded] ?? 0) + 1;
      continue;
    }
    const src = api.get(m.itemSeq);
    if (!m.apiFetched || !src) { status.HOLD_NO_API_SOURCE += 1; continue; }

    const st = structure(src, { productName: m.productName, dosageForm: m.dosageForm, entpName: src.entpName });
    if (st.anomalies.includes('SAFETY_PARTITION_BROKEN')) { status.HOLD_STRUCTURE_ANOMALY += 1; continue; }
    if (st.anomalies.length) { status.HOLD_SOURCE_INCOMPLETE += 1; continue; }

    status.PRODUCIBLE += 1;
    itemSeqProducible.add(m.itemSeq);
    htmlBytes += Buffer.byteLength(buildHtml(st), 'utf8');
  }

  const total = census.length;
  const holdTotal = total - status.PRODUCIBLE;
  const pilotBuild = JSON.parse(fs.readFileSync(path.join(RESULTS, 'build-report.json'), 'utf8'));
  const diff = JSON.parse(fs.readFileSync(path.join(RESULTS, 'existing-ko-diff.json'), 'utf8'));

  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1',
    step: '10-full-scale-projection',
    method: '파일럿과 동일한 생산 계약을 전 모집단에 실제 적용한 실측(비율 외삽 아님)',
    linkedMasters: total,
    status,
    excludedReason,
    holdTotal,
    producibleRate: +((status.PRODUCIBLE / total) * 100).toFixed(2),
    holdRate: +((holdTotal / total) * 100).toFixed(2),
    producibleItemSeq: itemSeqProducible.size,
    estimatedHtmlBytes: htmlBytes,
    estimatedHtmlMB: +(htmlBytes / 1024 / 1024).toFixed(1),
    pilotReference: {
      pilot: pilotBuild.pilot, pilotPass: pilotBuild.verdicts?.PILOT_PASS ?? null,
      sourceIncomplete: pilotBuild.verdicts?.SOURCE_INCOMPLETE ?? null,
      systemFailures: 0,
    },
    existingKoDefectRate: {
      mastersCompared: diff.withExistingKo,
      missing: diff.mastersWithMissing, extra: diff.mastersWithExtra,
      contradiction: diff.mastersWithContradiction,
      wrongAttribution: diff.mastersWithWrongAttribution, truncation: diff.mastersWithTruncation,
      cleanMasters: diff.mastersClean,
      sourcePreservation: `${diff.existingKoPreservationRate}% → ${diff.newKoPreservationRate}%`,
    },
    downstream: {
      note: '정상 KO 교체 후 재번역·비노출 판단 대상. 이번 WO 에서는 변경 0.',
    },
    dbWrites: 0,
  };
  fs.writeFileSync(path.join(RESULTS, 'full-scale-projection.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
