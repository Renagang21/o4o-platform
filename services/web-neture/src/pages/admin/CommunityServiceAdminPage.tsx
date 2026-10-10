/**
 * CommunityServiceAdminPage — 커뮤니티 서비스 관리 (community:admin)
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * Admin(admin.neture.co.kr)은 서비스 Admin(`community:admin`)과 Operator(`community:operator`)를 지정한다. 그 다음 업무는 이 화면이다:
 *   - 커뮤니티 개설 신청 심사 (승인 · 거절)
 *   - 개별 커뮤니티 운영자 지정·해제 — 그 커뮤니티의 승인된(active) 회원 중에서.
 *     서비스 전역 역할이 아니라 `community_memberships.role` 이다. 마지막 유효 Admin은 해제되지 않는다.
 * 화면 guard 는 `SubdomainOperatorRoute serviceKey="community" level="admin"` 이고 실제 경계는 backend 다.
 */
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
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

function CreationRequestsPanel() {
  const [rows, setRows] = useState<CommunityCreationRequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const processing = useRef(false);
  const beginList = useLatestRequest('creation');
  const beginAction = useLatestRequest('creation');

  const load = useCallback(() => {
    const current = beginList();
    setRows(null);
    setError(null);
    listCreationRequests()
      .then(list => { if (current()) setRows(list); })
      .catch(e => { if (current()) setError(communityAdminErrorMessage(e, '개설 신청 목록을 불러오지 못했습니다.')); });
  }, [beginList]);
  useEffect(load, [load]);

  const approve = async (r: CommunityCreationRequestRow) => {
    if (processing.current) return;
    processing.current = true;
    const current = beginAction();
    setBusyId(r.id);
    setNotice(null);
    setError(null);
    try {
      const result = await approveCreationRequest(r.id);
      if (!current()) return;
      setNotice(
        result?.outcome === 'slug_conflict'
          ? `주소(${r.desiredSlug})가 이미 사용 중이라 신청자에게 재신청을 요청했습니다.`
          : `「${r.name}」 커뮤니티를 개설했습니다.`,
      );
      load();
    } catch (e) {
      if (current()) setError(communityAdminErrorMessage(e, '개설 승인에 실패했습니다.'));
    } finally {
      processing.current = false;
      if (current()) setBusyId(null);
    }
  };

  const reject = async (r: CommunityCreationRequestRow) => {
    if (processing.current) return;
    const reason = window.prompt('거절 사유를 입력하세요.');
    if (reason === null) return;
    if (!reason.trim()) {
      setError('거절 사유가 필요합니다.');
      return;
    }
    if (processing.current) return;
    processing.current = true;
    const current = beginAction();
    setBusyId(r.id);
    setNotice(null);
    setError(null);
    try {
      await rejectCreationRequest(r.id, reason.trim());
      if (!current()) return;
      setNotice('개설 신청을 거절했습니다.');
      load();
    } catch (e) {
      if (current()) setError(communityAdminErrorMessage(e, '개설 거절에 실패했습니다.'));
    } finally {
      processing.current = false;
      if (current()) setBusyId(null);
    }
  };

  return (
    <section className="mt-6 text-sm">
      {notice && <p role="status" className="mb-3 text-green-700">{notice}</p>}
      {error && <div><p role="alert" className="mb-3 text-red-600">{error}</p><button type="button" className="min-h-11 rounded border px-3 py-2" disabled={busyId !== null} onClick={load}>다시 조회</button></div>}
      {rows === null && !error ? (
        <p className="text-slate-500">불러오는 중입니다…</p>
      ) : rows && rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">이름</th>
                <th className="py-2">주소</th>
                <th className="py-2">신청일</th>
                <th className="py-2 text-right">처리</th>
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
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => approve(r)}
                      className="rounded bg-slate-900 px-3 py-1 text-xs text-white disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => reject(r)}
                      className="ml-2 rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 disabled:opacity-50"
                    >
                      거절
                    </button>
                  </td>
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

function CommunityOperatorsPanel() {
  const [communities, setCommunities] = useState<CommunityAdminRow[] | null>(null);
  const [communityId, setCommunityId] = useState('');
  const [members, setMembers] = useState<CommunityMemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const processing = useRef(false);
  const beginCommunities = useLatestRequest('communities');
  const beginMembers = useLatestRequest(communityId);
  const beginAction = useLatestRequest(communityId);

  const loadCommunities = useCallback(() => {
    const current = beginCommunities();
    listAdminCommunities()
      .then(list => { if (current()) setCommunities(list); })
      .catch(e => { if (current()) setError(communityAdminErrorMessage(e, '커뮤니티 목록을 불러오지 못했습니다.')); });
  }, [beginCommunities]);
  useEffect(loadCommunities, [loadCommunities]);

  const loadMembers = useCallback(() => {
    const current = beginMembers();
    setMembers(null);
    if (!communityId) return;
    setError(null);
    listCommunityMembers(communityId)
      .then(list => { if (current()) setMembers(list); })
      .catch(e => { if (current()) setError(communityAdminErrorMessage(e, '커뮤니티 회원을 불러오지 못했습니다.')); });
  }, [communityId, beginMembers]);
  useEffect(loadMembers, [loadMembers]);

  const toggle = async (m: CommunityMemberRow, next: CommunityMemberRow['role']) => {
    if (processing.current) return;
    if (next !== 'member' && !m.designationEligibility?.eligible) {
      setError(m.designationEligibility?.message || '지정 자격을 확인할 수 없습니다. 커뮤니티를 다시 선택해 주세요.');
      return;
    }
    const reason = window.prompt('역할 변경 사유를 입력하세요. 개인정보는 입력하지 마세요.');
    if (reason === null) return;
    if (!reason.trim()) { setError('역할 변경 사유를 입력하세요.'); return; }
    processing.current = true;
    const current = beginAction();
    setBusyId(m.membershipId);
    setNotice(null);
    setError(null);
    try {
      await setCommunityMemberRole(communityId, m.membershipId, next, reason.trim());
      if (!current()) return;
      const who = m.name ?? m.email ?? '회원';
      setNotice(next !== 'member' ? `${who} 님을 커뮤니티 운영자로 지정했습니다.` : `${who} 님의 운영자 지정을 해제했습니다.`);
      loadMembers();
      loadCommunities();
    } catch (e) {
      if (current()) setError(communityAdminErrorMessage(e, next === 'member' ? '운영자 해제에 실패했습니다.' : '운영자 지정에 실패했습니다.'));
    } finally {
      processing.current = false;
      if (current()) setBusyId(null);
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
        disabled={busyId !== null}
        onChange={(e) => { setMembers(null); setNotice(null); setError(null); setCommunityId(e.target.value); }}
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
        마지막 유효 Admin은 해제하거나 Operator로 내릴 수 없습니다.
      </p>
      {notice && <p role="status" className="mt-3 text-green-700">{notice}</p>}
      {error && <div><p role="alert" className="mt-3 text-red-600">{error}</p><button type="button" className="min-h-11 rounded border px-3 py-2" disabled={busyId !== null} onClick={() => { setError(null); loadCommunities(); loadMembers(); }}>다시 조회</button></div>}
      {!communityId ? null : members === null && !error ? (
        <p className="mt-4 text-slate-500">불러오는 중입니다…</p>
      ) : members && members.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">이름</th>
                <th className="py-2">이메일</th>
                <th className="py-2">서비스 이용</th>
                <th className="py-2">역할</th>
                <th className="py-2 text-right">처리</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isOperator = m.role !== 'member';
                const canPromote = m.designationEligibility?.eligible === true;
                return (
                  <tr key={m.membershipId} className="border-b border-slate-100">
                    <td className="py-2 text-slate-800">{m.name ?? '-'}</td>
                    <td className="py-2 text-slate-600">{m.email ?? '-'}</td>
                    <td className="py-2 text-slate-600">
                      {m.serviceMembershipStatus ? SERVICE_STATUS_LABEL[m.serviceMembershipStatus] ?? m.serviceMembershipStatus : '미가입'}
                      {m.membershipStatus === 'suspended' && <span className="block text-red-600">개별 가입 정지</span>}
                    </td>
                    <td className="py-2 text-slate-800">
                      {m.role === 'admin' ? 'Admin' : isOperator ? 'Operator' : '회원'}
                      {!canPromote && <p className="mt-1 max-w-xs text-xs text-amber-800">
                        {m.designationEligibility?.message || '지정 자격을 확인할 수 없습니다. 커뮤니티를 다시 선택해 주세요.'}
                      </p>}
                    </td>
                    <td className="py-2 text-right">
                      <select aria-label={`${m.name ?? '회원'} 역할`} value={m.role}
                        disabled={busyId !== null}
                        onChange={(e) => toggle(m, e.target.value as CommunityMemberRow['role'])}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">
                        <option value="member">회원</option>
                        <option value="operator" disabled={!canPromote}>Operator</option>
                        <option value="admin" disabled={!canPromote}>Admin</option>
                      </select>
                    </td>
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

export default function CommunityServiceAdminPage({ operatorOnly = false }: { operatorOnly?: boolean }) {
  const [tab, setTab] = useState<Tab>(operatorOnly ? 'requests' : 'operators');
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-900">커뮤니티 서비스 관리</h1>
      <p className="mt-1 text-xs text-slate-500">
        {operatorOnly
          ? '커뮤니티 개설 신청을 심사합니다.'
          : '커뮤니티 개설 신청을 심사하고 개별 커뮤니티 운영자를 지정합니다.'}
      </p>
      <Link to="/mypage/communities" className="mt-4 inline-block text-sm text-blue-700 underline">
        커뮤니티 가입 신청·회원 관리
      </Link>
      <div className="mt-6 flex gap-4 border-b border-slate-200 text-sm">
        {(
          [
            ['operators', '커뮤니티 운영자 지정'],
            ['requests', '개설 신청 심사'],
          ] as const
        ).filter(([key]) => !operatorOnly || key === 'requests').map(([key, label]) => (
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
      {!operatorOnly && tab === 'operators' ? <CommunityOperatorsPanel /> : <CreationRequestsPanel />}
    </div>
  );
}
