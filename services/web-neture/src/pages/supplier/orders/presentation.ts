export const formatKRW = (v: number | null | undefined): string =>
  `₩${Number(v ?? 0).toLocaleString('ko-KR')}`;

// 주문 출처/유형 배지 라벨·색상
export const SOURCE_BADGE: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  neture: { label: 'Neture 주문', bg: '#dbeafe', color: '#1d4ed8' },
  event_offer: { label: '이벤트 오퍼 주문', bg: '#ede9fe', color: '#6d28d9' },
  service_checkout: { label: '서비스 주문', bg: '#f1f5f9', color: '#475569' },
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  created: '주문접수',
  pending_payment: '결제대기',
  paid: '결제완료',
  preparing: '준비중',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
  refunded: '환불',
};

export const SERVICE_ICONS: Record<string, string> = {
  'k-cosmetics': '💄',
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatDate(dateStr);
};
