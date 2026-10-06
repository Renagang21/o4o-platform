/**
 * 취급매장 모집 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §3-6
 *
 *   GET  /api/v1/neture/pharmacy/recruitments             가입한 세미프랜차이즈의 진행 중 모집 + 내 약국 참여 상태
 *   POST /api/v1/neture/pharmacy/recruitments/:id/apply   약국 조직 단위 참여 신청
 * 공급자가 참여를 승인하면 그 조건(공급 단가)으로 공급 상품의 `모집 참여` 경로에서 바로 주문할 수 있다.
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
      setMessage(`${r.productName} 모집에 참여 신청했습니다. 공급자 승인 후 주문할 수 있습니다.`);
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
      description="가입한 세미프랜차이즈에서 공급자가 진행 중인 취급매장 모집입니다. 참여가 승인되면 공급 상품의 '모집 참여' 경로에서 주문할 수 있습니다."
      actions={<button className={btn.secondary} onClick={load} disabled={loading}><RefreshCw size={14} className={`inline ${loading ? 'animate-spin' : ''}`} /> 새로고침</button>}
    >
      {message && <Notice>{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {loading ? (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          <p>지금 참여할 수 있는 모집이 없습니다.</p>
          <p className="mt-1">모집은 가입한 세미프랜차이즈 안에서만 보입니다. <Link className="underline" to={pharmacyStorePath('semiFranchises')}>세미프랜차이즈 보기</Link></p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">제품</th>
                <th className="px-4 py-3 font-medium">세미프랜차이즈</th>
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
                    <td className="px-4 py-3">{r.semiFranchiseName}</td>
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
