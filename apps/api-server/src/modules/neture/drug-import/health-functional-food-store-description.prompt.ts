/**
 * Health Functional Food Store Description — AI 생성 프롬프트 + seed 빌더 (PURE, DB/AI 무관)
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-AI-DRAFT-DRYRUN-V1
 * 근거: WO-O4O-HEALTH-FUNCTIONAL-FOOD-RAWPAYLOAD-DESCRIPTION-SEED-DESIGN-V1 §3~§6 (금지/보존 카탈로그)
 *       CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1 (섹션 파서)
 *
 * 순수 함수만: seed 정규화 + 프롬프트 렌더. **AI 호출/DB/파일 미접근** (호출은 dry-run script).
 * "공공 원문 ≠ 매장 설명" 2단계 분리: 여기서는 seed(A) + 프롬프트(B 입력)까지만 만든다.
 */

import { parseHealthFunctionalFoodOfficialText } from './health-functional-food-official-text.parser.js';
import type { HealthFunctionalFoodItem } from './health-functional-food-jsonl.parser.js';

// ─── Seed (AI 입력 — WO §5.3 / seed-design §3) ──────────────────────────────

export interface HealthFunctionalFoodDescriptionSeed {
  sttemntNo: string | null;
  productName: string;
  manufacturerName: string | null;
  /** MAIN_FNCTN 원문(정규화). 매장 설명의 기능성은 이 범위를 벗어나면 안 됨 */
  mainFunction: string | null;
  /** MAIN_FNCTN 을 ⑴⑵/개행 기준으로 항목 분리한 인정 기능성 문구(verbatim 화이트리스트) */
  functionalClaims: string[];
  intake: string | null;
  caution: string | null;
  baseStandard: string | null;
  sourceFields: string[];
  missingFields: string[];
}

/** MAIN_FNCTN 항목 분리: ⑴⑵… 전각 번호 / 개행 기준. 의미 변형 없이 verbatim.
 *  멀티정제/멀티성분 제품의 구조 노이즈(원료 라벨 `[비타민A]`, 섹션 헤더 `정제1 :` 등)는
 *  claim 이 아니므로 whitelist 에서 제외한다(원문 mainFunction 은 그대로 보존됨). */
export function splitFunctionalClaims(mainFunction: string | null | undefined): string[] {
  if (!mainFunction) return [];
  return mainFunction
    // 전각 원문자 번호(⑴~⒇, ①~⑳)와 개행을 분리자로
    .split(/[\n\r]+|(?=[⑴-⒇①-⑳])/)
    .map((s) => s.replace(/^[⑴-⒇①-⑳\s.、,)]+/, '').trim())
    // 앞머리 원료 라벨만 떼어냄 ("[비타민A] 어두운 곳..." → "어두운 곳...")
    .map((s) => s.replace(/^\[[^\]]{1,40}\]\s*/, '').trim())
    .filter((s) => s.length >= 4) // 너무 짧은 조각 제거
    .filter((s) => !/^\[[^\]]*\]$/.test(s)) // 원료 라벨 단독 제외
    .filter((s) => !/^(정제|캡슐|과립|분말)\s*\d*\s*[:：]?$/.test(s)) // 섹션 헤더 제외
    .filter((s) => !/[:：]\s*$/.test(s)); // 콜론으로 끝나는 헤더 제외
}

/** parser 결과 없이 item 하나 → seed (파서를 내부에서 사용). */
export function buildHealthFunctionalFoodDescriptionSeed(
  item: HealthFunctionalFoodItem | null | undefined,
): HealthFunctionalFoodDescriptionSeed {
  const parsed = parseHealthFunctionalFoodOfficialText(item);
  const s = parsed.sections;
  const sourceFields: string[] = [];
  const missingFields: string[] = [];
  ([
    ['mainFunction', s.mainFunction],
    ['intake', s.intake],
    ['caution', s.caution],
    ['baseStandard', s.baseStandard],
  ] as const).forEach(([k, v]) => (v ? sourceFields : missingFields).push(k));

  return {
    sttemntNo: parsed.sttemntNo,
    productName: parsed.productName ?? '(제품명 없음)',
    manufacturerName: parsed.manufacturerName,
    mainFunction: s.mainFunction ?? null,
    functionalClaims: splitFunctionalClaims(s.mainFunction),
    intake: s.intake ?? null,
    caution: s.caution ?? null,
    baseStandard: s.baseStandard ?? null,
    sourceFields,
    missingFields,
  };
}

// ─── 출력 draft 타입 (WO §5.5) ──────────────────────────────────────────────

export interface HealthFunctionalFoodStoreDescriptionDraft {
  title: string;
  summary: string;
  sections: {
    mainFunction: string[];
    howToTake: string[];
    caution: string[];
    standardNote?: string;
  };
  sourceTrace: {
    usedFields: string[];
    omittedFields: string[];
  };
  reviewFlags: string[];
}

