/**
 * PlatformAccountsPage — /admin/platform/accounts
 *
 * WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1
 *
 * 기존 backend `/api/v1/admin/platform-accounts` 재사용. 관리자 계정 목록 + 비밀번호 재설정 + 활성 토글.
 * 위험 동작은 confirm. 서버측 보호(SELF_LOCK / LAST_SUPER_ADMIN / SUPER_ADMIN_ONLY) 메시지는 그대로 표시.
 */

import { useState, useEffect, useCallback } from 'react';
import { KeyRound, UserX, UserCheck, X } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { platformAdminApi, type PlatformAccount } from '../../../lib/api/platform';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

const ROLE_LABEL: Record<string, string> = {
  'platform:super_admin': '슈퍼관리자',
  'platform:admin': '플랫폼관리자',
  'neture:admin': 'Neture 관리자',
  'neture:operator': 'Neture 운영자',
};

export default function PlatformAccountsPage() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pwTarget, setPwTarget] = useState<PlatformAccount | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await platformAdminApi.getAccounts());
    } catch (err: any) {
      setError(err?.message || '계정 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (acc: PlatformAccount) => {
    const next = !acc.isActive;
    if (!window.confirm(`"${acc.name}" 계정을 ${next ? '활성화' : '비활성화'}하시겠습니까?`)) return;
    setBusyId(acc.id);
    try {
      await platformAdminApi.setAccountStatus(acc.id, next);
      toast.success(next ? '계정이 활성화되었습니다.' : '계정이 비활성화되었습니다.');
      await load();
    } catch (err: any) {
      toast.error(err?.message || '상태 변경에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!pwTarget) return;
    if (pwValue.length < 8) { toast.error('비밀번호는 최소 8자 이상이어야 합니다.'); return; }
    setPwSaving(true);
    try {
      await platformAdminApi.resetPassword(pwTarget.id, pwValue);
      toast.success('비밀번호가 재설정되었습니다.');
      setPwTarget(null);
      setPwValue('');
    } catch (err: any) {
      toast.error(err?.message || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">플랫폼 계정 관리</h1>
      <p className="text-sm text-slate-500 mb-6">
        전체 관리자 계정(플랫폼/Neture)을 조회하고 비밀번호 재설정 · 활성/비활성을 관리합니다.
        본인 계정·마지막 슈퍼관리자 비활성화는 서버에서 차단됩니다.
      </p>

      {error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>
      ) : loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">관리자 계정이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-semibold">이름 / 이메일</th>
                <th className="text-left px-4 py-3 font-semibold">역할</th>
                <th className="text-left px-4 py-3 font-semibold">상태</th>
                <th className="text-left px-4 py-3 font-semibold">최근 로그인</th>
                <th className="text-right px-4 py-3 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{a.name}</div>
                    <div className="text-xs text-slate-400">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.roles.map((r) => (
                        <span key={r} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          {ROLE_LABEL[r] || r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {a.isActive
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">활성</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">비활성</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(a.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setPwTarget(a); setPwValue(''); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> 비밀번호
                      </button>
                      <button
                        disabled={busyId === a.id}
                        onClick={() => handleToggle(a)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-50 ${
                          a.isActive
                            ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {a.isActive ? <><UserX className="w-3.5 h-3.5" /> 비활성</> : <><UserCheck className="w-3.5 h-3.5" /> 활성</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 비밀번호 재설정 modal */}
      {pwTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-800">비밀번호 재설정</h2>
              <button onClick={() => setPwTarget(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              <strong>{pwTarget.name}</strong> ({pwTarget.email}) 계정의 새 비밀번호를 설정합니다. 기존 비밀번호는 조회되지 않습니다.
            </p>
            <input
              type="password"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPwTarget(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50">취소</button>
              <button onClick={handleResetPassword} disabled={pwSaving} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50">
                {pwSaving ? '처리 중...' : '재설정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
