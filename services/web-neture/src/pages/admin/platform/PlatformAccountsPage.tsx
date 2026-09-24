/**
 * PlatformAccountsPage — /admin/platform/accounts
 *
 * WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1
 *
 * 기존 backend `/api/v1/admin/platform-accounts` 재사용. 관리자 계정 목록 + 활성 토글.
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   비밀번호 재설정 버튼·모달·`platformAdminApi.resetPassword` 호출을 제거했다.
 *   서버 `PATCH /admin/platform-accounts/:id/password` 가 은퇴했고, 관리자 로그인 수단은 Google 하나다.
 * 위험 동작은 confirm. 서버측 보호(SELF_LOCK / LAST_SUPER_ADMIN / SUPER_ADMIN_ONLY) 메시지는 그대로 표시.
 */

import { useState, useEffect, useCallback } from 'react';
import { UserX, UserCheck } from 'lucide-react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import { platformAdminApi, type PlatformAccount } from '../../../lib/api/platform';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

const ROLE_LABEL: Record<string, string> = {
  'platform:super_admin': '슈퍼관리자',
  'neture:admin': 'Neture 관리자',
  'neture:operator': 'Neture 운영자',
};

export default function PlatformAccountsPage() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const columns: ListColumnDef<PlatformAccount>[] = [
    {
      key: 'name',
      header: '이름 / 이메일',
      align: 'left',
      render: (_v, a) => (
        <>
          <div className="font-medium text-slate-800">{a.name}</div>
          <div className="text-xs text-slate-400">{a.email}</div>
        </>
      ),
    },
    {
      key: 'roles',
      header: '역할',
      align: 'left',
      render: (_v, a) => (
        <div className="flex flex-wrap gap-1">
          {a.roles.map((r) => (
            <span key={r} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
              {ROLE_LABEL[r] || r}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: '상태',
      align: 'left',
      render: (_v, a) => (
        a.isActive
          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">활성</span>
          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">비활성</span>
      ),
    },
    {
      key: 'lastLoginAt',
      header: '최근 로그인',
      align: 'left',
      render: (_v, a) => <span className="text-slate-500">{fmtDate(a.lastLoginAt)}</span>,
    },
    {
      key: 'actions',
      header: '관리',
      align: 'right',
      render: (_v, a) => (
        <div className="flex items-center justify-end gap-2">
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
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">플랫폼 계정 관리</h1>
      <p className="text-sm text-slate-500 mb-6">
        전체 관리자 계정(플랫폼/Neture)을 조회하고 활성/비활성을 관리합니다. 로그인 수단은 Google 계정 하나입니다.
        본인 계정·마지막 슈퍼관리자 비활성화는 서버에서 차단됩니다.
      </p>

      {error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>
      ) : loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">관리자 계정이 없습니다.</div>
      ) : (
        <DataTable<PlatformAccount>
          columns={columns}
          data={accounts}
          rowKey={(r) => r.id}
          emptyMessage="관리자 계정이 없습니다."
        />
      )}

    </div>
  );
}
