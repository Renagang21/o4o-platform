/**
 * StoreRecruitmentApplicationsView — 매장 신청·승인 현황 (공통 presentational)
 *
 * WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
 *
 * KPA / GlycoPharm / K-Cosmetics 매장 앱이 공통으로 사용하는 조회 전용 뷰.
 * 데이터(fetch)는 각 서비스 wrapper 가 자체 api client 로 가져와 props 로 주입한다.
 * semantic 색(slate/emerald/red/amber)만 사용 — 서비스 accent 불필요(purge 안전).
 */
export interface StoreRecruitmentApplicationRow {
  applicationId: string;
  recruitmentId: string;
  productId: string;
  productName: string;
  supplierName: string;
  serviceId: string;
  status: string; // pending | approved | rejected | cancelled
  participationTerminated: boolean;
  appliedAt: string;
  decidedAt: string | null;
  reason: string;
}

export interface StoreRecruitmentApplicationsViewProps {
  applications: StoreRecruitmentApplicationRow[];
  loading: boolean;
  /** 화면 설명(서비스별 문구 미세 차이 허용). 기본 제공. */
  description?: string;
  /**
   * WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1
   * 제공되면 pending 신청에 "신청 취소" 버튼을 노출하고 클릭 시 호출한다.
   * 미제공이면 취소 버튼 미노출(조회 전용).
   */
  onCancelApplication?: (applicationId: string) => void;
  /** 취소 처리 중인 applicationId (버튼 비활성/문구용). */
  cancellingId?: string | null;
}

const SERVICE_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  'kpa-society': 'KPA Society',
  'k-cosmetics': 'K-Cosmetics',
  neture: 'Neture',
};

function resolveState(a: StoreRecruitmentApplicationRow): { label: string; cls: string; note: string } {
  if (a.status === 'approved' && a.participationTerminated) {
    return {
      label: '참여 해지됨',
      cls: 'bg-slate-200 text-slate-600',
      note: '해당 모집 제품의 조달 가능 상태가 종료되었습니다. 기존 주문 이력은 유지됩니다.',
    };
  }
  if (a.status === 'approved') {
    return {
      label: '승인됨',
      cls: 'bg-emerald-100 text-emerald-700',
      note: '승인된 모집 제품은 조달 가능한 상품에서 확인할 수 있습니다.',
    };
  }
  if (a.status === 'rejected') {
    return {
      label: '반려됨',
      cls: 'bg-red-100 text-red-700',
      note: a.reason ? `반려 사유: ${a.reason}` : '신청이 반려되었습니다. 필요한 경우 공급자 안내를 확인해 주세요.',
    };
  }
  if (a.status === 'cancelled') {
    return {
      label: '신청 취소',
      cls: 'bg-slate-200 text-slate-600',
      note: '신청을 취소했습니다. 공급자는 더 이상 이 신청을 심사하지 않습니다.',
    };
  }
  return { label: '심사 대기', cls: 'bg-amber-100 text-amber-700', note: '공급자가 신청 내용을 검토 중입니다.' };
}

export function StoreRecruitmentApplicationsView({ applications, loading, description, onCancelApplication, cancellingId }: StoreRecruitmentApplicationsViewProps) {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">신청·승인 현황</h1>
        <p className="text-sm text-slate-500 mt-1">
          {description || '공급자 판매자 모집에 신청한 내역과 승인 상태를 확인합니다.'}
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">불러오는 중...</div>
      ) : applications.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm rounded-xl border border-slate-200 bg-white">
          신청한 판매자 모집이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((a) => {
            const st = resolveState(a);
            return (
              <div key={a.applicationId} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-800">{a.productName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {a.supplierName && <span>{a.supplierName} · </span>}
                      {SERVICE_LABELS[a.serviceId] || a.serviceId || '-'} · 신청일 {new Date(a.appliedAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{st.note}</p>
                {onCancelApplication && a.status === 'pending' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onCancelApplication(a.applicationId)}
                      disabled={cancellingId === a.applicationId}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {cancellingId === a.applicationId ? '취소 중...' : '신청 취소'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StoreRecruitmentApplicationsView;
