/**
 * Pharmacy-Hub Supplier Menu (서비스별 config)
 *
 * WO-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * 공급자 영역은 operator/store 와 달리 공통 Shell 이 존재하지 않는다(조사 결과 — CHECK §2).
 * 따라서 메뉴는 서비스 config 로 두고 SupplierShell 이 이 데이터만 읽어 렌더한다.
 * 레이아웃이 메뉴를 알지 못하게 분리해 두면, 이후 공통 Supplier Shell 이 생겼을 때
 * 이 config 를 그대로 주입하는 것으로 편입이 끝난다.
 *
 * 노출 범위:
 *   실재 라우트만 넣는다 (CLAUDE.md §1 — 데드링크 0 / 실기능 은폐 0).
 *   '상품 제공 설정' = /supplier/products (WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1).
 *   후속 기능(공급자 콘텐츠 제공 · 이벤트 오퍼)은 라우트가 생길 때 해당 WO 에서 추가한다.
 */

export type SupplierMenuItem = {
  label: string;
  /** 절대 경로 (기존 URL 보존 — redirect 신설 0) */
  path: string;
  /** true 면 정확히 일치할 때만 활성 (index 라우트용) */
  exact?: boolean;
};

export type SupplierMenuSection = {
  /** 빈 문자열이면 헤딩을 렌더하지 않는다 */
  label: string;
  items: SupplierMenuItem[];
};

export const SUPPLIER_MENU_SECTIONS: SupplierMenuSection[] = [
  {
    label: '',
    items: [{ label: '공급자 홈', path: '/supplier', exact: true }],
  },
  {
    label: '상품 공급',
    items: [{ label: '상품 제공 설정', path: '/supplier/products' }],
  },
];
