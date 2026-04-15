/**
 * StatusBadge — GlycoPharm 공통 상태 배지
 *
 * WO-GLYCOPHARM-UI-COMMON-COMPONENTS-V1
 * 모든 GlycoPharm 도메인 상태를 하나의 컴포넌트로 통합.
 */

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  // Green — 긍정/완료
  active:    { label: '활성',     bg: 'bg-green-100',  text: 'text-green-700' },
  approved:  { label: '승인됨',   bg: 'bg-green-100',  text: 'text-green-700' },
  delivered: { label: '배송완료', bg: 'bg-green-100',  text: 'text-green-700' },
  paid:      { label: '결제완료', bg: 'bg-green-100',  text: 'text-green-700' },

  // Amber — 대기/보류
  pending:           { label: '대기',     bg: 'bg-amber-100',  text: 'text-amber-700' },
  submitted:         { label: '심사 대기', bg: 'bg-amber-100',  text: 'text-amber-700' },
  pending_approval:  { label: '승인 대기', bg: 'bg-amber-100',  text: 'text-amber-700' },

  // Blue — 확인
  confirmed: { label: '확인됨', bg: 'bg-blue-100', text: 'text-blue-700' },

  // Purple — 처리중
  processing: { label: '처리중', bg: 'bg-purple-100', text: 'text-purple-700' },

  // Indigo — 배송
  shipped: { label: '배송중', bg: 'bg-indigo-100', text: 'text-indigo-700' },

  // Slate — 비활성/임시
  draft:    { label: '임시저장', bg: 'bg-slate-100', text: 'text-slate-600' },
  inactive: { label: '비활성',   bg: 'bg-slate-100', text: 'text-slate-500' },
  refunded: { label: '환불됨',   bg: 'bg-slate-100', text: 'text-slate-500' },

  // Red — 거부/취소/정지
  rejected:  { label: '반려됨', bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { label: '취소됨', bg: 'bg-red-100', text: 'text-red-700' },
  suspended: { label: '일시정지', bg: 'bg-red-100', text: 'text-red-700' },
  failed:    { label: '실패',   bg: 'bg-red-100', text: 'text-red-700' },

  // Orange — 보완요청
  revision_requested: { label: '보완요청', bg: 'bg-orange-100', text: 'text-orange-700' },
};

const FALLBACK = { label: '알 수 없음', bg: 'bg-slate-100', text: 'text-slate-500' };

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || FALLBACK;
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {label || config.label}
    </span>
  );
}
