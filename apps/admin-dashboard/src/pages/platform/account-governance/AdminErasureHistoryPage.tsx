import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@o4o/auth-context";
import { DataTable, type ListColumnDef } from "@o4o/operator-ux-core";
import { ActionBar } from "@o4o/ui";
import { api } from "@/api/base";
import type { UserErasureResult } from "@/types/user";
import AccountErasureControls from "./AccountErasureControls";

const labels: Record<string, string> = {
  pending: "삭제 중",
  processing: "삭제 중",
  review_required: "확인 필요",
  retry_required: "재시도 필요",
  completed: "삭제 완료",
};
export default function AdminErasureHistoryPage() {
  const { user } = useAuth();
  const actorKey = [
    user?.id,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ].join(":");
  const [rows, setRows] = useState<UserErasureResult[]>([]),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set()),
    [detail, setDetail] = useState<UserErasureResult | null>(null);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [hasNext, setHasNext] = useState(false),
    [error, setError] = useState("");
  const [readiness, setReadiness] = useState<{
    enabled: boolean;
    blockers: string[];
  } | null>(null);
  const epoch = useRef({ value: 0 });
  useEffect(() => {
    setBusy(false);
  }, [actorKey]);
  const load = useCallback(async () => {
    const generation = ++epoch.current.value;
    setSelected(new Set());
    setDetail(null);
    setRows([]);
    setError("");
    setLoading(true);
    try {
      const [response, ready] = await Promise.all([
        api.get("/admin/users/erasure-operations", {
          params: { page, state: filter || undefined },
        }),
        api.get("/admin/users/erasure-readiness"),
      ]);
      if (generation !== epoch.current.value) return;
      const data = response.data?.data;
      if (!Array.isArray(data?.items)) throw new Error('INVALID_RESPONSE');
      setReadiness(ready.data?.data ?? null);
      setRows(data.items);
      setHasNext(data.hasNext === true);
    } catch {
      if (generation === epoch.current.value)
        setError(
          "삭제 내역을 조회하지 못했습니다. 현재 전체 관리자 권한을 확인한 뒤 다시 조회해 주세요.",
        );
    } finally {
      if (generation === epoch.current.value) setLoading(false);
    }
  }, [page, filter]);
  useEffect(() => {
    void load();
    const state = epoch.current;
    return () => {
      ++state.value;
    };
  }, [load, actorKey]);
  const columns: ListColumnDef<UserErasureResult>[] = [
    { key: "operationId", header: "처리 번호" },
    {
      key: "state",
      header: "상태",
      render: (value) => labels[String(value)] ?? "확인 필요",
    },
    { key: "remainingFileTasks", header: "남은 파일" },
    {
      key: "updatedAt",
      header: "최근 처리",
      render: (value) =>
        value ? new Date(String(value)).toLocaleString("ko-KR") : "—",
    },
    {
      key: "errorCode",
      header: "실패 원인",
      render: (value) => String(value ?? "—"),
    },
  ];
  return (
    <section className="space-y-4 min-w-0">
      <h1 className="text-xl font-bold">삭제 처리 내역</h1>
      <p>
        실제 계정·개인자료 제거가 끝난 경우에만 완료로 표시합니다. 실행이
        비활성화돼 있어도 기존 내역은 조회할 수 있습니다.
      </p>
      {readiness && !readiness.enabled && (
        <p role="status">
          새 삭제·재시도는 아직 실행할 수 없습니다.{" "}
          {readiness.blockers.includes("ACCOUNT_ERASURE_MIGRATION_REQUIRED")
            ? "데이터베이스 준비가 필요합니다. "
            : ""}
          {readiness.blockers.includes(
            "PERSONAL_FILE_INVENTORY_REVIEW_REQUIRED",
          )
            ? "파일 분류 검토가 필요합니다. "
            : ""}
          {readiness.blockers.includes("ERASURE_SYSTEM_CLASSIFICATION_REQUIRED")
            ? "최소 보존 기록의 기준 설정이 필요합니다. "
            : ""}
          {readiness.blockers.includes("ACCOUNT_ERASURE_ROLLOUT_REQUIRED")
            ? "삭제 실행이 비활성화돼 있습니다."
            : ""}{" "}
          기존 처리 내역은 조회할 수 있습니다.
        </p>
      )}
      <select
        aria-label="삭제 상태"
        disabled={busy}
        value={filter}
        onChange={(event) => {
          setPage(1);
          setFilter(event.target.value);
        }}
      >
        <option value="">전체</option>
        {Object.entries(labels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || loading}
        onClick={() => void load()}
      >
        새로고침
      </button>
      {error && <p role="alert">{error}</p>}
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
            label: "상태·실패·재시도",
            disabled: busy || loading || selected.size !== 1,
            onClick: () =>
              setDetail(
                rows.find((row) => selected.has(row.operationId)) ?? null,
              ),
          },
        ]}
      />
      {detail && (
        <section aria-label="선택 삭제 처리" className="rounded border p-4">
          <h2>{detail.operationId}</h2>
          <AccountErasureControls
            key={detail.operationId}
            accountId={String(user?.id ?? "")}
            userId=""
            executionEnabled={readiness?.enabled === true}
            initialResult={detail}
            onBusyChange={setBusy}
            onCompleted={() => void load()}
          />
        </section>
      )}
      <DataTable<UserErasureResult>
        tableId="admin-erasure-history"
        data={rows}
        columns={columns}
        rowKey="operationId"
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
      <nav aria-label="삭제 내역 페이지">
        <button type="button"
          disabled={busy || page === 1}
          onClick={() => setPage((value) => value - 1)}
        >
          이전
        </button>{" "}
        {page}{" "}
        <button type="button"
          disabled={busy || !hasNext}
          onClick={() => setPage((value) => value + 1)}
        >
          다음
        </button>
      </nav>
    </section>
  );
}
