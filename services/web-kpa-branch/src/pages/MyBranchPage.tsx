/**
 * MyBranchPage — 내 분회 + 전입·전출 이력
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §3
 *
 * 4축 분리를 화면에서도 유지한다:
 *   서비스 접근(가입 상태) / 서비스 역할(roles) / 분회 소속(branch_memberships) 을 각각 표시한다.
 * 이력은 삭제되지 않으므로 같은 분회 재전입도 별도 행으로 남는다.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMyAccess,
  getMyBranchHistory,
  listBranches,
  type BranchAccess,
  type BranchMembership,
  type BranchSummary,
} from '../lib/api/branch';
import { ROLE_LABELS } from '../config/service';
import { useAuth } from '../contexts/AuthContext';

export default function MyBranchPage() {
  const { isAuthenticated, isLoading } = useAuth();
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
