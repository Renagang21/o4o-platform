/**
 * WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1 — 단계 2: KO 최소 설명서 전량 1차 생산
 *
 * WO §3: 10,000건 단위로 `생산 → 문제 큐 적재 → 다음 배치` 를 연속 수행한다.
 * WO §7: EN 설명서는 만들지 않는다.
 * WO §11: DB 에 쓰지 않는다. 산출은 파일뿐이다.
 *
 * 사용법: `node 02-generate-ko.mjs [배치라벨...]` (인자 없으면 전 배치)
 */
import { buildKoGuide } from './guide-core.mjs';
import { readCensus, readOut, writeOut } from './lib.mjs';

function main() {
  const input = readOut('production-input.json');
  const candidates = readCensus('retail-unique-guide-candidates.json').candidates;
  const fx = new Map(readCensus('functional-match.json').results.map((r) => [r.key, r]));

  const only = process.argv.slice(2);
  const targets = only.length ? input.batches.filter((b) => only.includes(b.label)) : input.batches;

  for (const b of targets) {
    const guides = [];
    const issues = [];
    let failed = 0;
    for (let i = b.start; i < b.end; i += 1) {
      const c = candidates[i];
      try {
        const g = buildKoGuide(c, fx.get(c.key) ?? null);
        guides.push(g);
        for (const it of g.issues) {
          issues.push({ ...it, key: g.key, productName: g.productName, batch: b.label });
        }
      } catch (e) {
        // 시스템 실패는 문제 큐가 아니라 별도로 센다(WO §15 보고 항목).
        failed += 1;
        issues.push({ type: 'SYSTEM_FAILURE', detail: String(e?.message ?? e), key: c.key, batch: b.label });
      }
    }
    const statusTally = guides.reduce((a, g) => ((a[g.status] = (a[g.status] ?? 0) + 1), a), {});
    const missTally = {};
    for (const g of guides) for (const m of g.missingRequired) missTally[m] = (missTally[m] ?? 0) + 1;
    const issueTally = issues.reduce((a, it) => ((a[it.type] = (a[it.type] ?? 0) + 1), a), {});

    const meta = {
      wo: 'WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1',
      batch: b.label,
      inputRange: [b.start, b.end],
      input: b.count,
      generated: guides.length,
      systemFailures: failed,
      statusTally,
      missingBreakdown: missTally,
      issueTally,
    };
    writeOut(`${b.label}/guides-ko.json`, { meta, guides });
    writeOut(`${b.label}/issues.json`, { meta: { batch: b.label, count: issues.length, issueTally }, issues });
    process.stderr.write(`${b.label}: ${JSON.stringify(meta.statusTally)} issues=${issues.length}\n`);
  }
}

main();
