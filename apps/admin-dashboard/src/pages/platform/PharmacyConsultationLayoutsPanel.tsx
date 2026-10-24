import { useEffect, useRef, useState } from "react";
import { authClient } from "@o4o/auth-client";
type Layout = "standard" | "large";
type Pharmacy = { organizationId: string; name: string; operatingType: Layout };
const base = "/neture/admin/pharmacy-consultation-layouts";
export default function PharmacyConsultationLayoutsPanel() {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const [items, setItems] = useState<Pharmacy[]>([]),
    [total, setTotal] = useState(0),
    [values, setValues] = useState<Record<string, Layout>>({});
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const generation = useRef(0),
    alive = useRef(false),
    lock = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const version = ++generation.current;
    setLoading(true);
    setError("");
    setItems([]);
    setNotice("");
    authClient.api
      .get(`${base}?${new URLSearchParams({ q: query, page: String(page) })}`)
      .then((r) => {
        const data = r.data.data;
        if (
          !r.data.success ||
          !Array.isArray(data?.items) ||
          !Number.isSafeInteger(data.total) ||
          data.items.some(
            (p: Pharmacy) =>
              !p ||
              typeof p.organizationId !== "string" ||
              typeof p.name !== "string" ||
              !["large", "standard"].includes(p.operatingType),
          )
        )
          throw new Error("Invalid layout list");
        if (alive.current && generation.current === version) {
          setItems(data.items);
          setTotal(data.total);
        }
      })
      .catch(() => {
        if (alive.current && generation.current === version)
          setError(
            "매장 목록을 확인하지 못했습니다. 선택한 값은 유지했습니다.",
          );
      })
      .finally(() => {
        if (alive.current && generation.current === version) setLoading(false);
      });
  }, [query, page, retry]);
  const save = async (p: Pharmacy) => {
    if (lock.current) return;
    const operatingType = values[p.organizationId] || p.operatingType,
      version = generation.current;
    lock.current = true;
    setSaving(p.organizationId);
    setError("");
    setNotice("");
    try {
      const r = await authClient.api.put(`${base}/${p.organizationId}`, {
        operatingType,
      });
      if (
        !r.data.success ||
        r.data.data?.organizationId !== p.organizationId ||
        r.data.data.operatingType !== operatingType
      )
        throw new Error("Invalid save");
      if (alive.current && generation.current === version) {
        setItems((old) =>
          old.map((i) =>
            i.organizationId === p.organizationId ? { ...i, operatingType } : i,
          ),
        );
        setNotice(`${p.name}: 상담 화면 구성을 저장했습니다.`);
      }
    } catch {
      if (alive.current && generation.current === version)
        setError(
          "저장하지 못했습니다. 선택한 값을 유지했습니다. 다시 시도해 주세요.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setSaving("");
    }
  };
  return (
    <section
      className="space-y-4 rounded-xl border bg-white p-5"
      aria-label="매장별 상담 화면 배치"
    >
      <h2 className="text-xl font-semibold">매장별 상담 화면 배치</h2>
      <p className="text-sm text-slate-600">
        일반 약국은 매대 약사·소비자 화면, 대형 약국은 매장 약사·직원 및 매대
        직원·소비자 화면을 먼저 제시합니다. 이용권·근무자 권한·약사 사용 확인은
        바뀌지 않습니다.
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
          setPage(1);
          setRetry((n) => n + 1);
        }}
      >
        <input
          aria-label="상담 배치 약국 검색"
          className="min-h-11 min-w-0 rounded border p-3"
          value={search}
          maxLength={100}
          disabled={!!saving}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="min-h-11 rounded border px-4"
          disabled={loading || !!saving}
        >
          찾기
        </button>
      </form>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            className="min-h-11 rounded border px-3"
            disabled={!!saving}
            onClick={() => setRetry((n) => n + 1)}
          >
            다시 확인
          </button>
        </div>
      )}
      {loading && <p role="status">약국 목록을 확인하는 중…</p>}
      {notice && <p role="status">{notice}</p>}
      {!loading && !error && !items.length && (
        <p>일치하는 활성 약국이 없습니다.</p>
      )}
      {items.map((p) => (
        <div
          key={p.organizationId}
          className="flex flex-wrap items-center gap-3 rounded border p-3"
        >
          <strong className="min-w-0 break-words">{p.name}</strong>
          <label>
            상담 배치{" "}
            <select
              aria-label={`${p.name} 상담 배치`}
              className="min-h-11 rounded border p-2"
              disabled={!!saving}
              value={values[p.organizationId] || p.operatingType}
              onChange={(e) =>
                setValues((old) => ({
                  ...old,
                  [p.organizationId]: e.target.value as Layout,
                }))
              }
            >
              <option value="standard">일반 약국 · 매대 중심</option>
              <option value="large">대형 약국 · 매장·매대</option>
            </select>
          </label>
          <button
            className="min-h-11 rounded border px-4"
            disabled={
              !!saving ||
              (values[p.organizationId] || p.operatingType) === p.operatingType
            }
            onClick={() => void save(p)}
          >
            {saving === p.organizationId ? "저장 중…" : "저장"}
          </button>
        </div>
      ))}
      <nav
        aria-label="상담 배치 목록 페이지"
        className="flex flex-wrap items-center gap-3"
      >
        <button
          className="min-h-11 rounded border px-4"
          disabled={page <= 1 || loading || !!saving}
          onClick={() => setPage((n) => n - 1)}
        >
          이전
        </button>
        <span>
          {page} 페이지 · {total}개 약국
        </span>
        <button
          className="min-h-11 rounded border px-4"
          disabled={page * 20 >= total || loading || !!saving}
          onClick={() => setPage((n) => n + 1)}
        >
          다음
        </button>
      </nav>
    </section>
  );
}
