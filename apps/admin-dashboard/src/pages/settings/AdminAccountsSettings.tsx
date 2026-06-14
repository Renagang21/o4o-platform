/**
 * AdminAccountsSettings — 관리자 계정 안전 유지관리 탭
 * WO-O4O-ADMIN-PLATFORM-SETTINGS-SUPER-ADMIN-ACCOUNT-MANAGEMENT-V1
 *
 * 최고/플랫폼 관리자 계정의 로그인 ID·역할·활성 상태 확인 + 비밀번호 재설정(새 값만) + 활성 토글.
 * 기존 비밀번호는 조회/표시하지 않는다. 역할 변경은 RBAC Role Assignment 화면에서 관리(본 탭은 표시만).
 * 서버측 보호: 본인 비활성/마지막 super_admin 비활성/super_admin 대상 변경 권한 — backend 가 enforce.
 */
import { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { Loader2, KeyRound, ShieldCheck, Users } from 'lucide-react';

interface AdminAccount {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

const MIN_PW = 8;
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const isSuper = (a: AdminAccount) => a.roles.includes('platform:super_admin');

export default function AdminAccountsSettings() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 비밀번호 재설정 모달
  const [pwTarget, setPwTarget] = useState<AdminAccount | null>(null);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.api.get('/admin/platform-accounts');
      if (res.data?.success) setAccounts(res.data.data ?? []);
      else setError(res.data?.error || '목록을 불러오지 못했습니다.');
    } catch (e: any) {
      setError(e?.response?.data?.error || '최고/플랫폼 관리자만 접근할 수 있습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (acct: AdminAccount) => {
    const next = !acct.isActive;
    if (!window.confirm(`${acct.email} 계정을 ${next ? '활성화' : '비활성화'} 하시겠습니까?`)) return;
    setBusyId(acct.id);
    try {
      const res = await authClient.api.patch(`/admin/platform-accounts/${acct.id}/status`, { isActive: next });
      if (res.data?.success) { toast.success(res.data.message || '상태가 변경되었습니다.'); await load(); }
      else toast.error(res.data?.error || '상태 변경에 실패했습니다.');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || '상태 변경에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  const openPwModal = (acct: AdminAccount) => { setPwTarget(acct); setPw1(''); setPw2(''); };
  const closePwModal = () => { if (!pwSaving) { setPwTarget(null); setPw1(''); setPw2(''); } };

  const submitPw = async () => {
    if (!pwTarget) return;
    if (pw1.length < MIN_PW) { toast.error(`비밀번호는 최소 ${MIN_PW}자 이상이어야 합니다.`); return; }
    if (pw1 !== pw2) { toast.error('새 비밀번호 확인이 일치하지 않습니다.'); return; }
    setPwSaving(true);
    try {
      const res = await authClient.api.patch(`/admin/platform-accounts/${pwTarget.id}/password`, { newPassword: pw1 });
      if (res.data?.success) { toast.success(res.data.message || '비밀번호가 재설정되었습니다.'); setPwTarget(null); setPw1(''); setPw2(''); }
      else toast.error(res.data?.error || '비밀번호 재설정에 실패했습니다.');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-o4o-text-primary">관리자 계정</h2>
      </div>
      <p className="text-sm text-o4o-text-secondary">
        최고/플랫폼 관리자 계정의 로그인 ID·역할·활성 상태를 확인하고, 비밀번호 재설정과 활성 여부를 관리합니다.
        기존 비밀번호는 조회·표시되지 않습니다. <span className="font-medium">역할 변경은 좌측 메뉴의 RBAC Role Assignment에서 관리합니다.</span>
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">표시할 관리자 계정이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">이름 / 이메일</th>
                <th className="px-4 py-3 text-left font-medium">역할</th>
                <th className="px-4 py-3 text-left font-medium">상태</th>
                <th className="px-4 py-3 text-left font-medium">생성일</th>
                <th className="px-4 py-3 text-left font-medium">마지막 로그인</th>
                <th className="px-4 py-3 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-o4o-text-primary">
                      {isSuper(a) && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
                      {a.name}
                    </div>
                    <div className="text-xs text-slate-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.roles.map((r) => (
                        <span key={r} className={`inline-block px-2 py-0.5 text-xs rounded ${r === 'platform:super_admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {a.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmt(a.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(a.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openPwModal(a)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> 비밀번호 재설정
                      </button>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => toggleStatus(a)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 ${a.isActive ? 'text-rose-700 border border-rose-200 hover:bg-rose-50' : 'text-emerald-700 border border-emerald-200 hover:bg-emerald-50'}`}
                      >
                        {busyId === a.id ? '처리 중…' : a.isActive ? '비활성화' : '활성화'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 비밀번호 재설정 모달 */}
      {pwTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closePwModal}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-o4o-text-primary">비밀번호 재설정</h3>
            <p className="mt-1 text-sm text-slate-500">{pwTarget.email} 계정의 새 비밀번호를 설정합니다. 기존 비밀번호는 표시되지 않습니다.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">새 비밀번호</label>
                <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`최소 ${MIN_PW}자`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">새 비밀번호 확인</label>
                <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="다시 입력" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closePwModal} disabled={pwSaving}
                className="px-3 py-2 text-sm font-medium text-slate-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">취소</button>
              <button type="button" onClick={submitPw} disabled={pwSaving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />} 새 비밀번호 설정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
