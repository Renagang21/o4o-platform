import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { coreApiClient } from "../../api/client";
import { useUnifiedStore } from "../../contexts/StoreContext";
const BASE = "/neture/pharmacy/staff-support";
type Product = {
  id: string;
  kind: "local" | "listing";
  name: string;
  location: string;
  publicKey?: string | null;
};
type Guide = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  businessName: string;
};
export default function StoreStaffSupportPage() {
  const { organizationId, stores } = useUnifiedStore();
  if (!organizationId) return <p>먼저 내 매장을 선택해 주세요.</p>;
  const owner = stores.some(
    (s) => s.organizationId === organizationId && s.memberRole === "owner",
  );
  return <StaffSupportBody key={organizationId} owner={owner} />;
}
function StaffSupportBody({ owner }: Readonly<{ owner: boolean }>) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(false);
  const [guideError, setGuideError] = useState(false);
  const [productError, setProductError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    setGuideError(false);
    coreApiClient
      .get<{ data: Guide[] }>(`${BASE}/guides`)
      .then((r) => {
        if (alive) setGuides(r.data);
      })
      .catch(() => {
        if (alive) setGuideError(true);
      });
    return () => {
      alive = false;
    };
  }, [tick]);
  useEffect(() => {
    let alive = true;
    setProducts([]);
    setProductError(false);
    if (!query) return;
    setLoading(true);
    coreApiClient
      .get<{ data: Product[] }>(`${BASE}/products`, { q: query })
      .then((r) => {
        if (alive) setProducts(r.data);
      })
      .catch(() => {
        if (alive) setProductError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [query, tick]);
  const write = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage(
        "저장하지 못했습니다. 이용 자격과 연결 상태를 확인하고 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveLocation = (product: Product, location: string) =>
    write(async () => {
      await coreApiClient.put(`${BASE}/location`, {
        kind: product.kind,
        id: product.id,
        location,
      });
      setTick((n) => n + 1);
    }, "위치를 저장했습니다.");
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold">직원 현장 지원</h1>
        <p className="mt-2">
          상품 위치와 게시된 제품 자료를 안내합니다. 증상·의약품 선택·복약
          상담은 약사에게 연결해 주세요.
        </p>
      </header>
      <section
        className="rounded-xl border bg-white p-4"
        aria-label="상품 위치 찾기"
      >
        <h2 className="font-semibold">상품 위치 찾기</h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
            setTick((n) => n + 1);
          }}
        >
          <input
            aria-label="상품 이름"
            maxLength={80}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 rounded border p-3"
          />
          <button
            type="submit"
            className="rounded border px-4"
            disabled={!search.trim() || loading}
          >
            찾기
          </button>
        </form>
        {loading && <output>찾는 중…</output>}
        {productError && (
          <p role="alert">상품을 불러오지 못했습니다. 다시 찾아 주세요.</p>
        )}
        {!loading && !productError && query && !products.length && (
          <p className="mt-3">일치하는 내 매장 상품이 없습니다.</p>
        )}
        <ul className="mt-3 space-y-3">
          {products.map((product) => (
            <StaffProductRow
              key={`${product.kind}:${product.id}`}
              product={product}
              owner={owner}
              busy={busy}
              save={saveLocation}
            />
          ))}
        </ul>
      </section>
      <section
        className="rounded-xl border bg-white p-4"
        aria-label="짧게 익히기"
      >
        <h2 className="font-semibold">짧게 익히기</h2>
        <p className="mt-2 text-sm">
          가입한 협력사업에서 게시한 핵심 안내입니다.
        </p>
        <QuickGuides
          guides={guides}
          error={guideError}
          retry={() => setTick((n) => n + 1)}
        />
      </section>
      <section
        className="rounded-xl border bg-white p-4"
        aria-label="고객 요구 간단 기록"
      >
        <h2 className="font-semibold">고객 요구 간단 기록</h2>
        <p className="mt-2 text-sm">
          필요할 때 한 번만 누르세요. 고객 정보나 상담 내용은 입력하지 않습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["not-found", "상품 위치를 못 찾음"],
            ["not-carried", "취급하지 않는 상품 요청"],
            ["pharmacist-help", "약사 상담으로 연결"],
          ].map(([reason, label]) => (
            <button
              type="button"
              key={reason}
              disabled={busy}
              onClick={() =>
                void write(
                  () => coreApiClient.post(`${BASE}/demands`, { reason }),
                  "기록했습니다.",
                )
              }
              className="min-h-11 rounded border px-3 py-2"
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      {message && <output>{message}</output>}
    </div>
  );
}

function StaffProductRow({
  product,
  owner,
  busy,
  save,
}: Readonly<{
  product: Product;
  owner: boolean;
  busy: boolean;
  save: (product: Product, location: string) => Promise<void>;
}>) {
  return (
    <li className="rounded border p-3">
      <strong>{product.name}</strong>
      <p>위치: {product.location || "등록된 위치 없음"}</p>
      {product.publicKey ? (
        <a
          className="inline-block py-2 text-blue-700 underline"
          target="_blank"
          rel="noreferrer"
          href={`https://pharmacy.neture.co.kr/multilingual-products/${encodeURIComponent(product.publicKey)}`}
        >
          게시된 다국어 상품 자료
        </a>
      ) : (
        <p className="py-2 text-sm text-slate-500">게시된 다국어 자료 없음</p>
      )}
      {owner && (
        <Link
          className="inline-block py-2 text-blue-700 underline"
          to={`/store/products/multilingual/${product.kind}/${product.id}`}
        >
          상품 자료 관리
        </Link>
      )}
      {owner && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const location = new FormData(event.currentTarget).get("location");
            if (typeof location === "string") void save(product, location);
          }}
        >
          <input
            name="location"
            aria-label={`${product.name} 진열 위치`}
            maxLength={100}
            defaultValue={product.location}
            className="min-w-0 rounded border p-2"
            placeholder="예: A구역 3번 진열대"
          />
          <button type="submit" className="rounded border px-3" disabled={busy}>
            위치 저장
          </button>
        </form>
      )}
    </li>
  );
}

function QuickGuides({
  guides,
  error,
  retry,
}: Readonly<{ guides: Guide[]; error: boolean; retry: () => void }>) {
  if (error)
    return (
      <div>
        <p role="alert">숙지 자료를 불러오지 못했습니다.</p>
        <button
          type="button"
          className="mt-2 rounded border p-2"
          onClick={retry}
        >
          다시 시도
        </button>
      </div>
    );
  if (!guides.length)
    return <p className="mt-3">게시된 숙지 자료가 없습니다.</p>;
  return (
    <>
      {guides.map((guide) => (
        <details key={guide.id} className="mt-3 rounded border p-3">
          <summary className="cursor-pointer font-medium">
            {guide.title}
          </summary>
          <p className="mt-2 whitespace-pre-wrap">
            {(guide.summary || guide.body || "")
              .replace(/<[^<>]*>/g, "")
              .slice(0, 600)}
          </p>
          <small>{guide.businessName}</small>
        </details>
      ))}
    </>
  );
}
