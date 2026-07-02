/**
 * Easy Drug → Drug Master Offline Match CLI (DB 무관, read-only 시뮬레이션)
 *
 * WO-O4O-EASY-DRUG-INFO-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1
 *
 * Usage:
 *   pnpm --filter @o4o/api-server easy-drug-match:simulate -- \
 *     --drug-master "C:\\Users\\home\\coding\\o4o-public-data-samples\\mfds-drug-master-standard-code.csv" \
 *     --easy-drug   "C:\\Users\\home\\coding\\o4o-public-data-samples\\mfds-easy-drug-info-raw.jsonl" \
 *     [--out "C:\\Users\\home\\coding\\o4o-public-data-samples\\easy-drug-master-match-report.json"] \
 *     [--encoding cp949|utf-8|auto]
 *
 * 안전 경계 (이 WO 고유):
 *   - DB 연결 없음(순수 파일 기반). ProductCandidate/ProductMaster/SharedProductDescription 미생성.
 *   - raw CSV(54MB)·리포트 JSON 은 repo 밖에 둔다. 절대 repo 로 복사/커밋하지 않는다.
 *   - env-loader / reflect-metadata / DB connection 을 import 하지 않는다(순수 오프라인).
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseDrugMasterCsv, type DrugCsvEncoding } from '../modules/neture/drug-import/drug-master-csv.parser.js';
import { parseEasyDrugInfoJsonl } from '../modules/neture/drug-import/easy-drug-info-jsonl.parser.js';
import { simulateEasyDrugToMasterMatch } from '../modules/neture/drug-import/easy-drug-to-master-offline-match.simulator.js';

interface CliArgs {
  drugMaster: string;
  easyDrug: string;
  out: string | null;
  encoding: DrugCsvEncoding;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const drugMaster = get('drug-master');
  const easyDrug = get('easy-drug');
  if (!drugMaster) throw new Error('--drug-master 필수 (약가마스터 CSV 경로)');
  if (!easyDrug) throw new Error('--easy-drug 필수 (e약은요 raw JSONL 경로)');
  const encRaw = (get('encoding') ?? 'cp949') as DrugCsvEncoding;
  return {
    drugMaster,
    easyDrug,
    out: get('out') ?? null,
    encoding: encRaw,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const drugAbs = path.isAbsolute(args.drugMaster) ? args.drugMaster : path.resolve(process.cwd(), args.drugMaster);
  const easyAbs = path.isAbsolute(args.easyDrug) ? args.easyDrug : path.resolve(process.cwd(), args.easyDrug);
  if (!fs.existsSync(drugAbs)) throw new Error(`약가마스터 파일 없음: ${drugAbs}`);
  if (!fs.existsSync(easyAbs)) throw new Error(`e약은요 파일 없음: ${easyAbs}`);

  console.error(`[1/4] 약가마스터 CSV 로드: ${drugAbs}`);
  const drugBuf = fs.readFileSync(drugAbs);
  const drugParsed = parseDrugMasterCsv(drugBuf, args.encoding);
  console.error(
    `      encoding=${drugParsed.encodingUsed} headerMatches=${drugParsed.headerMatches} rows=${drugParsed.rows.length} parseErrors=${drugParsed.errors.length}`,
  );

  console.error(`[2/4] e약은요 JSONL 로드: ${easyAbs}`);
  const easyText = fs.readFileSync(easyAbs, 'utf-8');
  const easyParsed = parseEasyDrugInfoJsonl(easyText);
  console.error(
    `      rows=${easyParsed.rows.length} parseErrors=${easyParsed.errors.length} blankLines=${easyParsed.blankLines}`,
  );

  console.error('[3/4] 오프라인 매칭 시뮬레이션...');
  const report = simulateEasyDrugToMasterMatch(drugParsed.rows, easyParsed.rows, {
    drugMasterSourceFile: path.basename(drugAbs),
    easyDrugSourceFile: path.basename(easyAbs),
  });

  const json = JSON.stringify(report, null, 2);
  if (args.out) {
    const outAbs = path.isAbsolute(args.out) ? args.out : path.resolve(process.cwd(), args.out);
    fs.writeFileSync(outAbs, json, 'utf-8');
    console.error(`[4/4] 리포트 저장: ${outAbs}`);
  }

  // 요약 (stdout — 파이프 가능)
  const m = report.match;
  const d = report.distribution.standardCodesPerItemSeq;
  console.log(
    JSON.stringify(
      {
        easyDrug: report.easyDrug,
        drugMaster: report.drugMaster,
        match: report.match,
        distribution_summary: {
          standardCodesPerItemSeq: { min: d.min, max: d.max, mean: d.mean, median: d.median },
          manufacturersPerItemSeq: {
            min: report.distribution.manufacturersPerItemSeq.min,
            max: report.distribution.manufacturersPerItemSeq.max,
            mean: report.distribution.manufacturersPerItemSeq.mean,
          },
        },
        risk: report.risk,
      },
      null,
      2,
    ),
  );
  console.error(
    `\n요약: matchedItemSeq=${m.matchedItemSeq}/${report.easyDrug.distinctItemSeq} (${m.matchedItemSeqCoveragePercent}%), ` +
      `설명1벌당 평균 SKU=${d.mean.toFixed(2)} 최대=${d.max}`,
  );
}

try {
  main();
} catch (e) {
  console.error(`[ERROR] ${(e as Error).message}`);
  process.exit(1);
}
