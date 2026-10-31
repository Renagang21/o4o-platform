import { COOPERATION_MODELS, cooperationDestination } from '@o4o/shared-space-ui';
import { requestServiceHandoff } from '@o4o/auth-react';
import { Link } from 'react-router-dom';
/**
 * 약국 협력사업 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §3-2 · §7
 *
 *   GET  /api/v1/neture/pharmacy/semi-franchises              목록 + 내 약국의 가입 상태
 * 가입·취소·탈퇴는 각 모델 서비스에서 처리하고 내 매장에서는 해당 서비스로 이동한다.
 * 승인 · 반려 · 정지는 그 약국 협력사업 담당 운영자가 한다. 커뮤니티는 가입 active 일 때만 열린다(서버 판정).
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/apiClient';
import { RefreshCw } from 'lucide-react';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { neturePharmacyApi, pharmacyErrorMessage, type SemiFranchiseRow } from '../../api/neturePharmacy';
import { Notice, PharmacyPage, StatusBadge, btn, formatDate } from './shared';

export default function SemiFranchisesPage() {
  const { organizationId, stores } = useUnifiedStore();
  const canEnterCommunity = ['owner', 'admin', 'manager'].includes(stores?.find(s => s.organizationId === organizationId)?.memberRole ?? '');
  return <SemiFranchiseRecords key={organizationId} organizationId={organizationId} canEnterCommunity={canEnterCommunity} />;
}

function SemiFranchiseRecords({ organizationId, canEnterCommunity }: { organizationId: string | null; canEnterCommunity: boolean }) {
  const { begin: beginMove } = useLatestRequest();
  const [rows, setRows] = useState<SemiFranchiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows([]);
    setError(null);
    try {
      setRows(await neturePharmacyApi.listSemiFranchises());
    } catch (e) {
      setError(pharmacyErrorMessage(e, '약국 협력사업 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const enterCommunity = async (row: SemiFranchiseRow, section: 'home' | 'participation' = 'home') => {
    if (!canEnterCommunity || !organizationId || (section === 'home' && !row.communityKey)) return;
    const isCurrent = beginMove();
    setBusyKey(row.key); setError(null);
    try {
      const destination = cooperationDestination(row.key, section);
      const returnPath = `${destination.returnPath}?store=${encodeURIComponent(organizationId)}`;
      const href = destination.navigation === 'public'
        ? new URL(returnPath, destination.origin).href
        : await requestServiceHandoff(api, { ...destination, returnPath });
      if (isCurrent()) window.location.assign(href);
    } catch { if (isCurrent()) { setError('사업 참여자 공간으로 이동하지 못했습니다. 다시 시도해 주세요.'); setBusyKey(null); } }
  };

  return (
    <PharmacyPage
      title="이용 사업 · 가입 관리"
      description="Pharmacy 기본 회원은 약국 승인 시 함께 연결됩니다. 다른 약국 협력사업은 해당 서비스에서 별도로 신청합니다. 공급 상품과 자료는 내 매장에서 사업별로 이용하며, 이미 복사한 자료는 탈퇴 후에도 남습니다."
      actions={<button className={btn.secondary} onClick={load} disabled={loading}><RefreshCw size={14} className={`inline ${loading ? 'animate-spin' : ''}`} /> 새로고침</button>}
    >
      {error && <Notice tone="error">{error}</Notice>}
      {!loading && rows.some(r => r.membershipStatus === 'active') && <section aria-label="가입한 약국 협력사업" className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">가입한 약국 협력사업</h2>
        <p className="mb-4 text-sm text-slate-600">가입자 공간에서 사업 소식과 회원들의 이야기를 확인하고, 상품과 자료는 이 매장에서 이용하세요.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.filter(r => r.membershipStatus === 'active').map(r => <article key={r.key} className="min-w-0 rounded-xl border bg-white p-5">
            <h3 className="break-words font-semibold">{r.name}</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-blue-700">
              {r.communityKey && canEnterCommunity && <button type="button" className="min-h-11 rounded-lg border px-3 py-2" disabled={busyKey !== null} onClick={() => void enterCommunity(r)}>가입자 공간</button>}
              <Link className="min-h-11 rounded-lg border px-3 py-2" to={`/store/pharmacy/supply?source=${encodeURIComponent(`sf:${r.key}`)}`}>공급 상품</Link>
              <Link className="min-h-11 rounded-lg border px-3 py-2" to={`/store/pharmacy/contents?business=${encodeURIComponent(r.key)}`}>자료 가져오기</Link>
              <Link className="min-h-11 rounded-lg border px-3 py-2" to={`/store/pharmacy/orders?business=${encodeURIComponent(r.key)}`}>주문 내역</Link>
              {r.key === 'carepharm' && <Link className="min-h-11 rounded-lg border px-3 py-2" to={COOPERATION_MODELS.carepharm.storePath}>만성질환관리 업무</Link>}
            </div>
          </article>)}
        </div>
      </section>}
      <h2 className="mb-3 text-lg font-semibold">사업 가입 · 신청 관리</h2>
      {loading ? (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-gray-500">가입할 수 있는 약국 협력사업가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">약국 협력사업</th>
                <th className="px-4 py-3 font-medium">가입 상태</th>
                <th className="px-4 py-3 font-medium">신청 · 처리</th>
                <th className="px-4 py-3 font-medium">참여자 공간</th>
                <th className="px-4 py-3 text-center font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = r.membershipStatus;
                const participantStatus = !canEnterCommunity ? '약국 경영자 이용' : r.communityKey ? (r.key === 'pharmacy' ? '약국 승인 후 기본 회원 연결' : '가입 승인 후 이용') : '-';
                return (
                  <tr key={r.key} className="border-b border-gray-100 last:border-0" data-testid={`semi-franchise-${r.key}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}{r.registrationConditions && <p className="text-xs font-normal whitespace-pre-wrap">{r.registrationConditions}</p>}</td>
                    <td className="px-4 py-3">
                      {st ? <StatusBadge status={st} /> : <span className="text-gray-400">미가입</span>}
                      {r.reason && <p className="mt-1 text-xs text-gray-500">사유: {r.reason}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.appliedAt ? `신청 ${formatDate(r.appliedAt)}` : '-'}
                      {r.decidedAt ? ` · 처리 ${formatDate(r.decidedAt)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {r.communityKey && canEnterCommunity && st === 'active' ? <button className="text-blue-700" disabled={busyKey === r.key} onClick={() => enterCommunity(r)}>참여자 공간</button> : participantStatus}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canEnterCommunity ? <button className={btn.primary} disabled={busyKey !== null} onClick={() => void enterCommunity(r, 'participation')}>{r.key === 'pharmacy' ? 'Pharmacy 회원 상태 확인' : '서비스에서 가입 · 상태 관리'}</button> : <span className="text-gray-500">약국 경영자 이용</span>}
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
