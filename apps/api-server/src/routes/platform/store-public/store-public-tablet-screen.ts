/**
 * 공개 태블릿 Screen Set → template-compatible renderer (Phase 1)
 *
 * WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1
 *   향후 "템플릿 선택 → 콘텐츠 블록 배치" 프로세스를 받을 수 있는 구조.
 *   Phase 1 = 기본 템플릿 1개(corner_information_basic_v1). **template 테이블/컬럼/UI 없음** — 구조만.
 *   idle_media / product_list 등 비동기 resolve 는 handler 가 수행하고, 텍스트류만 여기서 안전 추출.
 */

export const DEFAULT_TABLET_TEMPLATE_KEY = 'corner_information_basic_v1';

/**
 * screen_set → template key.
 * 현재 스키마에 template_key 컬럼이 없으므로 항상 기본. 후속 컬럼 도입 시 `screenSet.templateKey`만 채우면 자동 반영.
 */
export function resolveTemplateKey(screenSet: { templateKey?: string | null } | null | undefined): string {
  const k = (screenSet as any)?.templateKey;
  return typeof k === 'string' && k.trim() ? k : DEFAULT_TABLET_TEMPLATE_KEY;
}

export interface RenderedSection {
  blockType: string;
  sortOrder: number;
  data: Record<string, unknown>;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * 텍스트류 block config 안전 추출. 불량/빈 값이면 null(→ 섹션 생략, 안전 fallback).
 * idle_media / product_list / product_content 는 handler 가 async resolve 하므로 여기서 다루지 않는다.
 */
export function shapeStaticBlock(blockType: string, config: unknown): Record<string, unknown> | null {
  const c = (config && typeof config === 'object' && !Array.isArray(config) ? config : {}) as Record<string, any>;
  switch (blockType) {
    case 'corner_description':
    case 'health_info': {
      const title = str(c.title);
      const body = str(c.body);
      return title || body ? { title, body } : null;
    }
    case 'staff_inquiry': {
      const message = str(c.message);
      return message ? { message } : null;
    }
    case 'qr_guide': {
      const label = str(c.label);
      const url = str(c.url);
      return label || url ? { label, url } : null;
    }
    default:
      return null;
  }
}
