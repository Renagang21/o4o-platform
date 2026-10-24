import { useEffect, useRef, useState } from "react";
import { coreApiClient } from "../../../api/client";
export type ConsultationProduct = {
  id: string;
  kind: "local" | "listing";
  name: string;
  location: string;
  publicKey?: string | null;
};
export function ConsultationProducts({
  query,
  onShare,
  onShow,
  busy,
}: {
  query: string;
  onShare?: (p: ConsultationProduct) => void;
  onShow: (p: ConsultationProduct) => void;
  busy: boolean;
}) {
  const [items, setItems] = useState<ConsultationProduct[]>([]),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false),
    [retry, setRetry] = useState(0);
  const version = useRef(0);
  useEffect(() => {
    const request = ++version.current;
    let alive = true;
    setItems([]);
    setError(false);
    setLoading(!!query);
    if (query)
      coreApiClient
        .get<{ success: boolean; data: ConsultationProduct[] }>(
          "/neture/pharmacy/staff-support/products",
          { q: query },
        )
        .then((r) => {
          if (!r.success || !Array.isArray(r.data))
            throw new Error("Invalid products");
          if (alive && request === version.current) setItems(r.data);
        })
        .catch(() => {
          if (alive && request === version.current) setError(true);
        })
        .finally(() => {
          if (alive && request === version.current) setLoading(false);
        });
    return () => {
      alive = false;
    };
  }, [query, retry]);
  return (
    <div aria-live="polite" className="space-y-3">
      {loading && <p>상품을 찾고 있습니다…</p>}
      {error && (
        <div role="alert">
          <p>상품을 불러오지 못했습니다. 검색어를 유지했습니다.</p>
          <button
            className="min-h-12 rounded border px-4"
            onClick={() => setRetry((n) => n + 1)}
          >
            상품 다시 찾기
          </button>
        </div>
      )}
      {!loading && !error && query && !items.length && (
        <p>일치하는 내 매장 상품이 없습니다.</p>
      )}
      {items.map((p) => (
        <article
          key={`${p.kind}:${p.id}`}
          className="space-y-2 rounded-lg border p-4"
        >
          <h3 className="text-lg font-semibold">{p.name}</h3>
          <p>위치: {p.location || "등록된 위치 없음"}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="min-h-12 rounded border px-4"
              onClick={() => onShow(p)}
            >
              이 화면에서 크게 보기
            </button>
            {onShare && (
              <button
                className="min-h-12 rounded border px-4 disabled:opacity-50"
                disabled={busy}
                onClick={() => onShare(p)}
              >
                고객 화면에 위치 전달
              </button>
            )}
            {p.publicKey ? (
              <a
                className="inline-flex min-h-12 items-center rounded border px-4"
                target="_blank"
                rel="noreferrer"
                href={`https://pharmacy.neture.co.kr/multilingual-products/${encodeURIComponent(p.publicKey)}`}
              >
                제품 설명 ↗
              </a>
            ) : (
              <span className="text-sm text-slate-500">
                게시된 제품 설명 없음
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
