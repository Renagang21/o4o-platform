/**
 * ManualsPage (약국 경영자) — 상품 설명서 (조회 전용)
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 E)
 *
 * canonical = shared_product_descriptions (description_type='STORE', status='canonical').
 * **이 화면에는 저작·번역 경로가 없다** — 이미 만들어진 canonical 설명서를 매장이 소비할 뿐이다.
 * 대상은 매장이 취급 등록한 O4O 제품(organization_product_listings)이며,
 * master 가 없는 매장 자체 상품은 canonical 설명서 대상이 아니라 목록에 넣지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchManuals, type ManualListItem } from '../../lib/api/pharmacyHubStoreManual';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Bahasa',
};

export default function StoreOwnerManualsPage() {
  const [items, setItems] = useState<ManualListItem[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((keyword: string) => {
    setLoading(true);
    fetchManuals({ page: 1, limit: 100, search: keyword || undefined })
      .then((p) => {
        setConnection(p.storeConnection);
        setItems(p.items);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '설명서 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">상품 설명서</h1>
        <p className="mt-1 text-sm text-gray-500">
          매장 경영활용 제품의 설명서를 언어별로 확인합니다. 설명서는 O4O 공용 자산이라 매장에서 수정하지
          않습니다.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' ? (
        <StoreConnectionNotice connection={connection} subject="상품 설명서" />
      ) : (
        <>
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load(search.trim());
            }}
          >
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제품명 · 브랜드 검색"
              aria-label="제품 검색"
              className="w-full max-w-xs rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              검색
            </button>
          </form>

          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중…</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-600">표시할 제품이 없습니다.</p>
              <p className="mt-2 text-sm text-gray-400">
                <Link to="/store-owner/handled-products" className="text-blue-600 hover:underline">
                  매장 경영활용 제품
                </Link>
                에서 제품을 먼저 등록하면 설명서를 확인할 수 있습니다.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {items.map((item) => (
                <li key={item.listingId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      {item.brandName && <span>{item.brandName}</span>}
                      {item.hasManual ? (
                        item.languages.map((l) => (
                          <span key={l} className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                            {LOCALE_LABELS[l] ?? l}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">설명서 없음</span>
                      )}
                    </p>
                  </div>
                  <Link
                    to={`/store-owner/manuals/${item.listingId}`}
                    className="flex-shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    보기
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
