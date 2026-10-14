/**
 * 취급매장 모집 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §3-6
 *
 *   GET  /api/v1/neture/pharmacy/recruitments             일반 공개 모집 + 가입한 세미프랜차이즈의 모집 + 내 약국 참여 상태
 *   POST /api/v1/neture/pharmacy/recruitments/:id/apply   약국 조직 단위 참여 신청
 * 사업 모집은 공급자 참여 승인 후 사업별 공급 조건을 적용한다. 일반 공개 모집은 별도 제품 승인 조건을 유지한다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { neturePharmacyApi, pharmacyErrorMessage, type PharmacyRecruitment } from '../../api/neturePharmacy';
import { Notice, PharmacyPage, StatusBadge, btn, formatDate, formatWon, pharmacyStorePath } from './shared';

const APPLICATION_LABEL: Record<string, string> = {
  pending: '승인 대기',
  approved: '참여 승인',
  rejected: '반려',
  cancelled: '취소',
};

export default function PharmacyRecruitmentsPage() {
  const [rows, setRows] = useState<PharmacyRecruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await neturePharmacyApi.listRecruitments());
    } catch (e) {
      setError(pharmacyErrorMessage(e, '모집 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const apply = async (r: PharmacyRecruitment) => {
    setBusyId(r.id);
    setError(null);
    setMessage(null);
    try {
      await neturePharmacyApi.applyRecruitment(r.id);
      setMessage(`${r.productName} 모집에 참여 신청했습니다. 공급자의 참여 결정을 기다려 주세요.`);
      await load();
    } catch (e) {
      setError(pharmacyErrorMessage(e, '참여 신청에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PharmacyPage
      title="취급매장 모집"
      description="공급자의 일반 공개 모집과 가입한 세미프랜차이즈의 모집을 확인합니다. 세미프랜차이즈 제품 등재와 공급에는 해당 사업의 승인 조건이 적용됩니다."
      actions={<button className={btn.secondary} onClick={load} disabled={loading}><RefreshCw size={14} className={`inline ${loading ? 'animate-spin' : ''}`} /> 새로고침</button>}
    >
      {message && <Notice>{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {loading ? (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          <p>지금 참여할 수 있는 모집이 없습니다.</p>
          <p className="mt-1">일반 공개 모집은 바로 표시되며, 세미프랜차이즈 모집은 가입 조건이 적용됩니다. <Link className="underline" to={pharmacyStorePath('semiFranchises')}>세미프랜차이즈 보기</Link></p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">제품</th>
                <th className="px-4 py-3 font-medium">모집 구분</th>
                <th className="px-4 py-3 font-medium">공급자</th>
                <th className="px-4 py-3 text-right font-medium">공급 단가</th>
                <th className="px-4 py-3 text-right font-medium">소비자가</th>
                <th className="px-4 py-3 font-medium">등록일</th>
                <th className="px-4 py-3 text-center font-medium">참여</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = r.applicationStatus;
                const canApply = !st || st === 'rejected' || st === 'cancelled';
                return (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.productName}</td>
                    <td className="px-4 py-3">{r.semiFranchiseName || '일반 공개'}</td>
                    <td className="px-4 py-3">{r.supplierName}</td>
                    <td className="px-4 py-3 text-right">{formatWon(r.supplyUnitPrice)}</td>
                    <td className="px-4 py-3 text-right">{formatWon(r.consumerPrice)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      {st && <div className="mb-1"><StatusBadge status={st} label={APPLICATION_LABEL[st] ?? st} /></div>}
                      {canApply && (
                        <button className={btn.primary} disabled={busyId === r.id} onClick={() => apply(r)}>
                          {st ? '다시 신청' : '참여 신청'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PharmacyPage>
  );
}
