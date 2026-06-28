/**
 * ProductDetailLayout — O4O 고정 레이아웃 컨테이너 노드
 *
 * WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1 Phase 2 (§B)
 *
 * 상품 상세설명의 최대 폭(860px)을 콘텐츠와 함께 이동시키기 위한 TipTap 전용 블록 노드.
 * raw-HTML-preserve 우회가 아니라 TipTap 이 정식으로 parse/render/serialize 하므로,
 * 적용 → 내부 편집 → HTML 왕복 → 저장 → 재진입 전 구간에서 보존된다.
 *
 * 제약(WO 명시):
 *   - 임의 width/style 입력 비허용 — 폭/정렬은 고정 렌더(아래 FIXED_STYLE).
 *   - 일반 div 를 전부 노드로 해석하지 않음 — data-o4o-layout="product-detail-860" 마커가 있는 div 만 parse.
 *   - atom/비편집 노드 아님 — content: 'block+' (내부 제목/문단/이미지 편집 가능).
 *   - 모바일은 max-width 기반으로 부모 폭에 맞춰 자동 축소.
 */
import { Node, mergeAttributes } from '@tiptap/core';

export const PRODUCT_DETAIL_860_MARKER = 'product-detail-860';

/** 고정 렌더 스타일 — width 100% + max-width 860px 가운데 정렬 (모바일 자동 축소). */
const FIXED_STYLE =
  'width:100%;max-width:860px;margin-left:auto;margin-right:auto;box-sizing:border-box;';

export const ProductDetailLayout = Node.create({
  name: 'productDetailLayout',
  group: 'block',
  content: 'block+',
  // defining: 편집/병합/재파싱 과정에서 래퍼 노드 경계를 보존
  defining: true,
  // 중첩 방지: 자기 자신을 직접 포함하지 않도록
  isolating: false,

  parseHTML() {
    return [
      {
        // 마커가 있는 div 만 이 노드로 해석 (일반 div 회귀 방지)
        tag: `div[data-o4o-layout="${PRODUCT_DETAIL_860_MARKER}"]`,
      },
    ];
  },

  renderHTML() {
    // 폭/정렬은 고정 — 입력값을 받지 않고 항상 동일하게 렌더.
    return [
      'div',
      mergeAttributes({
        'data-o4o-layout': PRODUCT_DETAIL_860_MARKER,
        style: FIXED_STYLE,
      }),
      0,
    ];
  },
});

/**
 * 860px 상품 상세설명 표준형 — 작성 위치·구조만 제공(실제 효능/정보 없음).
 * 마커 div + TipTap 안전 요소(h2/p/img/hr)로 구성 → 노드/내부 편집 보존.
 */
export const PRODUCT_DETAIL_860_TEMPLATE_HTML = [
  `<div data-o4o-layout="${PRODUCT_DETAIL_860_MARKER}" style="${FIXED_STYLE}">`,
  '<p>[대표 이미지를 삽입하세요]</p>',
  '<h2>상품명</h2>',
  '<p>여기에 상품명을 입력하세요.</p>',
  '<h2>핵심 특징</h2>',
  '<p>핵심 특징을 항목별로 작성하세요.</p>',
  '<h2>상세 설명</h2>',
  '<p>상세 설명을 작성하세요.</p>',
  '<h2>이용/사용 안내</h2>',
  '<p>이용 또는 사용 방법을 작성하세요.</p>',
  '<h2>주의사항</h2>',
  '<p>주의사항을 작성하세요.</p>',
  '<h2>문의/추가 안내</h2>',
  '<p>문의처 또는 추가 안내를 작성하세요.</p>',
  '</div>',
].join('');
