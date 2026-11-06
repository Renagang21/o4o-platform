import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@o4o/auth-context";
import { authClient } from "@o4o/auth-client";
import { DataTable, type ListColumnDef } from "@o4o/operator-ux-core";
import { ActionBar } from "@o4o/ui";
type Supplier = {
  id: string;
  name: string;
  status: string;
  userId?: string | null;
  businessNumber?: string;
  representativeName?: string;
  missingProfileFields?: string[];
  missingActivationFields?: string[];
};
const base = "/neture/operator/suppliers";
/** Approval stays in the supplier domain; account deletion stays in native Admin. */
export default function CentralSupplierReview({
  adminMode = false,
}: {
  adminMode?: boolean;
}) {
  const { user } = useAuth();
  const actorKey=[user?.id,...(Array.isArray(user?.roles)?user.roles:[])].join(':');
  const [rows, setRows] = useState<Supplier[]>([]),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [detail, setDetail] = useState<Supplier | null>(null);
  const [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [status, setStatus] = useState("PENDING"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const epoch = useRef({value:0}),
    lock = useRef(false);
  const load = useCallback(async () => {
    const seq = ++epoch.current.value;
    setLoading(true);
    setSelected(new Set());
    setDetail(null);
    setRows([]);
    setError("");
    try {
      const response = await authClient.api.get(`${base}/list`, {
        params: { page, limit: 20, status: status || undefined, search: query },
      });
      if (seq !== epoch.current.value) return;
      const data = response.data?.data;
      if (!Array.isArray(data?.items)) throw new Error();
      setRows(data.items);
      setPages(data.pagination.totalPages);
    } catch {
      if (seq === epoch.current.value)
        setError(
          "공급자 목록을 불러오지 못했습니다. 권한과 최신 상태를 확인해 주시기 바랍니다.",
        );
    } finally {
      if (seq === epoch.current.value) setLoading(false);
    }
  }, [page, status, query]);
  useEffect(() => {
    lock.current = false;
    setBusy(false);
  }, [actorKey]);
  useEffect(() => {
    setNotice("");
    void load();
    const state=epoch.current;
    return () => {
      ++state.value;
    };
  }, [load,actorKey,adminMode]);
  const row = rows.find((item) => selected.has(item.id));
  async function act(action: "approve" | "reject") {
    if (!row || selected.size !== 1 || lock.current) return;
    const reason =
      action === "reject"
        ? window.prompt("반려 사유를 입력해 주시기 바랍니다.")
        : undefined;
    if (action === "reject" && !reason?.trim()) return;
    if (
      !window.confirm(
        `${row.name}: ${action === "approve" ? "승인" : "반려"}합니다. 계정과 제품·거래 자료는 삭제하지 않습니다.`,
      )
    )
      return;
    const seq = epoch.current.value;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await authClient.api.post(
        `${base}/${encodeURIComponent(row.id)}/${action}`,
        reason ? { reason: reason.trim() } : {},
      );
      if (seq === epoch.current.value) setNotice("공급자 심사 결과를 저장했습니다.");
    } catch {
      if (seq === epoch.current.value)
        setNotice(
          "처리하지 못했습니다. 최신 상태와 승인 조건을 다시 확인해 주시기 바랍니다.",
        );
    } finally {
      if (seq === epoch.current.value) {
        await load();
        lock.current = false;
        setBusy(false);
      }
    }
  }
  const columns: ListColumnDef<Supplier>[] = [
    { key: "name", header: "공급자" },
    { key: "status", header: "상태" },
    { key: "businessNumber", header: "사업자번호" },
  ];
  return (
    <section className="space-y-4 min-w-0">
      <h1 className="text-xl font-bold">
        {adminMode ? "공급자 관리" : "공급자 등록 심사"}
      </h1>
      <p>
        제품·거래 처리는 공급자 업무에서 관리합니다. 계정 삭제는 제품·거래
        자체를 삭제하지 않습니다.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          aria-label="공급자 검색"
          disabled={busy}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button disabled={busy}>검색</button>
      </form>
      <select
        aria-label="공급자 상태"
        disabled={busy}
        value={status}
        onChange={(event) => {
          setPage(1);
          setStatus(event.target.value);
        }}
      >
        <option value="">전체</option>
        {["PENDING", "ACTIVE", "INACTIVE", "REJECTED"].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <button disabled={busy || loading} onClick={() => void load()}>
        새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <ActionBar
        selectedCount={selected.size}
        onClearSelection={() => {
          if (!busy) {
            setSelected(new Set());
            setDetail(null);
          }
        }}
        actions={[
          {
            key: "detail",
            label: "신청 정보·계정",
            disabled: busy || loading || selected.size !== 1,
            onClick: () => setDetail(row ?? null),
          },
          ...(["approve", "reject"] as const).map((action) => ({
            key: action,
            label: action === "approve" ? "승인" : "반려",
            disabled:
              busy ||
              loading ||
              selected.size !== 1 ||
              row?.status !== "PENDING",
            onClick: () => void act(action),
          })),
        ]}
      />
      {detail && (
        <article className="rounded border p-4 space-y-3">
          <h2>{detail.name}</h2>
          <p>
            상태: {detail.status} · 대표자:{" "}
            {detail.representativeName || "미등록"} · 사업자번호:{" "}
            {detail.businessNumber || "미등록"}
          </p>
          <p>프로필 보완 안내: {(detail.missingProfileFields ?? detail.missingActivationFields)?.join(", ") || "없음"}</p>
          {adminMode && detail.userId && (
            <Link
              to={`/admin/platform/users?userId=${encodeURIComponent(detail.userId)}`}
            >
              연결 회원 상세·개인자료 삭제
            </Link>
          )}
          <a
            className="block"
            href="https://supplier.neture.co.kr/operator/suppliers"
          >
            공급자 사업 정보·증빙·제품·거래 관리
          </a>
        </article>
      )}
      <DataTable<Supplier>
        tableId={adminMode ? "admin-suppliers" : "central-supplier-review"}
        columns={columns}
        data={rows}
        rowKey="id"
        loading={loading}
        selectable
        selectedKeys={selected}
        onSelectionChange={(keys) => {
          if (!busy) {
            setSelected(new Set(keys));
            setDetail(null);
          }
        }}
      />
      <nav>
        <button disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>
          이전
        </button>{" "}
        {page} / {Math.max(1, pages)}{" "}
        <button
          disabled={busy || page >= pages}
          onClick={() => setPage(page + 1)}
        >
          다음
        </button>
      </nav>
    </section>
  );
}
