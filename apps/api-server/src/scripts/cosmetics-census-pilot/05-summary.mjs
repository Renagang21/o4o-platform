/**
 * WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0 — 단계 5: 파일럿 집계
 *
 * WO §11 이 요구한 숫자만 모은다. **설명서 품질 점수는 만들지 않는다.**
 * 산출: tmp/cosmetics-pilot/pilot-summary.json
 */
import { readOut, writeOut } from './lib.mjs';

const tally = (arr, pick) => arr.reduce((a, x) => ((a[pick(x)] = (a[pick(x)] ?? 0) + 1), a), {});

function main() {
  const fn = readOut('functional-candidates-500.json');
  const gn = readOut('general-candidates-500.json');
  const nz = readOut('normalized-products.json');
  const ko = readOut('guide-pilot-ko.json');
  const en = readOut('guide-pilot-en.json');
  const iq = readOut('issue-queue.json');

  const units = nz.units;
  const koComplete = ko.guides.filter((g) => g.status === 'COMPLETE');
  const enComplete = en.guides.filter((g) => g.status === 'COMPLETE');

  // 사람 판단 필요 = 후보 단계 CHECK/UNCONFIRMED + 정규화 대조 불일치 + 병합 후보
  const humanNeeded = iq.issues.length;

  const summary = {
    wo: 'WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0',
    generatedFor: '§11 최종 보고 숫자',

    후보: {
      총수: fn.candidates.length + gn.candidates.length,
      기능성: tally(fn.candidates, (c) => c.candidateDecision),
      일반: tally(gn.candidates, (c) => c.candidateDecision),
      기능성_모집단_추정: fn.meta.populationApproxCount,
      기능성_표본추출: fn.meta.samplingMethod,
      일반_소스: gn.meta.sourcesUsed,
      일반_제외소스: gn.meta.sourcesExcluded,
    },

    설명서단위: {
      raw_상품수: nz.meta.targetCandidates,
      정리후_단위수: nz.meta.guideUnits,
      기능성_단위: nz.meta.guideUnitsFunctional,
      일반_단위: nz.meta.guideUnitsGeneral,
      합쳐진_수: nz.meta.mergedAwayCount,
      복수원본을_가진_단위: nz.meta.mergedUnits,
      색상variant_보유단위: nz.meta.unitsWithVariants,
      유형판정_성공: nz.meta.unitsWithType,
      유형_카테고리근거: nz.meta.unitsTypeFromCategory,
      유형_이름근거: nz.meta.unitsTypeFromName,
      정규화규칙_적용횟수: nz.meta.ruleApplicationCount,
      독립대조_대상: nz.meta.sourceCleanNameCompared,
      독립대조_일치: nz.meta.sourceCleanNameAgreed,
      독립대조_일치율: nz.meta.sourceCleanNameAgreementPct,
    },

    최소설명서: {
      한국어_생성: ko.meta.koGenerated,
      한국어_필수6항목_충족: koComplete.length,
      한국어_부분충족: ko.meta.koStatus.PARTIAL ?? 0,
      한국어_결측항목별: ko.meta.koMissingBreakdown,
      영어_생성: en.meta.enGenerated,
      영어_필수충족: enComplete.length,
      영어_미생성_공식영문명없음: en.meta.enSkippedNoOfficialName,
    },

    사람판단: {
      건수: humanNeeded,
      비율_대비_후보1000: Math.round((humanNeeded / 1000) * 1000) / 10,
      유형별: iq.meta.byType,
    },

    비용_시간: {
      기능성_수집_초: fn.meta.elapsedSec,
      일반_수집_초: gn.meta.elapsedSec,
      외부_유료API_호출: 0,
      외부_LLM_호출: 0,
      비고: '공개 웹/공개 JSON 만 사용. 유료 API·외부 LLM 호출 없음 → 실비 0원.',
    },
  };

  writeOut('pilot-summary.json', summary);
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