// ─── 프롬프트 (system + user) ───────────────────────────────────────────────

/**
 * 매장용 소비자 설명 생성 시스템 프롬프트.
 * seed-design §5·§6 금지/보존 카탈로그를 규칙으로 내장. 효능/질병 표현 "일괄 금지"가 아니라
 * "원문 인정 범위 안에서 자연스럽게, 강화·창작만 금지".
 */
export const HFF_STORE_DESCRIPTION_SYSTEM_PROMPT = `당신은 건강기능식품 매장의 상품 설명 작성 도우미입니다.
식약처에 신고된 공식 원문(seed)만을 근거로, 소비자가 매장에서 이해하기 쉬운 상품 설명 초안을 만듭니다.

[역할]
- 입력 seed 의 사실 범위 안에서만 작성합니다. 근거 없는 내용을 만들지 않습니다.
- 딱딱한 규제 문구가 아니라, 매장에서 안내하기 좋은 자연스러운 문장으로 작성합니다.

[기능성(mainFunction) 규칙 — 가장 중요]
- 기능성은 seed.functionalClaims(식약처 신고 인정 문구) 범위를 벗어나지 않습니다.
- 인정 문구의 어미("…에 도움을 줄 수 있음")를 보존합니다. "…된다 / 낫는다 / 좋아진다 / 효과가 있다 / 확실히" 처럼 강화·단정하지 않습니다.
- functionalClaims 에 없는 기능·효능을 추가하지 않습니다.
- mainFunction 이 비어 있으면 기능성 블록을 생략합니다(빈 내용 창작 금지).

[허용]
- 기능성 표현, 건강 관련 맥락, 질병명 언급(주의 안내 맥락), 의약품 복용 중 상담 안내, 부작용/이상사례 주의 문구는 필요 시 사용합니다.

[금지 — seed-design §6 카탈로그]
1. 질병의 예방·치료·완치 표방 ("감기 예방", "혈압을 낮춘다", "암/당뇨에 효과").
2. 의약품 오인 용어 ("약", "특효", "처방", "복용" → "섭취", "건강기능식품" 사용).
3. 과대·최상급·안전성 단정 ("최고", "100%", "완벽", "즉시", "부작용 없음").
4. 인정 범위 초과 (functionalClaims 밖 기능 추가).
5. 효과 단정(어미 강화).
6. 특정 질환자 타겟팅 ("고혈압 환자에게", "당뇨 있으면").
7. 원문에 없는 원료/성분 설명. seed 에 원료 필드가 없으므로 원료 중심 설명 금지.
8. 기준규격(baseStandard)을 효능 근거처럼 해석하지 않음(성분/함량 참고로만, standardNote 에 간결히).

[주의(caution) 보존]
- seed.caution 은 소비자 안전 정보입니다. 삭제하지 말고 의미를 보존해 안내 문장으로 반영합니다.

[출력]
- 반드시 아래 JSON 스키마만 출력합니다. JSON 외 설명 텍스트 금지.
{
  "title": string,                 // 제품명 기반 간결한 제목
  "summary": string,               // 2~3문장 요약(기능성 인정 범위 내)
  "sections": {
    "mainFunction": string[],      // 기능성 안내(각 항목=인정 문구 인용/자연화). 없으면 []
    "howToTake": string[],         // 섭취 방법(seed.intake 근거). 없으면 []
    "caution": string[],           // 주의 안내(seed.caution 의미 보존). 없으면 []
    "standardNote": string         // (선택) 성분/함량 참고 1문장. 효능 근거로 쓰지 말 것
  },
  "sourceTrace": { "usedFields": string[], "omittedFields": string[] },
  "reviewFlags": string[]          // 스스로 검토 필요하다고 본 지점(예: RISK_CLAIM_BORDERLINE)
}
- 너무 길거나 짧지 않게. summary 는 과장 없이.`;

/** seed → user 프롬프트(JSON seed 전달 + 결측 안내). */
export function buildHealthFunctionalFoodStoreDescriptionUserPrompt(
  seed: HealthFunctionalFoodDescriptionSeed,
): string {
  const missingNote =
    seed.missingFields.length > 0
      ? `\n(결측 필드: ${seed.missingFields.join(', ')} — 해당 블록은 생략하고 창작하지 마세요.)`
      : '';
  return `다음 건강기능식품 공식 seed 로 매장 설명 초안 JSON 을 작성하세요.
functionalClaims 는 식약처 신고 인정 기능성 문구입니다 — 이 범위 밖 기능을 추가하지 마세요.${missingNote}

seed:
${JSON.stringify(seed, null, 2)}`;
}
