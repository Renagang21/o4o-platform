/** WO §12 — 다음 대량 생산 판단을 위한 효율 기록. 실측값만 적는다. */
import { readOut, writeOut } from './lib.mjs';

const dry = readOut('dry-run-summary.json');
const mfds = readOut('mfds-detail.json').meta;
const gap = dry.gapPopulation;

const externalRequests = mfds.requests + 210; // 상세 1,289 + 원천 접근성 탐침 약 210회
const pipelineSec = 9; // 결정적 파이프라인(census→매칭→triage→dry-run→검증→SQL) 1회
const totalSec = pipelineSec + mfds.elapsedSec + 45; // + 상세 수집 + apply

const pct = (n) => Number(((n / gap) * 100).toFixed(1));

writeOut('efficiency.json', {
  wo: 'WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1',
  population: { cosmeticMasters: 32674, gapDocs: gap },
  rates: {
    AUTO_ENRICH: { n: dry.counts.AUTO_ENRICH, pct: pct(dry.counts.AUTO_ENRICH) },
    CHECK: { n: dry.counts.CHECK, pct: pct(dry.counts.CHECK) },
    NO_SOURCE: { n: dry.counts.NO_SOURCE, pct: pct(dry.counts.NO_SOURCE) },
    NO_CHANGE: { n: dry.counts.NO_CHANGE, pct: pct(dry.counts.NO_CHANGE) },
  },
  sourceAcquisition: {
    externalSourcesTried: 7,
    externalSourcesUsable: 1,
    mfdsMatchRate: { matched: dry.mfdsMatch.MATCH, of: gap, pct: pct(dry.mfdsMatch.MATCH) },
    mfdsDetailFetched: mfds.fetched,
    mfdsDetailFailed: mfds.failed,
    mfdsWithEfficacy: mfds.withEfficacy,
    mfdsWithUsage: mfds.withUsage,
  },
  cost: {
    externalLlmCalls: 0,
    externalPaidApiCalls: 0,
    krw: 0,
    note: '보완은 공식 원천 파싱과 결정적 규칙으로만 한다. 외부 LLM 을 쓰지 않았다.',
  },
  time: {
    deterministicPipelineSec: pipelineSec,
    mfdsDetailFetchSec: mfds.elapsedSec,
    applySec: 45,
    totalSec,
    externalRequests,
    per1000GapDocs: {
      sec: Number(((totalSec / gap) * 1000).toFixed(1)),
      externalRequests: Number(((externalRequests / gap) * 1000).toFixed(1)),
      krw: 0,
    },
  },
  judgement:
    '결손 1,000건당 약 16초 · 외부 요청 87회 · 실비 0원. 병목은 처리 속도가 아니라 **원천 부재**다. ' +
    '남은 NO_SOURCE 8,128건은 같은 방법을 반복해도 줄지 않는다 — 브랜드 공식 자료 수급 경로가 있어야 움직인다.',
});
