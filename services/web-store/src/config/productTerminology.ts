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

export const STORE_PRODUCT_SETTINGS_LABELS = {
  title: '제품 진열 설정',
  description: 'O4O DB 기반 제품의 표시 가격·설명·이미지·채널 노출을 관리합니다.',
  registerButtonLabel: 'O4O 제품 취급 등록',
  infoText: 'O4O 제품을 매장 경영활용 제품으로 등록할 수 있습니다. 등록한 제품은 태블릿 전시, QR 안내, 사이니지 등에 연결해 활용할 수 있습니다.',
  emptyTitle: '취급 중인 O4O 제품이 없습니다',
  emptyDescription: 'O4O 제품을 취급 등록해 태블릿과 매장 안내 서비스에 활용해 주세요.',
};

export const STORE_PRODUCT_MESSAGES = {
  empty: '등록한 제품이 없습니다. O4O 제품에서 찾아 등록하거나 매장에서 직접 등록할 수 있습니다.',
  remove: '선택한 제품을 내 매장 제품에서 제거하시겠습니까? 직접 등록 제품은 제품 정보가 삭제됩니다.\nO4O DB 원본과 자료함 콘텐츠·QR은 삭제되지 않습니다.',
  usage: '※ 등록 방식과 관계없이 제품을 QR·태블릿·콘텐츠 제작에 활용할 수 있습니다. 공급 상품 주문과는 별개입니다.',
};
