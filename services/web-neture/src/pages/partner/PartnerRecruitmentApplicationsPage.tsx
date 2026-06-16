/**
 * PartnerRecruitmentApplicationsPage — 내 매장 / 신청·승인 현황
 *
 * WO-O4O-MY-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
 *
 * 판매자(매장)가 공급자 판매자 모집에 신청한 내역과 승인/참여 상태를 확인한다.
 * My Page 이력이 아니라 내 매장의 조달 참여 신청 상태(조회 전용).
 */
import { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { partnerRecruitmentApi, type PartnerApplication } from '../../lib/api/partner';

const SERVICE_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  'kpa-society': 'KPA Society',
  'k-cosmetics': 'K-Cosmetics',
  neture: 'Neture',
};

// 신청 상태 + 참여 해지 파생 → 표시
function resolveState(a: PartnerApplication): { label: string; cls: string; note: string } {
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

export default function PartnerRecruitmentApplicationsPage() {
  const [rows, setRows] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await partnerRecruitmentApi.listMine());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1: pending 신청 본인 취소
  const handleCancel = useCallback(
    async (applicationId: string) => {
      if (!window.confirm('이 신청을 취소하면 공급자가 더 이상 해당 신청을 심사하지 않습니다.\n취소하시겠습니까?')) return;
      setCancellingId(applicationId);
      const res = await partnerRecruitmentApi.cancelMine(applicationId);
      if (!res.success) {
        window.alert('신청 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        await load();
      }
      setCancellingId(null);
    },
    [load],
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          신청·승인 현황
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          공급자 판매자 모집에 신청한 내역과 승인 상태를 확인합니다.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm rounded-xl border border-slate-200 bg-white">
          신청한 판매자 모집이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
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
                {a.status === 'pending' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCancel(a.applicationId)}
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
