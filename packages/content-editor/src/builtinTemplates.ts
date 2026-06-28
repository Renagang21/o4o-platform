/**
 * Built-in (프론트 제공) 템플릿 — WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1 Phase 2
 *
 * 백엔드 저장 없이 편집기가 기본 제공하는 템플릿. id 가 BUILTIN_TEMPLATE_ID_PREFIX 로 시작한다.
 * 사용 기록(onUseTemplate)·삭제 대상이 아니다(백엔드 row 없음).
 */
import type { ContentTemplate } from './types';
import { PRODUCT_DETAIL_860_TEMPLATE_HTML } from './extensions/productDetailLayout';

export const BUILTIN_TEMPLATE_ID_PREFIX = 'builtin:';

export function isBuiltinTemplateId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(BUILTIN_TEMPLATE_ID_PREFIX);
}

export const BUILTIN_TEMPLATES: ContentTemplate[] = [
  {
    id: 'builtin:product-detail-860',
    name: '상품 상세설명 표준형(860px)',
    description: '상품 상세페이지 기준 폭(860px)에 맞춘 기본 골격 — 작성 위치·구조만 제공',
    category: 'product',
    contentHtml: PRODUCT_DETAIL_860_TEMPLATE_HTML,
    isPublic: true,
    usageCount: 0,
  },
];
