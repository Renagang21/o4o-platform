/**
 * ServiceAdminPage — 분회 서비스 관리 (kpa-branch:admin)
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * Admin(admin.neture.co.kr)은 서비스 운영자(`kpa-branch:admin`)만 지정한다.
 * 그 다음 업무 — 서비스 가입 승인·반려, 개별 분회 운영자 지정·해제 — 는 이 화면에서
 * 분회 서비스 관리자가 한다. Admin 메뉴의 "분회 서비스 가입 승인" 은 이 화면으로 옮겼다.
 *
 * 분회 개설 신청 심사도 여기서 한다: 승인하면 신청자가 첫 분회 운영자가 된다. 주소가 이미 쓰이거나
 * 서비스 화면 예약어면 backend 가 개설하지 않고 신청을 `slug_conflict` 로 돌려보낸다 — 관리자가 주소를
 * 바꾸거나 대신 분회를 만들지 않는다.
 *
 * 분회 운영자 지정은 **대상 분회에 한정**한다: 후보는 그 분회의 active 소속 회원뿐이고,
 * 서비스 가입이 active 가 아니면 지정하지 않는다. 판정은 backend 가 한다(프론트 게이트는 UX 안내).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES, satisfiesRole } from '../../config/service';
import { listBranches, type BranchSummary } from '../../lib/api/branch';
import { approveResultMessage } from '../../lib/branchRequest';
import {
  approveBranchRequest,
  approveServiceMember,
  designateBranchOperator,
  errorMessage,
  listBranchOperators,
  listBranchRequests,
  listServiceMembers,
  rejectBranchRequest,
  rejectServiceMember,
  releaseBranchOperator,
  type BranchOperatorCandidate,
  type PendingBranchRequest,
  type ServiceMemberRow,
  type ServiceMemberStatus,
} from '../../lib/api/serviceAdmin';
import LoginLink from '../../components/LoginLink';

type Tab = 'members' | 'requests' | 'operators';

const STATUS_TABS: { key: ServiceMemberStatus; label: string }[] = [
  { key: 'pending', label: '승인 대기' },
  { key: 'active', label: '승인됨' },
  { key: 'rejected', label: '반려됨' },
];

const SERVICE_STATUS_LABEL: Record<string, string> = {
  active: '승인됨',
  pending: '승인 대기',
  rejected: '반려됨',
  suspended: '정지',
  withdrawn: '탈퇴',
};

function fmtDate(v: string | null): string {
  return v ? new Date(v).toLocaleDateString('ko-KR') : '-';
}

// ── 서비스 가입 승인 ──────────────────────────────────────────────────────────

function ServiceMembersPanel() {
  const [status, setStatus] = useState<ServiceMemberStatus>('pending');
  const [rows, setRows] = useState<ServiceMemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    listServiceMembers(status)
      .then(setRows)
      .catch((e) => setError(errorMessage(e, '가입 신청 목록을 불러오지 못했습니다.')));
  }, [status]);

  useEffect(load, [load]);

  const approve = async (row: ServiceMemberRow) => {
    setBusyId(row.id);
    setNotice(null);
    try {
      await approveServiceMember(row.id);
      setNotice('서비스 가입 승인 완료 — 분회 소속은 해당 분회 운영자가 별도로 등록합니다.');
      load();
    } catch (e) {
      setError(errorMessage(e, '가입 승인에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: ServiceMemberRow) => {
    const reason = window.prompt('반려 사유를 입력하세요.');
    if (reason === null) return;
    if (!reason.trim()) {
      setError('반려 사유가 필요합니다.');
      return;
    }
    setBusyId(row.id);
    setNotice(null);
    try {
      await rejectServiceMember(row.id, reason.trim());
      setNotice('가입 신청을 반려했습니다.');
      load();
    } catch (e) {
      setError(errorMessage(e, '가입 반려에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-6">
      <div className="flex gap-2 text-sm">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.key)}
            className={`rounded border px-3 py-1 ${
              status === t.key ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {rows === null && !error ? (
        <p className="mt-4 text-sm text-gray-500">불러오는 중입니다…</p>
      ) : rows && rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">이름</th>
                <th className="py-2">이메일</th>
                <th className="py-2">신청일</th>
                {status === 'rejected' && <th className="py-2">반려 사유</th>}
                {status === 'active' && <th className="py-2">승인일</th>}
                {status === 'pending' && <th className="py-2 text-right">처리</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{r.name ?? '-'}</td>
                  <td className="py-2 text-gray-600">{r.email ?? '-'}</td>
                  <td className="py-2 text-gray-600">{fmtDate(r.appliedAt)}</td>
                  {status === 'rejected' && <td className="py-2 text-gray-500">{r.rejectionReason ?? '-'}</td>}
                  {status === 'active' && <td className="py-2 text-gray-600">{fmtDate(r.approvedAt)}</td>}
                  {status === 'pending' && (
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => approve(r)}
                        className="rounded bg-primary-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => reject(r)}
                        className="ml-2 rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
                      >
                        반려
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">해당 상태의 가입 신청이 없습니다.</p>
      )}
    </section>
  );
}

// ── 분회 개설 신청 심사 ───────────────────────────────────────────────────────

function BranchRequestsPanel() {
  const [rows, setRows] = useState<PendingBranchRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    listBranchRequests()
      .then(setRows)
      .catch((e) => setError(errorMessage(e, '개설 신청 목록을 불러오지 못했습니다.')));
  }, []);

  useEffect(load, [load]);

  const approve = async (row: PendingBranchRequest) => {
    setBusyId(row.id);
    setNotice(null);
    setError(null);
    try {
      setNotice(approveResultMessage(await approveBranchRequest(row.id)));
      load();
    } catch (e) {
      setError(errorMessage(e, '개설 승인에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: PendingBranchRequest) => {
    const reason = window.prompt('거절 사유를 입력하세요. 신청자에게 표시됩니다.');
    if (reason === null) return;
    if (!reason.trim()) {
      setError('거절 사유가 필요합니다.');
      return;
    }
    setBusyId(row.id);
    setNotice(null);
    setError(null);
    try {
      await rejectBranchRequest(row.id, reason.trim());
      setNotice('개설 신청을 거절했습니다.');
      load();
    } catch (e) {
      setError(errorMessage(e, '개설 거절에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-6 text-sm">
      <p className="text-xs text-gray-400">
        승인하면 분회가 개설되고 신청자가 첫 분회 운영자가 됩니다. 주소가 이미 쓰이거나 예약어면 개설하지 않고
        신청자에게 다른 주소로 재신청을 요청합니다(주소를 대신 바꾸지 않습니다).
      </p>
      {notice && <p className="mt-3 text-green-700">{notice}</p>}
      {error && <p className="mt-3 text-red-600">{error}</p>}
      {rows === null && !error && <p className="mt-4 text-gray-500">불러오는 중입니다…</p>}
      {rows && rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">분회 이름</th>
                <th className="py-2">희망 주소</th>
                <th className="py-2">신청자</th>
                <th className="py-2">신청일</th>
                <th className="py-2 text-right">처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 align-top">
                  <td className="py-2 text-gray-800">
                    {r.name}
                    {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
                  </td>
                  <td className="py-2 text-gray-700">
                    /{r.desired_slug}
                    {r.reserved_slug && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">예약어</span>
                    )}
                  </td>
                  <td className="py-2 text-gray-600">
                    {r.requester_name ?? '-'}
                    {r.requester_email && <p className="text-xs text-gray-400">{r.requester_email}</p>}
                  </td>
                  <td className="py-2 text-gray-600">{fmtDate(r.created_at)}</td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => approve(r)}
                      className="rounded bg-primary-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => reject(r)}
                      className="ml-2 rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
                    >
                      거절
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows?.length === 0 && <p className="mt-4 text-gray-500">심사 대기 중인 개설 신청이 없습니다.</p>}
    </section>
  );
}

// ── 분회 운영자 지정 ──────────────────────────────────────────────────────────

function BranchOperatorsPanel() {
  const [branches, setBranches] = useState<BranchSummary[] | null>(null);
  const [branchId, setBranchId] = useState('');
  const [members, setMembers] = useState<BranchOperatorCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listBranches()
      .then(setBranches)
      .catch((e) => setError(errorMessage(e, '분회 목록을 불러오지 못했습니다.')));
  }, []);

  const load = useCallback(() => {
    if (!branchId) {
      setMembers(null);
      return;
    }
    setMembers(null);
    setError(null);
    listBranchOperators(branchId)
      .then((d) => setMembers(d.members))
      .catch((e) => setError(errorMessage(e, '분회 소속 회원을 불러오지 못했습니다.')));
  }, [branchId]);

  useEffect(load, [load]);

  const toggle = async (m: BranchOperatorCandidate) => {
    setBusyId(m.userId);
    setNotice(null);
    setError(null);
    try {
      if (m.isOperator) {
        await releaseBranchOperator(branchId, m.userId);
        setNotice(`${m.name ?? m.email ?? '회원'} 님의 분회 운영자 지정을 해제했습니다.`);
      } else {
        await designateBranchOperator(branchId, m.userId);
        setNotice(`${m.name ?? m.email ?? '회원'} 님을 분회 운영자로 지정했습니다.`);
      }
      load();
    } catch (e) {
      setError(errorMessage(e, m.isOperator ? '운영자 해제에 실패했습니다.' : '운영자 지정에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-6 text-sm">
      <label className="block text-xs text-gray-500" htmlFor="branch-select">
        분회 선택
      </label>
      <select
        id="branch-select"
        value={branchId}
        onChange={(e) => setBranchId(e.target.value)}
        className="mt-1 w-full max-w-sm rounded border border-gray-300 px-2 py-1"
      >
        <option value="">분회를 선택하세요</option>
        {(branches ?? []).map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-400">
        운영자는 그 분회의 소속 회원 중에서만 지정합니다. 서비스 가입이 승인되지 않은 회원은 지정할 수 없습니다.
      </p>
      {notice && <p className="mt-3 text-green-700">{notice}</p>}
      {error && <p className="mt-3 text-red-600">{error}</p>}
      {!branchId ? null : members === null && !error ? (
        <p className="mt-4 text-gray-500">불러오는 중입니다…</p>
      ) : members && members.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">이름</th>
                <th className="py-2">이메일</th>
                <th className="py-2">서비스 가입</th>
                <th className="py-2">운영자</th>
                <th className="py-2 text-right">처리</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const canDesignate = m.isOperator || m.serviceMembershipStatus === 'active';
                return (
                  <tr key={m.userId} className="border-b border-gray-100">
                    <td className="py-2 text-gray-800">{m.name ?? '-'}</td>
                    <td className="py-2 text-gray-600">{m.email ?? '-'}</td>
                    <td className="py-2 text-gray-600">
                      {m.serviceMembershipStatus ? SERVICE_STATUS_LABEL[m.serviceMembershipStatus] ?? m.serviceMembershipStatus : '미가입'}
                    </td>
                    <td className="py-2 text-gray-800">{m.isOperator ? '운영자' : '-'}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        disabled={busyId === m.userId || !canDesignate}
                        onClick={() => toggle(m)}
                        className={`rounded px-3 py-1 text-xs disabled:opacity-50 ${
                          m.isOperator ? 'border border-gray-300 text-gray-700' : 'bg-primary-600 text-white'
                        }`}
                      >
                        {m.isOperator ? '해제' : '운영자 지정'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-gray-500">이 분회에 등록된 소속 회원이 없습니다.</p>
      )}
    </section>
  );
}

export default function ServiceAdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('members');
  const roles: string[] = (user?.roles as string[] | undefined) ?? [];

  if (isLoading) return <p className="p-10 text-sm text-gray-500">확인 중입니다…</p>;
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-sm">
        <p className="text-gray-700">로그인이 필요합니다.</p>
        <LoginLink className="mt-3 inline-block text-primary-700 hover:underline">로그인하기</LoginLink>
      </div>
    );
  }
  if (!satisfiesRole(roles, ROLES.admin)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-sm">
        <p className="text-gray-700">분회 서비스 관리자만 이용할 수 있습니다.</p>
        <Link to="/me" className="mt-3 inline-block text-primary-700 hover:underline">내 분회로</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-xl font-bold text-gray-900">분회 서비스 관리</h1>
      <p className="mt-1 text-xs text-gray-500">
        서비스 가입 승인, 분회 개설 신청 심사, 개별 분회 운영자 지정은 분회 서비스 관리자가 이 화면에서 처리합니다.
      </p>
      <div className="mt-6 flex gap-4 border-b border-gray-200 text-sm">
        {(
          [
            ['members', '서비스 가입 승인'],
            ['requests', '분회 개설 신청 심사'],
            ['operators', '분회 운영자 지정'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-1 pb-2 ${
              tab === key ? 'border-primary-600 font-semibold text-primary-700' : 'border-transparent text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'members' && <ServiceMembersPanel />}
      {tab === 'requests' && <BranchRequestsPanel />}
      {tab === 'operators' && <BranchOperatorsPanel />}
    </div>
  );
}
