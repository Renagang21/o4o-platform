/**
 * SupplierRecruitmentDetailPage — 공급자 판매자 모집 상세 / 신청자 심사
 *
 * WO-O4O-SELLER-RECRUITMENT-SUPPLIER-APPLICATION-REVIEW-V1
 *
 * 공급자 본인 모집의 신청자 목록을 확인하고 승인/반려한다.
 * 승인은 기존 승인 API(ownership + C bridge backend)를 재사용한다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supplierRecruitmentApi, type RecruitmentDetail } from '../../lib/api/supplier';

const SERVICE_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  'kpa-society': 'KPA Society',
  'k-cosmetics': 'K-Cosmetics',
  neture: 'Neture',
};

const APP_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '대기', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '반려', cls: 'bg-red-100 text-red-700' },
  // WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1: 신청자 본인 철회 (공급자는 상태만 확인, 승인/반려 액션 없음)
  cancelled: { label: '신청 취소', cls: 'bg-slate-200 text-slate-600' },
};

// WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1: 서비스 노출 승인 상태 (운영자 콘솔과 동일 라벨)
const EXPOSURE_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: '노출 대기', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '노출 승인', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '노출 반려', cls: 'bg-red-100 text-red-700' },
};

// 노출 상태별 안내 배너 (공급자는 조회만 — 변경 액션 없음)
const EXPOSURE_NOTICE: Record<string, { cls: string; text: string }> = {
  pending: {
    cls: 'bg-amber-50 border-amber-100 text-amber-800',
    text: '서비스 운영자가 모집 제품의 노출을 검토 중입니다. 승인 전에는 매장/약국 사용자에게 보이지 않습니다.',
  },
  approved: {
    cls: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    text: '이 모집은 서비스에 노출 중입니다. 매장/약국 사용자가 신청할 수 있습니다.',
  },
  rejected: {
    cls: 'bg-red-50 border-red-100 text-red-800',
    text: '서비스 운영자가 이 모집의 노출을 반려했습니다. 매장/약국 사용자에게 보이지 않습니다.',
  },
};

export default function SupplierRecruitmentDetailPage() {
  const { recruitmentId } = useParams<{ recruitmentId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<RecruitmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!recruitmentId) return;
    setLoading(true);
    const data = await supplierRecruitmentApi.getApplications(recruitmentId);
    if (!data) setNotFound(true);
    setDetail(data);
    setLoading(false);
  }, [recruitmentId]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (applicationId: string) => {
    setBusyId(applicationId);
    setError(null);
    const result = await supplierRecruitmentApi.approveApplication(applicationId);
    setBusyId(null);
    if (!result.success) setError(result.message || '승인에 실패했습니다.');
    await load();
  };

  const handleReject = async (applicationId: string) => {
    const reason = window.prompt('반려 사유 (선택)') ?? undefined;
    setBusyId(applicationId);
    setError(null);
    const result = await supplierRecruitmentApi.rejectApplication(applicationId, reason);
    setBusyId(null);
    if (!result.success) setError(result.message || '반려에 실패했습니다.');
    await load();
  };

  // WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1
  const handleTerminate = async (applicationId: string) => {
    if (!window.confirm('이 판매자의 모집 참여를 해지하면 신규 조달 상품 노출이 중단됩니다.\n기존 주문 이력과 정산 이력은 유지됩니다.\n해지하시겠습니까?')) return;
    setBusyId(applicationId);
    setError(null);
    const result = await supplierRecruitmentApi.terminateApplication(applicationId);
    setBusyId(null);
    if (!result.success) setError(result.message || '참여 해지에 실패했습니다.');
    await load();
  };

  // WO-O4O-SELLER-RECRUITMENT-CLOSE-ACTION-V1
  const handleCloseRecruitment = async () => {
    if (!recruitmentId) return;
    if (!window.confirm('이 모집을 마감하면 신규 신청을 받을 수 없습니다.\n기존 신청자에 대한 승인/반려는 계속 처리할 수 있습니다.\n마감하시겠습니까?')) return;
    setError(null);
    const result = await supplierRecruitmentApi.close(recruitmentId);
    if (!result.success) setError(result.message || '마감에 실패했습니다.');
    await load();
  };

  // WO-O4O-SELLER-RECRUITMENT-REOPEN-ACTION-V1
  const handleReopenRecruitment = async () => {
    if (!recruitmentId) return;
    if (!window.confirm('재개하면 이 모집은 다시 신규 신청을 받을 수 있습니다.\n기존 신청 및 승인 이력은 그대로 유지됩니다.\n재개하시겠습니까?')) return;
    setError(null);
    const result = await supplierRecruitmentApi.reopen(recruitmentId);
    if (!result.success) setError(result.message || '재개에 실패했습니다.');
    await load();
  };

  if (loading) {
    return <div className="max-w-4xl py-16 text-center text-slate-400 text-sm">불러오는 중...</div>;
  }
  if (notFound || !detail) {
    return (
      <div className="max-w-4xl py-16 text-center">
        <p className="text-sm text-slate-500">모집을 찾을 수 없습니다.</p>
        <button type="button" onClick={() => navigate('/supplier/recruitments')} className="mt-3 text-sm text-blue-600 hover:text-blue-800">모집 현황으로 돌아가기</button>
      </div>
    );
  }

  const r = detail.recruitment;

  return (
    <div className="max-w-4xl">
      <button type="button" onClick={() => navigate('/supplier/recruitments')} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> 모집 현황
      </button>

      {/* 모집 요약 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900">{r.productName}</h1>
          {r.status === 'recruiting' ? (
            <button
              type="button"
              onClick={handleCloseRecruitment}
              className="shrink-0 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:border-red-300 hover:text-red-600"
            >
              모집 마감
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReopenRecruitment}
              className="shrink-0 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:border-emerald-300 hover:text-emerald-600"
            >
              모집 재개
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-slate-400">대상 서비스</div><div className="text-slate-700">{SERVICE_LABELS[r.serviceId] || r.serviceId || '-'}</div></div>
          <div><div className="text-xs text-slate-400">수수료율</div><div className="text-slate-700">{r.commissionRate ? `${r.commissionRate}%` : '-'}</div></div>
          <div><div className="text-xs text-slate-400">상태</div><div className="text-slate-700">{r.status === 'recruiting' ? '모집중' : '마감'}</div></div>
          {/* WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1 */}
          <div>
            <div className="text-xs text-slate-400">노출 승인</div>
            <div className="mt-0.5">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(EXPOSURE_BADGE[r.exposureStatus] || { cls: 'bg-gray-100 text-gray-600' }).cls}`}>
                {(EXPOSURE_BADGE[r.exposureStatus] || { label: r.exposureStatus }).label}
              </span>
            </div>
          </div>
          <div><div className="text-xs text-slate-400">생성일</div><div className="text-slate-700">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</div></div>
        </div>

        {/* WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1: 노출 상태별 안내 (공급자 조회 전용 — 변경 불가) */}
        {EXPOSURE_NOTICE[r.exposureStatus] && (
          <div className={`mt-3 text-xs rounded border px-2.5 py-2 ${EXPOSURE_NOTICE[r.exposureStatus].cls}`}>
            {EXPOSURE_NOTICE[r.exposureStatus].text}
            {r.exposureStatus === 'rejected' && (
              <div className="mt-1.5 text-slate-600">
                <span className="font-medium text-slate-500">반려 메모: </span>
                {r.exposureReviewNote && r.exposureReviewNote.trim()
                  ? r.exposureReviewNote
                  : <span className="text-slate-400">반려 사유가 입력되지 않았습니다.</span>}
              </div>
            )}
          </div>
        )}

        {r.status === 'closed' && (
          <p className="mt-3 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-1.5">
            이 모집은 마감되어 신규 신청을 받지 않습니다. 기존 신청자에 대한 승인/반려는 계속 처리할 수 있습니다.
          </p>
        )}
      </div>

      <h2 className="text-base font-semibold text-slate-800 mb-2">신청자 ({detail.applications.length})</h2>
      <p className="text-xs text-slate-500 mb-3">승인하면 해당 판매자가 이 모집 제품을 주문 가능한 상품으로 확인할 수 있습니다. 반려하면 모집 참여 대상에서 제외됩니다.</p>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      {detail.applications.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm rounded-xl border border-slate-200 bg-white">아직 신청자가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">신청자</th>
                <th className="px-4 py-3">조직/매장</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">신청일</th>
                <th className="px-4 py-3 text-center">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.applications.map((a) => {
                const badge = APP_STATUS[a.status] || { label: a.status, cls: 'bg-gray-100 text-gray-600' };
                const busy = busyId === a.id;
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.partnerName}</div>
                      {a.partnerEmail && <div className="text-xs text-slate-400">{a.partnerEmail}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.organizationName || <span className="text-slate-300">-</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                      {a.participationTerminated && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">참여 해지됨</span>
                      )}
                      {a.status === 'rejected' && a.reason && <div className="text-xs text-slate-400 mt-0.5">{a.reason}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(a.appliedAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {a.status === 'pending' ? (
                        <span className="inline-flex items-center gap-2">
                          {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                          <button type="button" disabled={busy} onClick={() => handleApprove(a.id)} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm disabled:opacity-50">승인</button>
                          <button type="button" disabled={busy} onClick={() => handleReject(a.id)} className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50">반려</button>
                        </span>
                      ) : a.status === 'approved' && !a.participationTerminated ? (
                        <span className="inline-flex items-center gap-2">
                          {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                          <button type="button" disabled={busy} onClick={() => handleTerminate(a.id)} className="text-slate-500 hover:text-red-600 font-medium text-sm disabled:opacity-50">참여 해지</button>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">완료</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
