/**
 * DirectoryPage — 분회 찾기 (공용 도메인 진입점)
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §2
 *
 * kpa_organizations(type='group')를 그대로 registry 로 쓴다. 모든 분회는 동급 tenant 이며
 * 지부(parent) 관계는 표시에도 사용하지 않는다 (권한과 무관함을 화면에서도 드러낸다).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBranches, type BranchSummary } from '../lib/api/branch';
import { BRAND } from '../config/service';

export default function DirectoryPage() {
  const [items, setItems] = useState<BranchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    listBranches()
      .then((r) => alive && setItems(r))
      .catch(() => alive && setError('분회 목록을 불러오지 못했습니다.'));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const key = q.trim();
    return key ? items.filter((b) => b.name.includes(key) || (b.slug ?? '').includes(key)) : items;
  }, [items, q]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{BRAND.nameKo}</h1>
        <p className="mt-1 text-gray-600">{BRAND.tagline}</p>
        <div className="mt-4 flex gap-3 text-sm">
          <Link to="/login" className="text-primary-700 hover:underline">로그인</Link>
          <Link to="/me" className="text-primary-700 hover:underline">내 분회</Link>
        </div>
      </header>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="분회 이름으로 검색"
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && items === null && <p className="text-sm text-gray-500">불러오는 중입니다…</p>}

      <ul className="grid gap-2 sm:grid-cols-2">
        {filtered.map((b) => (
          <li key={b.id}>
            {b.slug ? (
              <Link
                to={`/${b.slug}`}
                className="block rounded border border-gray-200 px-4 py-3 text-sm hover:border-primary-500 hover:bg-primary-50"
              >
                <span className="font-medium text-gray-900">{b.name}</span>
                <span className="ml-2 text-xs text-gray-400">/{b.slug}</span>
              </Link>
            ) : (
              <span className="block rounded border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
                {b.name} (주소 미배정)
              </span>
            )}
          </li>
        ))}
      </ul>
      {items !== null && filtered.length === 0 && !error && (
        <p className="mt-4 text-sm text-gray-500">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}
