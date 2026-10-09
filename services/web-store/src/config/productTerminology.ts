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
