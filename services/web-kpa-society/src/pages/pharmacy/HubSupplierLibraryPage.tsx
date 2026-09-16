/**
 * HubSupplierLibraryPage — 매장 HUB 공급자 콘텐츠 진열 (읽기 전용 · 사본 없음)
 *
 * WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 §14 (Store Hub 편입):
 *   ROLE-WORKSPACE-ARCHITECTURE §2-1 `Supplier → Store Hub` 의 UI 편입.
 *   출처 = 기존 Hub source adapter `GET /hub/contents?sourceDomain=supplier-library`
 *   (Supplier WO 에서 만든 계약 · `is_public=true` 행 · producer=supplier). serviceKey 는 **canonical**
 *   `kpa-society` 로 조회한다 — adapter 의 `storeWorkspaceEnabled` gate 가 canonical 키만 안다
 *   (선행 CHECK D10 drift 해소). 가져오기(사본) 는 이 계약에 없으므로 진열·열람만 한다.
 */

import { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';

const PAGE_LIMIT = 20;

export function HubSupplierLibraryPage() {
  const [items, setItems] = useState<HubContentItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    hubContentApi
      .list({ serviceKey: 'kpa-society', sourceDomain: 'supplier-library', page, limit: PAGE_LIMIT })
      .then((res) => {
        if (!alive) return;
        setItems(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
      })
      .catch(() => {
        if (alive) setError('공급자 콘텐츠를 불러올 수 없습니다');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <section data-testid="store-hub-supplier-library" className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 m-0 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          공급자 콘텐츠
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-0">
          공급자가 공개한 제품 설명서·자료를 열람합니다. 매장 사본은 만들지 않습니다.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}
      {!loading && !error && items.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 text-center">
          아직 공개된 공급자 콘텐츠가 없습니다
        </p>
      )}

      {items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 list-none p-0 m-0">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-900 m-0">{item.title}</p>
                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 shrink-0">
                  {item.category ?? '공급자 자료'}
                </span>
              </div>
              {item.description && <p className="text-sm text-slate-600 m-0 line-clamp-3">{item.description}</p>}
              <div className="flex items-center justify-between text-xs text-slate-500 mt-auto">
                <span>{item.creatorName ?? '공급자'}</span>
                {item.fileUrl && (
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {item.fileName ?? '열기'}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="페이지">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
          >
            다음
          </button>
        </nav>
      )}
    </section>
  );
}

export default HubSupplierLibraryPage;
