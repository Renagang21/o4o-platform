/**
 * Store Settings — Template ↔ Blocks 적용 규칙 (pure)
 *
 * WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1
 *
 * 기존 결함: `/store/settings` 에서 템플릿을 바꿔도 blocks 가 재생성되지 않아
 * 저장 시 이전 템플릿의 blocks 가 그대로 굳었고, 공개 매장 홈은 blocks 만 렌더하므로
 * 템플릿 선택이 반영되지 않았다.
 *
 * 이 모듈은 "템플릿 기본 blocks 생성" + "저장 시 blocks 결정" 규칙만 담는
 * 순수 함수 모음이다(express/typeorm 의존 없음 → 단위 테스트 가능).
 * 템플릿 정의의 단일 원천을 유지하기 위해 프론트로 복제하지 않는다.
 *
 * 3서비스(KPA / GlycoPharm / K-Cosmetics) 공용 store-settings.controller 가 사용한다.
 */

import { StoreTemplate, StoreBlock } from './store-settings.types.js';

// ── Default Blocks per Template ───────────────────────────────────────────────

export function generateDefaultBlocks(template: StoreTemplate): StoreBlock[] {
  switch (template) {
    case 'COMMERCE_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
      ];
    case 'CONTENT_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'INFO_SECTION', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'MINIMAL':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'BASIC':
    default:
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'TABLET_PROMO', enabled: true },
      ];
  }
}

// ── Legacy template_profile name → StoreTemplate ──────────────────────────────

const LEGACY_TEMPLATE_MAP: Record<string, StoreTemplate> = {
  standard: 'BASIC',
  compact: 'MINIMAL',
  visual: 'CONTENT_FOCUS',
  minimal: 'MINIMAL',
  BASIC: 'BASIC',
  COMMERCE_FOCUS: 'COMMERCE_FOCUS',
  CONTENT_FOCUS: 'CONTENT_FOCUS',
  MINIMAL: 'MINIMAL',
};

export function normalizeTemplate(raw: string | null | undefined): StoreTemplate {
  if (!raw) return 'BASIC';
  return LEGACY_TEMPLATE_MAP[raw] ?? 'BASIC';
}

// ── 저장 시 template / blocks 결정 ────────────────────────────────────────────

export interface TemplateApplyInput {
  /** 저장 전 서버 기준 템플릿 (storefront_config.template ?? template_profile) */
  currentTemplate: StoreTemplate;
  /** 저장 전 blocks (storefront_blocks → storefront_config.blocks → 템플릿 기본값) */
  currentBlocks: StoreBlock[];
  /** 요청 body 의 template (미포함이면 undefined) */
  patchTemplate?: StoreTemplate;
  /** 요청 body 의 blocks (미포함이면 undefined) */
  patchBlocks?: StoreBlock[];
  /** 템플릿 카드를 실제로 선택했을 때만 프론트가 true 로 보내는 명시 신호 */
  applyTemplateDefaults?: boolean;
}

export interface TemplateApplyResult {
  template: StoreTemplate;
  blocks: StoreBlock[];
  /** storefront_blocks 를 write 해야 하는가 */
  blocksChanged: boolean;
  blocksSource: 'template-defaults' | 'request' | 'unchanged';
}

/**
 * 우선순위 (WO §6):
 *   1. applyTemplateDefaults=true → 대상 템플릿의 기본 blocks 로 교체
 *      (템플릿을 실제로 바꾼 경우. 프론트가 명시 신호를 보낼 때만 성립)
 *   2. blocks 가 요청에 포함 → 요청 blocks 그대로 저장 (사용자 직접 편집)
 *   3. 둘 다 아님 → 기존 blocks 유지 (theme 만 변경 등)
 *
 * blocks 내용 비교 휴리스틱은 쓰지 않는다 — 명시 신호만 신뢰한다.
 */
export function resolveTemplateAndBlocks(input: TemplateApplyInput): TemplateApplyResult {
  const template = input.patchTemplate ?? input.currentTemplate;

  if (input.applyTemplateDefaults === true) {
    return {
      template,
      blocks: generateDefaultBlocks(template),
      blocksChanged: true,
      blocksSource: 'template-defaults',
    };
  }

  if (input.patchBlocks !== undefined) {
    return { template, blocks: input.patchBlocks, blocksChanged: true, blocksSource: 'request' };
  }

  return { template, blocks: input.currentBlocks, blocksChanged: false, blocksSource: 'unchanged' };
}
