import { useCallback, useEffect, useState } from "react";
import { authClient } from "@o4o/auth-client";
import { DataTable, type ListColumnDef } from "@o4o/operator-ux-core";
type Supplier = {
  id: string;
  name: string;
  status: string;
  activationReady?: boolean;
  missingActivationFields?: string[];
};
const base = "/neture/operator/suppliers";
/** Existing supplier approval API remains authoritative; this view never grants product-master authority. */
export default function CentralSupplierReview() {
  const [rows, setRows] = useState<Supplier[]>([]),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1);
  const [status, setStatus] = useState("PENDING"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setRows([]);
    setBusy(true);
    setError("");
    try {
      const r = await authClient.api.get(`${base}/list`, {
        params: { page, limit: 20, status, search: query },
      });
      const data = r.data?.data;
      if (!Array.isArray(data?.items)) throw new Error();
      setRows(data.items);
      setPages(data.pagination.totalPages);
    } catch {
      setError("공급자 심사 목록을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, [page, status, query]);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (row: Supplier, action: "approve" | "reject") => {
    const reason =
      action === "reject"
        ? window.prompt("반려 사유를 입력해 주세요.")
        : undefined;
    if (action === "reject" && !reason?.trim()) return;
    if (
      action === "approve" &&
      !window.confirm(`${row.name} 공급자를 승인하시겠습니까?`)
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await authClient.api.post(
        `${base}/${encodeURIComponent(row.id)}/${action}`,
        reason ? { reason } : {},
      );
      setNotice("처리했습니다.");
      await load();
    } catch {
      setRows([]);
      setError(
        "처리하지 못했습니다. 승인 조건과 최신 상태를 다시 조회해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  const columns: ListColumnDef<Supplier>[] = [
    {
      key: "name",
      header: "공급자",
      render: (_, row) => <span>{row.name}</span>,
    },
    {
      key: "status",
      header: "상태",
      render: (_, row) => <span>{row.status}</span>,
    },
    {
      key: "actions",
      header: "심사",
      render: (_, row) =>
        row.status === "PENDING" ? (
          <div className="flex gap-3">
            <button
              disabled={busy || row.activationReady !== true}
              onClick={() => void act(row, "approve")}
            >
              승인
            </button>
            <button disabled={busy} onClick={() => void act(row, "reject")}>
              반려
            </button>
            {row.activationReady !== true && (
              <span>서류·기본 정보 보완 필요</span>
            )}
          </div>
        ) : null,
    },
  ];
  return (
    <section>
      <h2 className="text-xl font-bold">공급자 등록 심사</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <input
          aria-label="공급자 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button disabled={busy}>검색</button>
      </form>
      <select
        aria-label="공급자 상태"
        value={status}
        onChange={(e) => {
          setPage(1);
          setStatus(e.target.value);
        }}
      >
        <option value="PENDING">승인 대기</option>
        <option value="ACTIVE">활성</option>
        <option value="REJECTED">반려</option>
      </select>
      <button disabled={busy} onClick={() => void load()}>
        새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <DataTable
        tableId="central-supplier-review"
        columns={columns}
        data={rows}
        rowKey="id"
      />
      <div>
        <button disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>
          이전
        </button>
        <span>
          {page} / {Math.max(1, pages)}
        </span>
        <button
          disabled={busy || page >= pages}
          onClick={() => setPage(page + 1)}
        >
          다음
        </button>
      </div>
    </section>
  );
}
