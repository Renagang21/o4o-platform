import { requestServiceHandoff } from '@o4o/auth-react';
import { Link } from 'react-router-dom';
/**
 * 약국 협력사업 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §3-2 · §7
 *
 *   GET  /api/v1/neture/pharmacy/semi-franchises              목록 + 내 약국의 가입 상태
 *   POST /api/v1/neture/pharmacy/semi-franchises/:key/apply   가입 신청(pending) — `pharmacy` 도 같은 절차
 *   POST /api/v1/neture/pharmacy/semi-franchises/:key/withdraw 탈퇴(terminated)
 * 승인 · 반려 · 정지는 그 약국 협력사업 담당 운영자가 한다. 커뮤니티는 가입 active 일 때만 열린다(서버 판정).
 * 신청 · 승인 시 서버는 Neture 가입 승인(active)을 직접 확인한다(CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E2) —
 * 승인 전이면 `NETURE_MEMBERSHIP_REQUIRED` 로 거절되고 이 화면은 Neture 가입 안내 링크를 붙인다.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/apiClient';
import { RefreshCw } from 'lucide-react';
import { PLATFORM_ORIGIN } from '../../config/workspace';
import { neturePharmacyApi, pharmacyErrorCode, pharmacyErrorMessage, type SemiFranchiseRow } from '../../api/neturePharmacy';
import { Notice, PharmacyPage, StatusBadge, btn, formatDate } from './shared';

export default function SemiFranchisesPage() {
  const [rows, setRows] = useState<SemiFranchiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [netureRequired, setNetureRequired] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
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

  const act = async (row: SemiFranchiseRow, action: 'apply' | 'withdraw') => {
    const confirmText = row.membershipStatus === 'pending'
      ? `${row.name} 가입 신청을 취소하시겠습니까?`
      : `${row.name} 에서 탈퇴하시겠습니까? 탈퇴하면 이 약국 협력사업의 공급 상품을 주문할 수 없습니다.`;
    if (action === 'withdraw' && !window.confirm(confirmText)) return;
    setBusyKey(row.key);
    setError(null);
    setNetureRequired(false);
    setMessage(null);
    try {
      if (action === 'apply') {
        if (row.registrationConditions && !window.confirm(`${row.name} 가입 조건\n\n${row.registrationConditions}\n\n조건을 확인하고 가입을 신청하시겠습니까?`)) return;
        const note = window.prompt('추가 신청 내용 (선택, 2000자 이내)', '');
        if (note === null) return;
        await neturePharmacyApi.applySemiFranchise(row.key, { acceptedConditions: true, conditions: row.registrationConditions || undefined, note });
      }
      else await neturePharmacyApi.withdrawSemiFranchise(row.key);
      setMessage(action === 'apply' ? `${row.name} 가입을 신청했습니다. 담당 운영자 승인 후 이용할 수 있습니다.` : `${row.name} 가입을 ${row.membershipStatus === 'pending' ? '취소' : '탈퇴'}했습니다.`);
      await load();
    } catch (e) {
      setError(pharmacyErrorMessage(e));
      setNetureRequired(pharmacyErrorCode(e) === 'NETURE_MEMBERSHIP_REQUIRED');
    } finally {
      setBusyKey(null);
    }
  };

  const enterCommunity = async (row: SemiFranchiseRow) => {
    if (!row.communityKey) return;
    setBusyKey(row.key); setError(null);
    try {
      const href = await requestServiceHandoff(api, { serviceKey: 'kpa-society', origin: 'https://pharmacy.neture.co.kr', returnPath: `/businesses/${encodeURIComponent(row.key)}/forum` });
      window.location.assign(href);
    } catch { setError('사업 참여자 공간으로 이동하지 못했습니다. 다시 시도해 주세요.'); setBusyKey(null); }
  };

  return (
    <PharmacyPage
      title="이용 사업 · 가입 관리"
      description="각 약국 협력사업의 가입 상태·조건을 확인하고 신청합니다. 공급 상품과 자료는 내 매장에서 사업별로 이용합니다. 이미 복사한 자료는 탈퇴 후에도 내 매장에 남습니다."
      actions={<button className={btn.secondary} onClick={load} disabled={loading}><RefreshCw size={14} className={`inline ${loading ? 'animate-spin' : ''}`} /> 새로고침</button>}
    >
      {message && <Notice>{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {error && netureRequired && (
        <p className="mb-4 text-sm" data-testid="semi-franchise-neture-required">
          <a className="underline" href={PLATFORM_ORIGIN}>Neture 가입 상태 확인 · 신청</a>
        </p>
      )}
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
                const participantStatus = r.communityKey ? '가입 승인 후 이용' : '-';
                const canApply = !st || st === 'rejected' || st === 'terminated';
                const canWithdraw = st === 'pending' || st === 'active' || st === 'suspended';
                return (
                  <tr key={r.key} className="border-b border-gray-100 last:border-0" data-testid={`semi-franchise-${r.key}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}{st === 'active' && <div className="mt-2 flex flex-wrap gap-3 text-xs font-normal text-emerald-700">
                      <Link to={`/store/pharmacy/supply?source=${encodeURIComponent(`sf:${r.key}`)}`}>공급 상품</Link>
                      <Link to={`/store/pharmacy/contents?business=${encodeURIComponent(r.key)}`}>자료 가져오기</Link>
                      <Link to={`/store/pharmacy/orders?business=${encodeURIComponent(r.key)}`}>주문 내역</Link>
                    </div>}{r.registrationConditions && <p className="text-xs font-normal whitespace-pre-wrap">{r.registrationConditions}</p>}</td>
                    <td className="px-4 py-3">
                      {st ? <StatusBadge status={st} /> : <span className="text-gray-400">미가입</span>}
                      {r.reason && <p className="mt-1 text-xs text-gray-500">사유: {r.reason}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.appliedAt ? `신청 ${formatDate(r.appliedAt)}` : '-'}
                      {r.decidedAt ? ` · 처리 ${formatDate(r.decidedAt)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {r.communityKey && st === 'active' ? <button className="text-blue-700" disabled={busyKey === r.key} onClick={() => enterCommunity(r)}>참여자 공간</button> : participantStatus}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canApply && (
                        <button className={btn.primary} disabled={busyKey === r.key} onClick={() => act(r, 'apply')}>
                          {st ? '다시 가입 신청' : '가입 신청'}
                        </button>
                      )}
                      {canWithdraw && (
                        <button className={btn.danger} disabled={busyKey === r.key} onClick={() => act(r, 'withdraw')}>
                          {st === 'pending' ? '신청 취소' : '탈퇴'}
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
