/** 매장 제품의 범위와 직접 등록 방식을 구분하는 화면 문구. */
export const DIRECT_PRODUCT_MANAGER_LABELS = {
  title: '직접 등록 제품',
  emptyTitle: '등록된 직접 등록 제품이 없습니다',
};

export function directProductFormTitle(editing: boolean) {
  return editing ? '직접 등록 제품 수정' : '직접 등록 제품 등록';
}

export const DIRECT_PRODUCT_DESCRIPTION_LABELS = {
  sidebarTitle: (count: number) => `직접 등록 제품 (${count})`,
  listErrorFallback: '직접 등록 제품을 불러오지 못했습니다.',
  listErrorText: '직접 등록 제품을 불러오지 못했습니다.',
  emptyText: '등록된 직접 등록 제품이 없습니다.',
  emptyLinkText: '직접 등록 제품 등록하기',
};

export const STORE_PRODUCT_NAME = '내 매장 제품';
export const DIRECT_PRODUCT_DESCRIPTION_NOTICE =
  '직접 등록 제품의 상세설명을 저장하는 화면입니다. 저장한 내용은 해당 매장에서만 조회·수정합니다. O4O 공용 상품 DB의 대표 설명은 O4O 관리자가 관리합니다. 매장 홍보문·이벤트·POP·블로그 문구는 콘텐츠 만들기에서 별도로 제작하세요.';
