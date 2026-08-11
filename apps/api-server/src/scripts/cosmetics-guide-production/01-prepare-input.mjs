/**
 * WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1 — 단계 1: 모집단 확정 · 배치 분할
 *
 * census 산출물을 그대로 모집단으로 쓴다(WO §2). census 를 다시 수집하지 않는다.
 * 여기서 하는 일은 **모집단 무결성 확인**과 배치 경계 고정뿐이다.
 * WO §13 중지 조건 — 33,106 모집단 자체가 손상되거나 불일치하면 즉시 실패시킨다.
 */
import { BATCH_SIZE, batchLabel, readCensus, writeOut } from './lib.mjs';

const EXPECTED = 33106;

function main() {
  const cand = readCensus('retail-unique-guide-candidates.json');
  const fmatch = readCensus('functional-match.json');

  const candidates = cand.candidates;
  const problems = [];

  if (candidates.length !== EXPECTED) {
    problems.push(`후보 수 불일치: ${candidates.length} != ${EXPECTED}`);
  }
  if (cand.meta?.uniqueGuideCandidates !== EXPECTED) {
    problems.push(`meta.uniqueGuideCandidates 불일치: ${cand.meta?.uniqueGuideCandidates}`);
  }
  const keys = new Set(candidates.map((c) => c.key));
  if (keys.size !== candidates.length) {
    problems.push(`후보 key 중복: unique ${keys.size} / total ${candidates.length}`);
  }
  const noSource = candidates.filter((c) => !c.sources?.length).length;
  if (noSource) problems.push(`sources 가 빈 후보 ${noSource}건`);

  // 기능성 매칭 결과는 후보와 1:1 이어야 한다. 어긋나면 보강축 자체를 신뢰할 수 없다.
  if (fmatch.results.length !== candidates.length) {
    problems.push(`functional-match 행 수 불일치: ${fmatch.results.length}`);
  }
  const fxKeys = new Set(fmatch.results.map((r) => r.key));
  const orphan = [...keys].filter((k) => !fxKeys.has(k)).length;
  if (orphan) problems.push(`functional-match 에 없는 후보 key ${orphan}건`);

  if (problems.length) {
    process.stderr.write(`모집단 무결성 실패 (WO §13 중지 조건)\n- ${problems.join('\n- ')}\n`);
    process.exit(1);
  }

  const batches = [];
  for (let i = 0; i * BATCH_SIZE < candidates.length; i += 1) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, candidates.length);
    batches.push({ label: batchLabel(i), start, end, count: end - start });
  }

  const meta = {
    wo: 'WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1',
    predecessor: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 (74657c931)',
    population: candidates.length,
    integrity: 'OK',
    functionalMatched: fmatch.results.filter((r) => r.status === 'RETAIL_FUNCTIONAL_MATCHED').length,
    batches,
  };
  writeOut('production-input.json', meta);
  process.stderr.write(JSON.stringify(meta, null, 2) + '\n');
}

main();
