/**
 * Guide Contents — Schema Validation
 *
 * WO-O4O-GUIDE-SCHEMA-VALIDATION-V1
 *
 * GuideBlock JSON 저장 전 최소 schema 검증.
 * 저장 차단 대상: title 누락, steps 없음, steps 항목이 문자열 아님,
 *                 빈 단계, 크기 초과.
 *
 * fallback 유지 정책과 무관 — 이 함수는 신규 저장 경로에서만 호출됨.
 */

export interface GuideContentPayload {
  title: string;
  description: string;
  steps: string[];
}

export interface GuideValidationResult {
  valid: boolean;
  /** 첫 번째 오류 메시지 (valid=false일 때만 의미 있음) */
  error?: string;
}

/** 최대 허용 값 */
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_STEPS = 10;

/**
 * GuideBlock JSON payload를 저장 전 검증한다.
 *
 * @param payload - handleSave에서 JSON.stringify 직전 객체
 * @returns { valid, error }
 */
export function validateGuideContent(payload: GuideContentPayload): GuideValidationResult {
  const { title, description, steps } = payload;

  // title: required, non-empty, length limit
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { valid: false, error: '제목을 입력해 주세요.' };
  }
  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    return { valid: false, error: `제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해 주세요.` };
  }

  // description: optional, length limit
  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return { valid: false, error: `설명은 ${MAX_DESCRIPTION_LENGTH}자 이하로 입력해 주세요.` };
  }

  // steps: required, min 1
  if (!Array.isArray(steps) || steps.length === 0) {
    return { valid: false, error: '단계 안내를 1개 이상 입력해 주세요.' };
  }

  // steps: max count
  if (steps.length > MAX_STEPS) {
    return { valid: false, error: `단계 안내는 최대 ${MAX_STEPS}개까지 입력할 수 있습니다.` };
  }

  // steps: all items must be non-empty strings
  for (let i = 0; i < steps.length; i++) {
    const item = steps[i];
    if (typeof item !== 'string') {
      return { valid: false, error: `단계 안내 항목은 문자열이어야 합니다. (${i + 1}번째 항목)` };
    }
    if (item.trim() === '') {
      return { valid: false, error: `빈 단계 안내 항목이 있습니다. (${i + 1}번째 항목)` };
    }
  }

  return { valid: true };
}
