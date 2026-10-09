/**
 * CommunityServiceAdminPage — 커뮤니티 서비스 관리 (community:admin / community:operator)
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * Admin(admin.neture.co.kr)은 서비스 admin/operator를 지정한다. 그 다음 업무는 이 화면이다:
 *   - 커뮤니티 개설 신청 심사 (승인 · 거절)
 *   - 개별 커뮤니티 운영자 지정·해제 — 그 커뮤니티의 승인된(active) 회원 중에서.
 *     서비스 전역 역할이 아니라 `community_memberships.role` 이다. 마지막 운영자는 해제되지 않는다.
 * 화면 guard 는 `SubdomainOperatorRoute serviceKey="community" level="operator"` 이고 실제 경계는 backend 다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subdomainOperatorRoles } from '../../lib/role-constants';
import {
  approveCreationRequest,
  communityAdminErrorMessage,
  listAdminCommunities,
  listCommunityMembers,
  listCreationRequests,
  rejectCreationRequest,
  setCommunityMemberRole,
  type CommunityAdminRow,
  type CommunityCreationRequestRow,
  type CommunityMemberRow,
} from '../../lib/api/communityServiceAdmin';

type Tab = 'operators' | 'requests';

const SERVICE_STATUS_LABEL: Record<string, string> = {
  active: '이용 중',
  pending: '신청 중',
  suspended: '이용 정지',
  rejected: '반려',
  withdrawn: '탈퇴',
};

function CreationRequestsPanel({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<CommunityCreationRequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    listCreationRequests()
      .then(setRows)
      .catch((e) => setError(communityAdminErrorMessage(e, '개설 신청 목록을 불러오지 못했습니다.')));
  }, []);
  useEffect(load, [load]);

  const approve = async (r: CommunityCreationRequestRow) => {
    setBusyId(r.id);
    setNotice(null);
    try {
      const result = await approveCreationRequest(r.id);
      setNotice(
        result?.outcome === 'slug_conflict'
          ? `주소(${r.desiredSlug})가 이미 사용 중이라 신청자에게 재신청을 요청했습니다.`
          : `「${r.name}」 커뮤니티를 개설했습니다.`,
      );
      load();
    } catch (e) {
      setError(communityAdminErrorMessage(e, '개설 승인에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r: CommunityCreationRequestRow) => {
    const reason = window.prompt('거절 사유를 입력하세요.');
    if (reason === null) return;
    if (!reason.trim()) {
      setError('거절 사유가 필요합니다.');
      return;
    }
    setBusyId(r.id);
    setNotice(null);
    try {
      await rejectCreationRequest(r.id, reason.trim());
      setNotice('개설 신청을 거절했습니다.');
      load();
    } catch (e) {
      setError(communityAdminErrorMessage(e, '개설 거절에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-6 text-sm">
      {notice && <p className="mb-3 text-green-700">{notice}</p>}
      {error && <p className="mb-3 text-red-600">{error}</p>}
      {rows === null && !error ? (
        <p className="text-slate-500">불러오는 중입니다…</p>
      ) : rows && rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">이름</th>
                <th className="py-2">주소</th>
                <th className="py-2">신청일</th>
                {canManage && <th className="py-2 text-right">처리</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-800">
                    {r.name}
                    {r.description && <div className="text-xs text-slate-500">{r.description}</div>}
                  </td>
                  <td className="py-2 text-slate-600">{r.desiredSlug}</td>
                  <td className="py-2 text-slate-600">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                  {canManage && <td className="py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => approve(r)}
                      className="rounded bg-slate-900 px-3 py-1 text-xs text-white disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => reject(r)}
                      className="ml-2 rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 disabled:opacity-50"
                    >
                      거절
                    </button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-500">심사 대기 중인 개설 신청이 없습니다.</p>
      )}
    </section>
  );
}

function CommunityOperatorsPanel({ canManage }: { canManage: boolean }) {
  const [communities, setCommunities] = useState<CommunityAdminRow[] | null>(null);
  const [communityId, setCommunityId] = useState('');
  const [members, setMembers] = useState<CommunityMemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCommunities = useCallback(() => {
    listAdminCommunities()
      .then(setCommunities)
      .catch((e) => setError(communityAdminErrorMessage(e, '커뮤니티 목록을 불러오지 못했습니다.')));
  }, []);
  useEffect(loadCommunities, [loadCommunities]);

  const loadMembers = useCallback(() => {
    setMembers(null);
    if (!communityId) return;
    setError(null);
    listCommunityMembers(communityId)
      .then(setMembers)
      .catch((e) => setError(communityAdminErrorMessage(e, '커뮤니티 회원을 불러오지 못했습니다.')));
  }, [communityId]);
  useEffect(loadMembers, [loadMembers]);

  const toggle = async (m: CommunityMemberRow) => {
    const next = m.role === 'operator' ? 'member' : 'operator';
    setBusyId(m.membershipId);
    setNotice(null);
    setError(null);
    try {
      await setCommunityMemberRole(communityId, m.membershipId, next);
      const who = m.name ?? m.email ?? '회원';
      setNotice(next === 'operator' ? `${who} 님을 커뮤니티 운영자로 지정했습니다.` : `${who} 님의 운영자 지정을 해제했습니다.`);
      loadMembers();
      loadCommunities();
    } catch (e) {
      setError(communityAdminErrorMessage(e, next === 'operator' ? '운영자 지정에 실패했습니다.' : '운영자 해제에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-6 text-sm">
      <label className="block text-xs text-slate-500" htmlFor="community-select">
        커뮤니티 선택
      </label>
      <select
        id="community-select"
        value={communityId}
        onChange={(e) => setCommunityId(e.target.value)}
        className="mt-1 w-full max-w-sm rounded border border-slate-300 px-2 py-1"
      >
        <option value="">커뮤니티를 선택하세요</option>
        {(communities ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} (운영자 {c.operatorCount} · 회원 {c.memberCount})
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-400">
        운영자는 그 커뮤니티의 승인된 회원 중에서만 지정합니다. 커뮤니티 서비스 이용이 정상이 아닌 회원은 지정할 수 없고,
        마지막 운영자는 해제할 수 없습니다.
      </p>
      {notice && <p className="mt-3 text-green-700">{notice}</p>}
      {error && <p className="mt-3 text-red-600">{error}</p>}
      {!communityId ? null : members === null && !error ? (
        <p className="mt-4 text-slate-500">불러오는 중입니다…</p>
      ) : members && members.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">이름</th>
                <th className="py-2">이메일</th>
                <th className="py-2">서비스 이용</th>
                <th className="py-2">역할</th>
                {canManage && <th className="py-2 text-right">처리</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isOperator = m.role === 'operator';
                const canPromote = isOperator || m.serviceMembershipStatus === 'active';
                return (
                  <tr key={m.membershipId} className="border-b border-slate-100">
                    <td className="py-2 text-slate-800">{m.name ?? '-'}</td>
                    <td className="py-2 text-slate-600">{m.email ?? '-'}</td>
                    <td className="py-2 text-slate-600">
                      {m.serviceMembershipStatus ? SERVICE_STATUS_LABEL[m.serviceMembershipStatus] ?? m.serviceMembershipStatus : '미가입'}
                    </td>
                    <td className="py-2 text-slate-800">{isOperator ? '운영자' : '회원'}</td>
                    {canManage && <td className="py-2 text-right">
                      <button
                        type="button"
                        disabled={busyId === m.membershipId || !canPromote}
                        onClick={() => toggle(m)}
                        className={`rounded px-3 py-1 text-xs disabled:opacity-50 ${
                          isOperator ? 'border border-slate-300 text-slate-700' : 'bg-slate-900 text-white'
                        }`}
                      >
                        {isOperator ? '해제' : '운영자 지정'}
                      </button>
                    </td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-slate-500">이 커뮤니티에 승인된 회원이 없습니다.</p>
      )}
    </section>
  );
}

export default function CommunityServiceAdminPage() {
  const { user } = useAuth();
  const canManage = (user?.roles ?? []).some(role => subdomainOperatorRoles('community', 'admin').includes(role));
  const [tab, setTab] = useState<Tab>('operators');
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-900">커뮤니티 서비스 관리</h1>
      <p className="mt-1 text-xs text-slate-500">
        {canManage
          ? '개설 심사와 개별 커뮤니티 운영자 지정은 서비스 관리자가 처리합니다.'
          : '서비스 운영 현황을 조회합니다. 개설 심사와 운영자 지정은 서비스 관리자에게 요청하세요.'}
      </p>
      <div className="mt-6 flex gap-4 border-b border-slate-200 text-sm">
        {(
          [
            ['operators', canManage ? '커뮤니티 운영자 지정' : '커뮤니티 운영 현황'],
            ['requests', canManage ? '개설 신청 심사' : '개설 신청 현황'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-1 pb-2 ${
              tab === key ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'operators' ? <CommunityOperatorsPanel canManage={canManage} /> : <CreationRequestsPanel canManage={canManage} />}
    </div>
  );
}
