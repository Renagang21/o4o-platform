/**
 * BranchOfficersPage — 분회 임원 명부 (공개 / 회원)
 * WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1
 *
 * 로그인하지 않으면 `public` 임원만, 로그인 회원이면 `members_only` 까지 본다.
 * 어느 쪽이든 **현직만** 나온다 — 현직 판정은 서버가 상태와 임기 날짜를 함께 보고 낸다.
 *
 * 연락처를 보여주지 않는다. 원장에 컬럼 자체가 없다.
 */
import { useEffect, useState } from 'react';
import { listPublicOfficers, listMemberOfficers, type OfficerItem } from '../lib/api/branchOfficer';
import { useAuth } from '../contexts/AuthContext';
import { describeApiError as describe } from '../lib/errors';

export default function BranchOfficersPage({ slug }: { slug: string }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<OfficerItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    setItems(null);
    /**
     * 로그인 회원은 회원 경로로 읽는다 (members_only 포함).
     * 회원 경로가 막히면(분회 미소속 등) 공개 명부로 물러난다 — 화면을 비우지 않는다.
     */
    const load = isAuthenticated
      ? listMemberOfficers(slug).catch(() => listPublicOfficers(slug))
      : listPublicOfficers(slug);
    load
      .then((rows) => alive && setItems(rows))
      .catch((e) => {
        if (!alive) return;
        setItems(null);
        setError(describe(e));
      });
    return () => {
      alive = false;
    };
  }, [slug, isAuthenticated]);

  /** 소속(위원회·TF)별로 묶는다. 소속 없는 임원이 먼저 온다 */
  const groups = new Map<string, OfficerItem[]>();
  for (const o of items ?? []) {
    const key = o.groupName ?? '';
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  const ordered = [...groups.entries()].sort((a, b) => (a[0] === '' ? -1 : b[0] === '' ? 1 : a[0].localeCompare(b[0])));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">임원 · 위원회</h1>
        <p className="mt-1 text-sm text-gray-500">현재 재임 중인 임원과 위원회 구성입니다.</p>
      </header>

      {error && <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {items === null && !error ? (
        <p className="text-sm text-gray-500">불러오는 중입니다…</p>
      ) : items && items.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          공개된 임원 명부가 없습니다.
        </p>
      ) : (
        <div className="space-y-6">
          {ordered.map(([group, rows]) => (
            <section key={group || '__main__'}>
              <h2 className="mb-2 text-sm font-semibold text-gray-800">{group || '임원'}</h2>
              <ul className="divide-y divide-gray-100 rounded border border-gray-200">
                {rows.map((o) => (
                  <li key={o.id} className="flex items-center justify-between px-4 py-3">
                    <span>
                      <span className="font-medium text-gray-900">{o.name}</span>
                      <span className="ml-2 text-sm text-gray-600">{o.position}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {o.termStart}
                      {o.termEnd ? ` ~ ${o.termEnd}` : ' ~'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
