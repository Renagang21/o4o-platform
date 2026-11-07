import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@o4o/auth-context";
import { authClient } from "@o4o/auth-client";
import { DataTable, type ListColumnDef } from "@o4o/operator-ux-core";
import { ActionBar } from "@o4o/ui";
type Kind = "community" | "lecture";
const TITLES: Record<Kind, string> = { community: "커뮤니티 게시판 최종 삭제", lecture: "강좌 최종 삭제" };
type Row = { id: string; name?: string; title?: string; status: string };
type Plan = {
  digest?: string;
  counts?: Record<string, number>;
  blockers?: string[];
  lessons?: number;
  enrollments?: number;
};
/** Reuses the domain deletion procedures. No account deletion or duplicated content editor. */
export default function AdminResourceDeletionPage({ fixedKind }: Readonly<{ fixedKind?: Kind }> = {}) {
  const { user } = useAuth();
  const actorKey = [
    user?.id,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ].join(":");
  const [kind, setKind] = useState<Kind>(fixedKind ?? "community"),
    [page, setPage] = useState(1),
    [hasNext, setHasNext] = useState(false);
  const [rows, setRows] = useState<Row[]>([]),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [target, setTarget] = useState<Row | null>(null),
    [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const epoch = useRef({ value: 0 }),
    lock = useRef(false);
  const load = useCallback(async () => {
    const seq = ++epoch.current.value;
    setLoading(true);
    setRows([]);
    setSelected(new Set());
    setTarget(null);
    setPlan(null);
    setConfirmed(false);
    setError("");
    try {
      const response = await authClient.api.get(
        kind === "community"
          ? "/communities/community/management/boards"
          : "/lms/operator/courses",
        {
          params:
            kind === "lecture"
              ? { status: "archived", contentKind: "all", page, limit: 20 }
              : undefined,
        },
      );
      if (seq !== epoch.current.value) return;
      const data = response.data;
      const items = data?.data;
      if (!Array.isArray(items)) throw new Error('INVALID_RESPONSE');
      setRows(
        kind === "community"
          ? items
              .filter((row: Row) => row.status === "archived")
              .slice((page - 1) * 20, page * 20)
          : items,
      );
      setHasNext(
        kind === "community"
          ? items.filter((row: Row) => row.status === "archived").length >
              page * 20
          : page < (data.pagination?.totalPages ?? 1),
      );
    } catch {
      if (seq === epoch.current.value)
        setError(
          "목록을 조회하지 못했습니다. 현재 관리자 권한을 확인해 주시기 바랍니다.",
        );
    } finally {
      if (seq === epoch.current.value) setLoading(false);
    }
  }, [kind, page]);
  useEffect(() => {
    lock.current = false;
    setBusy(false);
  }, [actorKey]);
  useEffect(() => {
    setNotice("");
    void load();
    const state = epoch.current;
    return () => {
      ++state.value;
    };
  }, [load, actorKey]);
  async function preview() {
    const row = rows.find((row) => selected.has(row.id));
    if (!row || selected.size !== 1 || lock.current) return;
    const seq = epoch.current.value;
    lock.current = true;
    setBusy(true);
    setError("");
    setReason("");
    setConfirmed(false);
    setTarget(row);
    setPlan(null);
    try {
      const response = await authClient.api.get(
        kind === "community"
          ? `/communities/community/management/boards/${row.id}/deletion-plan`
          : `/lms/operator/courses/${row.id}/deletion-plan`,
      );
      if (seq === epoch.current.value) setPlan(response.data.data);
    } catch {
      if (seq === epoch.current.value)
        setError("삭제 범위를 확인하지 못했습니다. 다시 조회해 주시기 바랍니다.");
    } finally {
      if (seq === epoch.current.value) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function remove() {
    if (
      !target ||
      !plan ||
      !confirmed ||
      !reason.trim() ||
      plan.blockers?.length ||
      lock.current
    )
      return;
    const seq = epoch.current.value;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await authClient.api.delete(
        kind === "community"
          ? `/communities/community/management/boards/${target.id}`
          : `/lms/operator/courses/${target.id}/hard`,
        { data: { expectedDigest: plan.digest, reason: reason.trim() } },
      );
      const data = response.data?.data;
      if (data?.applied !== true && data?.deleted !== true) throw new Error('INVALID_RESPONSE');
      if (seq === epoch.current.value)
        setNotice("선택 대상과 연결 자료의 삭제를 완료했습니다.");
    } catch {
      if (seq === epoch.current.value)
        setNotice(
          "삭제를 완료하지 못했습니다. 상태·권한·연결 자료가 바뀌었을 수 있습니다. 새 범위를 조회한 뒤 재시도해 주시기 바랍니다.",
        );
    } finally {
      if (seq === epoch.current.value) {
        await load();
        lock.current = false;
        setBusy(false);
      }
    }
  }
  const columns: ListColumnDef<Row>[] = [
    {
      key: "name",
      header: "대상",
      render: (_, row) => row.name || row.title || row.id,
    },
    { key: "status", header: "상태" },
  ];
  return (
    <section className="space-y-4 min-w-0">
      <h1 className="text-xl font-bold">{fixedKind ? TITLES[fixedKind] : "포럼·강의 최종 삭제"}</h1>
      <p>
        운영 중지·종료된 대상만 표시합니다. 선택한 포럼의 게시글·댓글·가입 자료
        또는 강의의 수업·학습 자료를 삭제합니다. 공통 계정과 다른 대상의 자료,
        공용 미디어 원본은 유지합니다.
      </p>
      {!fixedKind && <nav aria-label="삭제 대상">
        <button type="button"
          disabled={busy}
          aria-pressed={kind === "community"}
          onClick={() => {
            setPage(1);
            setKind("community");
          }}
        >
          커뮤니티 포럼
        </button>
        <button type="button"
          disabled={busy}
          aria-pressed={kind === "lecture"}
          onClick={() => {
            setPage(1);
            setKind("lecture");
          }}
        >
          강의
        </button>
      </nav>}
      <button type="button" disabled={busy || loading} onClick={() => void load()}>
        새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <output>{notice}</output>}
      <ActionBar
        selectedCount={selected.size}
        onClearSelection={() => {
          if (!busy) {
            setSelected(new Set());
            setTarget(null);
            setPlan(null);
          }
        }}
        actions={[
          {
            key: "delete",
            label: "최종 삭제 범위 확인",
            variant: "danger",
            disabled: busy || loading || selected.size !== 1,
            onClick: () => void preview(),
          },
        ]}
      />
      {target && plan && (
        <form
          className="rounded border border-red-300 p-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void remove();
          }}
        >
          <h2>{target.name || target.title}</h2>
          <p>
            공통 계정·다른 대상·공용 미디어는 유지됩니다. 이 대상과 아래 연결
            자료는 삭제 후 복구할 수 없습니다.
          </p>
          <dl>
            {Object.entries(
              plan.counts ?? {
                lessons: plan.lessons ?? 0,
                enrollments: plan.enrollments ?? 0,
              },
            ).map(([key, count]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{count}건</dd>
              </div>
            ))}
          </dl>
          {plan.blockers?.map((blocker) => (
            <p role="alert" key={blocker}>
              {blocker}
            </p>
          ))}
          <label className="block">
            삭제 사유
            <textarea
              required
              maxLength={2000}
              disabled={busy}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              disabled={busy}
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            대상과 유지·삭제 범위를 확인했습니다.
          </label>
          <button type="submit"
            disabled={
              busy || !confirmed || !reason.trim() || !!plan.blockers?.length
            }
          >
            최종 삭제 실행
          </button>
        </form>
      )}
      <DataTable<Row>
        tableId={`admin-resource-deletion-${kind}`}
        data={rows}
        columns={columns}
        rowKey="id"
        loading={loading}
        selectable
        selectedKeys={selected}
        onSelectionChange={(keys) => {
          if (!busy) {
            setSelected(new Set(keys));
            setTarget(null);
            setPlan(null);
          }
        }}
      />
      <nav>
        <button type="button" disabled={busy || page === 1} onClick={() => setPage(page - 1)}>
          이전
        </button>{" "}
        {page}{" "}
        <button type="button" disabled={busy || !hasNext} onClick={() => setPage(page + 1)}>
          다음
        </button>
      </nav>
    </section>
  );
}
