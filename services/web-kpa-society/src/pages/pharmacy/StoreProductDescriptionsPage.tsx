/**
 * StoreProductDescriptionsPage — 약국 경영지원 / 상품 설명 (결과물 관리 전용)
 *
 * WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS-CANONICAL-ALIGN-V1
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1:
 *   "신규 제작 시작" 진입 제거 — 신규 생성은 "내 자료함 → 제작 시작 → 상품 상세설명"에서만.
 *   본 페이지는 보유 상품의 기존 product_description 결과물 조회/재편집/저장/삭제(빈값 저장).
 * WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1:
 *   RichTextEditor 기반 편집 · selectedTemplateId 수신 · template badge · starterHtml 주입.
 * WO-O4O-KPA-CONTENT-CREATION-AI-ENTRY-REMOVE-V1:
 *   페이지형 AI 진입 제거. 직접 작성/저장/prefill 및 Toolbar "AI 정리"는 보존.
 * WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1 (2026-07-29):
 *   canonical 저장 위치 = `store_local_products.detail_html`
 *     - 조회: 목록 응답 row 의 detailHtml / detail_html (추가 조회 API 없음)
 *     - 저장: PUT /api/v1/store/local-products/:id  { detailHtml }  (부분 업데이트)
 *   description / summary / usage_info / caution_info 는 본 화면에서 건드리지 않는다.
 *
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreProductDescriptionsView 로 이관(KCos/GP 와 동일 Core).
 *   이 파일은 API adapter + KPA 문구 원문 + KPA palette + 편집기(이미지 업로드 포함) 주입만 담는다.
 *   ⚠️ 문구·palette 는 이관 전 원문을 그대로 옮긴 것이다. 공통 기본값으로 치환하지 않는다.
 *
 * Backend: store_local_products (Display Domain, organization_id 격리).
 */

import {
  StoreProductDescriptionsView,
  type StoreProductDescriptionsApi,
} from '@o4o/store-ui-core';
import { RichTextEditor } from '@o4o/content-editor';
import { fetchLocalProducts, updateLocalProduct } from '../../api/localProducts';
import { mediaApi } from '../../api/media';
import { getAccessToken } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';
import { findTemplate } from './productionTemplates';

const descriptionsApi: StoreProductDescriptionsApi = {
  fetchLocalProducts: (params) => fetchLocalProducts(params),
  updateLocalProduct: (id, data) => updateLocalProduct(id, data),
};

// WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1: RichTextEditor 이미지 업로드
const handleImageUpload = async (file: File): Promise<string> => {
  const res = await mediaApi.upload(file, true, 'kpa-society', 'product-description');
  if (res.success && res.data) return res.data.url;
  throw new Error(res.error || '이미지 업로드에 실패했습니다.');
};

export default function StoreProductDescriptionsPage() {
  return (
    <StoreProductDescriptionsView
      api={descriptionsApi}
      findTemplate={(id) => findTemplate(id) ?? null}
      /* KPA palette (styles/theme) — slate 계열 + primary #2563EB */
      theme={{
        accent: colors.primary,
        accentText: colors.white,
        textStrong: colors.neutral800,
        textBody: colors.neutral700,
        textMuted: colors.neutral500,
        textSubtle: colors.neutral400,
        sidebarTitleColor: colors.neutral600,
        breadcrumbSeparator: colors.neutral300,
        divider: colors.neutral200,
        inputBorder: colors.neutral300,
        surface: colors.white,
        templateBadgeBg: '#eef2ff',
        templateBadgeColor: '#4f46e5',
      }}
      /* KPA 원문 문구 (WO-O4O-KPA-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1 사이드바 정렬 포함) */
      labels={{
        breadcrumbRoot: '약국 경영지원',
        breadcrumbCurrent: '상품 설명',
        title: '상품 상세설명 관리',
        subtitle: (
          <>
            저장된 상품 상세설명을 조회·재편집·삭제(빈값 저장)합니다.
            신규 생성은 "내 자료함 → 제작 시작 → 상품 상세설명"에서 진입하세요.
          </>
        ),
        notice: (
          <>
            이 화면의 상세설명은 <strong>매장 자체 상품에 저장</strong>되며, 해당 매장에서만 조회·수정됩니다.
            O4O 공용 상품 DB(표준 상품)의 대표 설명은 O4O 관리자가 관리하며 이 화면에서 수정되지 않습니다.
            약국 특화 홍보문·이벤트 문구·POP/블로그용 문구가 필요하면 <strong>콘텐츠 만들기</strong>에서 별도 콘텐츠로 제작하세요.
          </>
        ),
        // WO-O4O-KPA-STORE-LOCAL-PRODUCTS-ENTRY-ALIGNMENT-V1: 메뉴 라벨 '매장 자체 상품'과 정렬
        sidebarTitle: (count) => `매장 자체 상품 (${count})`,
        listErrorFallback: '매장 자체 상품을 불러오지 못했습니다.',
        listErrorText: '매장 자체 상품을 불러오지 못했습니다.',
        emptyText: '등록된 매장 자체 상품이 없습니다.',
        emptyLinkText: '매장 자체 상품 등록하기',
        saveSuccessToast: '상품 설명이 저장되었습니다',
        placeholderExisting: '저장된 상품 상세설명을 수정하세요.',
        placeholderFallback: '상품 상세설명을 작성하세요.',
      }}
      renderEditor={({ editorKey, value, onChange, placeholder }) => (
        <RichTextEditor
          key={editorKey}
          value={value}
          onChange={(c) => onChange(c.html)}
          onImageUpload={handleImageUpload}
          placeholder={placeholder}
          minHeight="360px"
          preset="full"
          aiRequestHeaders={(() => {
            const token = getAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : undefined;
          })()}
        />
      )}
    />
  );
}
