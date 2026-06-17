/**
 * RecruitmentExposureConsole — 판매자 모집 노출 승인 (공통 presentational)
 *
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1
 *
 * 운영자 승인 = 판매자 모집 제품의 "자기 서비스 노출" 승인 (개별 판매자 승인 아님).
 * 데이터 fetch / approve / reject 는 각 서비스 wrapper 가 자기 apiClient 로 수행하고 props 로 주입.
 * semantic 색만 사용 — 서비스 accent 불필요.
 *
 * WO-O4O-OPERATOR-RECRUITMENT-EXPOSURE-STANDARD-LIST-ADOPTION-V1 (최소 개선):
 *   카드 승인 큐 유지(DataTable/Pagination/검색/정렬 미적용 — 화면 성격상 N/A).
 *   exposureStatus 필터(opt-in)만 도입. 필터 상태·URL sync 는 page 가 소유(controlled).
 */
import { StandardListToolbar } from '../list';

export interface RecruitmentExposureFilterOption {
  value: string;
  label: string;
}

const DEFAULT_EXPOSURE_FILTERS: RecruitmentExposureFilterOption[] = [
  { value: 'pending', label: '노출 대기' },
  { value: 'approved', label: '노출 승인' },
  { value: 'rejected', label: '노출 반려' },
  { value: 'all', label: '전체' },
];

export interface RecruitmentExposureItem {
  id: string;
  productName: string;
  supplierName: string;
  serviceId: string;
  status: string; // recruiting | closed
  exposureStatus: string; // pending | approved | rejected
  consumerPrice?: number;
  commissionRate?: number;
  exposureReviewedAt?: string | null;
  exposureReviewNote?: string;
  createdAt?: string;
}

export interface RecruitmentExposureConsoleProps {
  items: RecruitmentExposureItem[];
  loading: boolean;
  /** 승인/반려 처리 중인 id */
  busyId?: string | null;
  /** "매장/약국 사용자"(KPA·GP) | "매장 사용자"(KCos) */
  audienceLabel?: string;
  onApprove: (id: string, note?: string) => void;
  onReject: (id: string, note?: string) => void;
  // WO-O4O-OPERATOR-RECRUITMENT-EXPOSURE-STANDARD-LIST-ADOPTION-V1: exposureStatus 필터(opt-in, controlled by page)
  /** 현재 필터 값(예: 'pending'|'approved'|'rejected'|'all'). onFilterChange 와 함께 제공 시 필터 노출. */
  filterStatus?: string;
  /** 필터 옵션(미지정 시 기본: 노출 대기/승인/반려/전체). */
  filterOptions?: RecruitmentExposureFilterOption[];
  /** 필터 변경 콜백 — 제공 시 필터 UI 노출. page 가 fetch/URL sync 수행. */
  onFilterChange?: (value: string) => void;
}

const EXPOSURE_META: Record<string, { label: string; cls: string }> = {
  pending: { label: '노출 대기', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '노출 승인', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '노출 반려', cls: 'bg-red-100 text-red-700' },
};

const OP_STATUS_LABEL: Record<string, string> = {
  recruiting: '모집중',
  closed: '마감',
};

export function RecruitmentExposureConsole({
  items,
  loading,
  busyId,
  audienceLabel = '매장 사용자',
  onApprove,
  onReject,
  filterStatus,
  filterOptions,
  onFilterChange,
}: RecruitmentExposureConsoleProps) {
  const handleReject = (id: string) => {
    const note = window.prompt('노출 반려 사유 (선택)') ?? undefined;
    onReject(id, note);
  };
  const options = filterOptions ?? DEFAULT_EXPOSURE_FILTERS;

  return (
    <div className="max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">판매자 모집 노출 승인</h1>
        <p className="text-sm text-slate-500 mt-1">
          공급자가 생성한 판매자 모집 제품을 우리 서비스의 {audienceLabel}에게 노출할지 검토합니다.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          개별 판매자 승인/반려는 공급자가 모집 상세에서 처리합니다.
        </p>
      </div>

      {onFilterChange && (
        <div className="mb-4">
          <StandardListToolbar
            filters={
              <select
                value={filterStatus ?? 'pending'}
                onChange={(e) => onFilterChange(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="노출 승인 상태 필터"
              >
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            }
            summary={!loading ? `총 ${items.length}건` : undefined}
          />
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm rounded-xl border border-slate-200 bg-white">
          노출 승인 대상 모집이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const ex = EXPOSURE_META[it.exposureStatus] || { label: it.exposureStatus, cls: 'bg-slate-100 text-slate-600' };
            const busy = busyId === it.id;
            const isApproved = it.exposureStatus === 'approved';
            const isRejected = it.exposureStatus === 'rejected';
            return (
              <div key={it.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-800">{it.productName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {it.supplierName && <span>{it.supplierName} · </span>}
                      {it.serviceId || '-'}
                      {it.createdAt && <span> · 생성일 {new Date(it.createdAt).toLocaleDateString('ko-KR')}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {OP_STATUS_LABEL[it.status] || it.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ex.cls}`}>{ex.label}</span>
                  </div>
                </div>
                {it.exposureReviewNote && (
                  <p className="mt-2 text-xs text-slate-500">검토 메모: {it.exposureReviewNote}</p>
                )}
                <div className="mt-3 flex justify-end gap-2">
                  {/* pending: 승인/반려 · approved: 반려(노출 중단) · rejected: 승인(재노출) */}
                  {!isApproved && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onApprove(it.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {busy ? '처리 중...' : '노출 승인'}
                    </button>
                  )}
                  {!isRejected && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleReject(it.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                    >
                      {busy ? '처리 중...' : '노출 반려'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecruitmentExposureConsole;
