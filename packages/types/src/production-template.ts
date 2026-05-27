/**
 * @o4o/types/production-template — Production Template Registry Types (canonical)
 *
 * WO-O4O-PRODUCTION-TEMPLATE-REGISTRY-CROSSSERVICE-PHASE2-J-V1 (2026-05-27)
 *
 * KPA productionTemplates.ts 에 로컬 정의되어 있던 타입들을 공통화.
 * GlycoPharm / K-Cosmetics 가 동일 타입 기반으로 서비스별 template registry 를 정의한다.
 *
 * Phase 2-J 범위 (본 모듈):
 *   - LengthOption / ToneOption
 *   - ProductionOutputConstraints
 *   - ProductionTemplate
 *
 * 사용처:
 *   - KPA: services/web-kpa-society/src/pages/pharmacy/productionTemplates.ts
 *   - GlycoPharm: services/web-glycopharm/src/config/productionTemplates.ts
 *   - K-Cosmetics: services/web-k-cosmetics/src/config/productionTemplates.ts
 */

import type { ProductionTarget } from './production.js';

export type LengthOption = 'short' | 'medium' | 'long';
export type ToneOption = 'friendly' | 'professional' | 'concise';

/**
 * 제작 자료 출력 제약.
 * target/template별 AI 생성 범위를 제한하여 결과물을 구조화한다.
 */
export interface ProductionOutputConstraints {
  /** AI 생성 본문 최대 글자수 (초과 시 client에서 경고 또는 truncate) */
  maxBodyLength?: number;
  /** 허용되는 length 옵션 (미지정 시 all 허용) */
  allowedLengths?: LengthOption[];
  /** AI 응답에서 반드시 사용해야 하는 필드 목록 */
  requiredFields?: string[];
  /** 강제 레이아웃 (POP 전용) */
  layout?: 'A4' | 'A5' | 'A6' | 'card';
}

/**
 * 제작 자료 템플릿.
 *
 * template = 구조 seed + AI 제약 + editor starter 세 부분으로 구성된다.
 *
 * - id: 전역 유일 ('{target}-{style}' 패턴 권장)
 * - target: 소속 제작 유형
 * - systemPromptOverride: AiContentModal → POST /api/ai/content 시 customPrompt에 prepend
 * - forcedOptions: AiContentModal의 tone/length 자동 preset (사용자 변경 가능)
 * - outputConstraints: target 수준 제약 (registry 조회 후 enforce)
 * - starterHtml: RichTextEditor 초기 콘텐츠 (editor.commands.setContent 호출용)
 */
export interface ProductionTemplate {
  id: string;
  target: ProductionTarget;

  /** 사용자에게 표시되는 이름 */
  name: string;
  /** 카드 설명 (1-2줄) */
  description?: string;
  /** 썸네일 이미지 URL (향후 디자인 추가 시 채움) */
  thumbnail?: string;

  /** 스타일 레이블 (e.g. '전문형', '친근형', '간결형') */
  style?: string;
  /** 검색/필터용 태그 */
  tags?: string[];

  /**
   * AI 생성 시 customPrompt 앞에 prepend될 추가 지시문.
   * - 기존 outputType 기반 system prompt에 stack됨 (override가 아닌 supplement)
   * - 500자 미만 권장 (customPrompt cap 1000자 내 수용)
   */
  systemPromptOverride?: string;

  /**
   * AiContentModal에서 자동으로 적용되는 tone/length.
   * - 사용자가 UI에서 변경 가능 (강제 lock이 아님)
   * - 첫 진입 시 preset 적용 목적
   */
  forcedOptions?: {
    length?: LengthOption;
    tone?: ToneOption;
  };

  /** target 수준 출력 제약 */
  outputConstraints?: ProductionOutputConstraints;

  /**
   * RichTextEditor 초기 HTML.
   * - ProductionMaterialEditorPage에서 editor value로 주입
   * - generatedHtml이 있으면 generatedHtml 우선, 없으면 starterHtml 사용
   */
  starterHtml?: string;

  /** POP 레이아웃 사이즈 (POP target 전용) */
  layout?: 'A4' | 'A5' | 'A6' | 'card';
}
