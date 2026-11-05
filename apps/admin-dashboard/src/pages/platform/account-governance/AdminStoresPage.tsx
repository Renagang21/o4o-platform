import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@o4o/auth-context";
import { authClient } from "@o4o/auth-client";
import { DataTable, type ListColumnDef } from "@o4o/operator-ux-core";
import { ActionBar } from "@o4o/ui";
type Store = {
  id: string;
  name: string;
  isActive: boolean;
  ownerName?: string;
  ownerId?: string;
  businessNumber?: string;
  address?: string;
};
export default function AdminStoresPage() {
  const { user } = useAuth();
  const actorKey = [
    user?.id,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ].join(":");
  const [rows, setRows] = useState<Store[]>([]),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [detail, setDetail] = useState<Store | null>(null);
  const [page, setPage] = useState(1),
    [hasNext, setHasNext] = useState(false),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const epoch = useRef({ value: 0 });
  const load = useCallback(async () => {
    const seq = ++epoch.current.value;
    setLoading(true);
    setRows([]);
    setSelected(new Set());
    setDetail(null);
    setError("");
    try {
      const response = await authClient.api.get("/operator/stores", {
        params: { all: true, page, limit: 20, search: query },
      });
      if (seq !== epoch.current.value) return;
      const data = response.data;
      if (!Array.isArray(data?.stores)) throw new Error('INVALID_RESPONSE');
      setRows(data.stores);
      setHasNext(page < data.pagination.totalPages);
    } catch {
      if (seq === epoch.current.value)
        setError(
          "매장 목록을 조회하지 못했습니다. 권한을 확인한 뒤 다시 조회해 주시기 바랍니다.",
        );
    } finally {
      if (seq === epoch.current.value) setLoading(false);
    }
  }, [page, query]);
  useEffect(() => {
    void load();
    const state = epoch.current;
    return () => {
      ++state.value;
    };
  }, [load, actorKey]);
  const columns: ListColumnDef<Store>[] = [
    { key: "name", header: "매장" },
    { key: "ownerName", header: "현재 경영자" },
    {
      key: "isActive",
      header: "운영",
      render: (value) => (value ? "운영 중" : "종료·정지"),
    },
    { key: "businessNumber", header: "사업자번호" },
  ];
  return (
    <section className="space-y-4 min-w-0">
      <h1 className="text-xl font-bold">내 매장 관리</h1>
      <p>
        매도 시 같은 매장 자료를 새 경영자에게 이전합니다. 완전폐업 시 별도
        자료·파일 삭제 절차를 실행합니다.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          aria-label="매장 검색"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="submit">검색</button>
      </form>
      <button type="button" disabled={loading} onClick={() => void load()}>
        새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      <ActionBar
        selectedCount={selected.size}
        onClearSelection={() => {
          setSelected(new Set());
          setDetail(null);
        }}
        actions={[
          {
            key: "detail",
            label: "매장 상세·이전·폐업",
            disabled: loading || selected.size !== 1,
            onClick: () =>
              setDetail(rows.find((row) => selected.has(row.id)) ?? null),
          },
        ]}
      />
      {detail && (
        <article className="rounded border p-4 space-y-3">
          <h2>{detail.name}</h2>
          <p>
            {detail.address} · {detail.businessNumber || "사업자번호 미등록"}
          </p>
          <p>현재 경영자: {detail.ownerName || "소속 확인 필요"}</p>
          {detail.ownerId ? (
            <Link
              to={`/admin/platform/users?userId=${encodeURIComponent(detail.ownerId)}`}
            >
              경영자·약국 정보 확인 후 이전·완전폐업 처리
            </Link>
          ) : (
            <p>
              현재 경영자 소속이 없습니다. 계정 삭제로 매장 자료를 삭제하지
              않습니다.
            </p>
          )}
        </article>
      )}
      <DataTable<Store>
        tableId="admin-business-stores"
        columns={columns}
        data={rows}
        rowKey="id"
        selectable
        selectedKeys={selected}
        onSelectionChange={(keys) => {
          setSelected(new Set(keys));
          setDetail(null);
        }}
        loading={loading}
      />
      <nav>
        <button type="button"
          disabled={page === 1 || loading}
          onClick={() => setPage(page - 1)}
        >
          이전
        </button>{" "}
        {page}{" "}
        <button type="button"
          disabled={!hasNext || loading}
          onClick={() => setPage(page + 1)}
        >
          다음
        </button>
      </nav>
    </section>
  );
}
