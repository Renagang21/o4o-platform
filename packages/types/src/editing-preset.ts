/**
 * EditingPreset — 편집 AI 의 surface-agnostic preset 표준 (상위 계층)
 *
 * WO-O4O-AI-PRODUCTION-TEMPLATE-SURFACE-PRESET-EXTEND-V1
 *
 * 경계(엄수):
 * - store 제작물 preset 의 SSOT 는 여전히 `ProductionTemplate`(target: ProductionTarget, store 전용).
 *   `ProductionTarget` 에 LMS/resources 를 **추가하지 않는다**(store-domain 오염 금지).
 * - 본 `EditingPreset` 은 store 4-target 을 **포함하는 상위 surface 집합**(store 바깥 surface 포함)을
 *   표현하기 위한 별도 타입. store template 은 `productionTemplateToEditingPreset` 로 변환/참조만 한다.
 * - `AiContentModal` 의 기존 generic prop 계약(`templateSystemPrompt` / `templateForcedOptions`)을
 *   그대로 소비한다(새 prop·새 모달 없음).
 *
 * backend 무관: `/api/ai/content` 의 outputType별 base prompt 빌더는 그대로이며,
 * preset 은 systemPromptOverride(customPrompt prepend) + forcedOptions(tone/length) 만 얹는다.
 */

import type { LengthOption, ToneOption, ProductionTemplate } from './production-template.js';

/** 편집 AI 가 쓰이는 surface. store 4-target + store 바깥 surface. */
export type EditingSurface =
  // store 제작물 (SSOT = ProductionTemplate)
  | 'pop'
  | 'qr'
  | 'blog'
  | 'product-description'
  // store 바깥 편집 surface
  | 'lms-lesson'
  | 'resource'
  | 'library-entry';

/**
 * surface-agnostic 편집 preset.
 * - `forcedOptions` 는 `ProductionTemplate.forcedOptions` 와 동일 형태 →
 *   `AiContentModal` 의 `templateForcedOptions` 로 그대로 전달 가능.
 */
export interface EditingPreset {
  id: string;
  surface: EditingSurface;
  name: string;
  description?: string;
  /** AiContentModal `templateSystemPrompt` 로 전달 — base prompt 위에 prepend(override 아님, supplement). */
  systemPromptOverride?: string;
  /** AiContentModal `templateForcedOptions` 로 전달 — 진입 시 tone/length preset. */
  forcedOptions?: {
    tone?: ToneOption;
    length?: LengthOption;
  };
}

/**
 * 비-store surface 의 canonical 기본 preset.
 * - store 4-target(pop/qr/blog/product-description)은 `ProductionTemplate` registry(서비스별)가 SSOT 이므로
 *   여기서 중복 정의하지 않는다. 본 레지스트리는 store 바깥 surface 의 플랫폼 표준 기본값만 담는다.
 * - 서비스가 더 세분화된 preset 이 필요하면 자체 registry 로 override 가능(후속).
 */
export const EDITING_PRESETS: Partial<Record<EditingSurface, EditingPreset>> = {
  'lms-lesson': {
    id: 'lms-lesson-default',
    surface: 'lms-lesson',
    name: '레슨 본문',
    description: '학습자가 따라가기 쉬운 교육용 본문 — 단계적 설명, 전문적이되 차분한 톤.',
    systemPromptOverride:
      '교육용 레슨 본문입니다. 학습자가 단계적으로 이해할 수 있도록 개념 → 설명 → 예시 순으로 구조화하고, 과장 없이 정확하고 차분한 전문가 어조로 작성하세요.',
    forcedOptions: { tone: 'professional', length: 'long' },
  },
  'resource': {
    id: 'resource-default',
    surface: 'resource',
    name: '자료 글쓰기',
    description: '신뢰할 수 있는 정보 전달 중심의 자료 글 — 핵심을 구조화, 과장 금지.',
    systemPromptOverride:
      '정보 전달 중심의 자료 글입니다. 핵심을 명확한 제목/문단으로 구조화하고, 근거 없는 과장 표현을 피하며 정확하고 전문적인 어조로 작성하세요.',
    forcedOptions: { tone: 'professional', length: 'medium' },
  },
  'library-entry': {
    id: 'library-entry-default',
    surface: 'library-entry',
    name: '제작 자료 초안',
    description: '타깃 미지정 범용 초안 — 중립적 톤/길이.',
    forcedOptions: { tone: 'professional', length: 'medium' },
  },
};

/** surface 에 해당하는 canonical 기본 preset 조회(없으면 undefined). */
export function findEditingPreset(surface: EditingSurface): EditingPreset | undefined {
  return EDITING_PRESETS[surface];
}

/**
 * store `ProductionTemplate` → `EditingPreset` 변환.
 * store preset 의 SSOT 는 `ProductionTemplate` 이며, 본 함수는 상위 계층(EditingPreset)에서
 * 동일 정보를 참조하기 위한 변환만 제공한다(역방향 변환·store 타입 확장은 하지 않음).
 */
export function productionTemplateToEditingPreset(t: ProductionTemplate): EditingPreset {
  return {
    id: t.id,
    // ProductionTarget('pop'|'qr'|'blog'|'product-description') 은 EditingSurface 의 부분집합
    surface: t.target as EditingSurface,
    name: t.name,
    description: t.description,
    systemPromptOverride: t.systemPromptOverride,
    forcedOptions: t.forcedOptions,
  };
}
