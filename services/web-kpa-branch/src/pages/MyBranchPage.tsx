/**
 * MyBranchPage — 내 분회 + 전입·전출 이력
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §3
 *
 * 4축 분리를 화면에서도 유지한다:
 *   서비스 접근(가입 상태) / 서비스 역할(roles) / 분회 소속(branch_memberships) 을 각각 표시한다.
 * 이력은 삭제되지 않으므로 같은 분회 재전입도 별도 행으로 남는다.
 *
 * 분회 개설 신청(WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1): 신청과 내 신청 결과 확인도 여기서 한다.
 * 주소 충돌·예약어로 돌아온 신청(`slug_conflict`)은 사유와 함께 이 목록에 보이고, 다른 주소로 다시 신청한다.
 */

function BranchRequestSection() {
  const [mine, setMine] = useState<BranchCreationRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    listMyBranchRequests()
      .then(setMine)
      .catch((e) => setLoadError(errorMessage(e, '내 개설 신청을 불러오지 못했습니다.')));
  }, []);

  useEffect(load, [load]);

  const slugHint = slug ? slugProblem(slug) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setSubmitError(null);
    if (!name.trim()) {
      setSubmitError('분회 이름을 입력하세요.');
      return;
    }
    const problem = slugProblem(slug);
    if (problem) {
      setSubmitError(problem);
      return;
    }
    setBusy(true);
    try {
      await submitBranchRequest({
        name: name.trim(),
        slug: normalizeSlugInput(slug),
        description: description.trim() || undefined,
      });
      setNotice('개설 신청을 접수했습니다. 분회 서비스 관리자가 심사합니다.');
      setName('');
      setSlug('');
      setDescription('');
      load();
    } catch (err) {
      setSubmitError(errorMessage(err, '개설 신청에 실패했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded border border-gray-200 p-4 text-sm">
      <h2 className="mb-2 font-semibold text-gray-900">분회 개설 신청</h2>
      <p className="text-xs text-gray-400">
        승인되면 분회 홈페이지가 열리고 신청자가 첫 분회 운영자가 됩니다. 주소는 승인 시점에 다시 확인합니다.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <label className="block">
          <span className="text-xs text-gray-500">분회 이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">희망 주소 (영문 소문자·숫자·하이픈)</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            maxLength={80}
            placeholder="예: seoul-gangnam"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          />
          {slugHint && <span className="mt-1 block text-xs text-amber-700">{slugHint}</span>}
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">설명 (선택)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        {submitError && <p className="text-red-600">{submitError}</p>}
        {notice && <p className="text-green-700">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-primary-600 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          개설 신청
        </button>
      </form>

      <h3 className="mt-5 text-xs font-semibold text-gray-700">내 신청</h3>
      {loadError && <p className="mt-2 text-red-600">{loadError}</p>}
      {mine === null && !loadError ? (
        <p className="mt-2 text-gray-500">불러오는 중입니다…</p>
      ) : mine && mine.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {mine.map((r) => (
            <li key={r.id} className="rounded border border-gray-100 p-2">
              <span className="text-gray-800">{r.name}</span>
              <span className="ml-2 text-xs text-gray-500">/{r.desired_slug}</span>
              <span className="ml-2 text-xs font-semibold text-gray-700">
                {BRANCH_REQUEST_STATUS_LABEL[r.status] ?? r.status}
              </span>
              {r.reason && <p className="mt-1 text-xs text-gray-500">{r.reason}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-gray-500">신청 이력이 없습니다.</p>
      )}
    </section>
  );
}

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  getMyAccess,
  getMyBranchHistory,
  listBranches,
  type BranchAccess,
  type BranchMembership,
  type BranchSummary,
} from '../lib/api/branch';
import { ROLE_LABELS, ROLES, satisfiesRole } from '../config/service';
import { BRANCH_REQUEST_STATUS_LABEL, normalizeSlugInput, slugProblem } from '../lib/branchRequest';
import {
  errorMessage,
  listMyBranchRequests,
  submitBranchRequest,
  type BranchCreationRequest,
} from '../lib/api/serviceAdmin';
import { useAuth } from '../contexts/AuthContext';

export default function MyBranchPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [access, setAccess] = useState<BranchAccess | null>(null);
  const [history, setHistory] = useState<BranchMembership[] | null>(null);
  const [branches, setBranches] = useState<Record<string, BranchSummary>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    Promise.all([getMyAccess(), getMyBranchHistory(), listBranches()])
      .then(([a, h, list]) => {
        if (!alive) return;
        setAccess(a);
        setHistory(h);
        setBranches(Object.fromEntries(list.map((b) => [b.id, b])));
      })
      .catch(() => alive && setError('내 분회 정보를 불러오지 못했습니다.'));
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  if (isLoading) return <p className="p-10 text-sm text-gray-500">확인 중입니다…</p>;
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-sm">
        <p className="text-gray-700">로그인이 필요합니다.</p>
        <Link to="/login" className="mt-3 inline-block text-primary-700 hover:underline">로그인하기</Link>
      </div>
    );
  }

  const current = history?.find((h) => h.status === 'active') ?? null;
  const currentBranch = current ? branches[current.organizationId] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-xl font-bold text-gray-900">내 분회</h1>
      {satisfiesRole((user?.roles as string[] | undefined) ?? [], ROLES.admin) && (
        <p className="mt-2 text-sm">
          <Link to="/service-admin" className="text-primary-700 hover:underline">
            분회 서비스 관리 (가입 승인 · 개설 신청 심사 · 분회 운영자 지정)
          </Link>
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-6 rounded border border-gray-200 p-4 text-sm">
        <h2 className="mb-2 font-semibold text-gray-900">현재 소속</h2>
        {current ? (
          <p className="text-gray-800">
            {currentBranch?.name ?? current.organizationId}
            <span className="ml-2 text-xs text-gray-500">
              {new Date(current.joinedAt).toLocaleDateString('ko-KR')} 전입
            </span>
            {currentBranch?.slug && (
              <Link to={`/${currentBranch.slug}`} className="ml-3 text-primary-700 hover:underline">
                분회 홈페이지
              </Link>
            )}
          </p>
        ) : (
          <p className="text-gray-500">등록된 분회 소속이 없습니다. 분회 운영자에게 전입 등록을 요청하세요.</p>
        )}
      </section>

      <section className="mt-4 rounded border border-gray-200 p-4 text-sm">
        <h2 className="mb-2 font-semibold text-gray-900">서비스 접근</h2>
        <p className="text-gray-700">가입 상태: {access?.membershipStatus ?? '-'}</p>
        <p className="mt-1 text-gray-700">
          역할: {access && access.roles.length > 0 ? access.roles.map((r) => ROLE_LABELS[r] ?? r).join(', ') : '없음'}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          서비스 역할과 분회 소속은 별도 축입니다. 운영자 권한이 있어도 대상 분회는 소속으로 결정됩니다.
        </p>
      </section>

      <BranchRequestSection />

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">전입·전출 이력</h2>
        {history === null && !error ? (
          <p className="text-sm text-gray-500">불러오는 중입니다…</p>
        ) : history && history.length > 0 ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">분회</th>
                <th className="py-2">전입일</th>
                <th className="py-2">전출일</th>
                <th className="py-2">사유</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{branches[h.organizationId]?.name ?? h.organizationId}</td>
                  <td className="py-2 text-gray-600">{new Date(h.joinedAt).toLocaleDateString('ko-KR')}</td>
                  <td className="py-2 text-gray-600">
                    {h.leftAt ? new Date(h.leftAt).toLocaleDateString('ko-KR') : '현재 소속'}
                  </td>
                  <td className="py-2 text-gray-500">{h.transferReason ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">이력이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
