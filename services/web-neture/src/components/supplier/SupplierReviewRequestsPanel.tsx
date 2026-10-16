import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  supplierReviewApi,
  SUPPLIER_REVIEW_LABELS,
  type SupplierReviewData,
} from "../../lib/api/supplierReview";

const status = {
  requested: "보완 요청",
  submitted: "보완 제출 · 검토 대기",
  resolved: "검토 완료",
};
const actionLabels: Record<string, string> = {
  supplier_approve: "공급자 승인",
  supplier_reject: "공급자 반려",
  supplier_basic_info_update: "기본정보 수정",
};
const button = "min-h-11 rounded border px-3 text-sm disabled:opacity-50";
export default function SupplierReviewRequestsPanel({
  supplierId,
  operator = false,
  disabled = false,
  onBusyChange,
  onSaved,
}: {
  supplierId: string;
  operator?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSaved?: () => Promise<void>;
}) {
  const [data, setData] = useState<SupplierReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const loadedTarget = useRef("");
  const scopeRef = useRef({ mounted: false, sequence: 0, writing: false });
  useLayoutEffect(() => {
    const scope = { mounted: true, sequence: 0, writing: false };
    scopeRef.current = scope;
    loadedTarget.current = "";
    setData(null);
    setPage(1);
    setNote("");
    setItems([]);
    setActionError("");
    setNotice("");
    setRefreshFailed(false);
    setPending(false);
    return () => {
      scope.mounted = false;
      scope.sequence++;
      onBusyChange?.(false);
    };
  }, [supplierId, operator, onBusyChange]);
  const load = useCallback(async () => {
    const scope = scopeRef.current;
    const sequence = ++scope.sequence;
    const current = () => scope.mounted && sequence === scope.sequence;
    setLoading(true);
    setReadError("");
    try {
      const value = await supplierReviewApi.list(supplierId, operator, page);
      if (value.supplierId !== supplierId || !Array.isArray(value.requests))
        throw new Error("보완 요청 대상이 일치하지 않습니다.");
      if (!current()) return false;
      const nextTarget = value.current
        ? `${value.current.id}:${value.current.version}`
        : "new";
      if (loadedTarget.current && loadedTarget.current !== nextTarget) {
        setNote("");
        setItems([]);
      }
      loadedTarget.current = nextTarget;
      setData(value);
      setActionError("");
      setRefreshFailed(false);
      return true;
    } catch {
      if (current())
        setReadError(
          "보완 요청을 조회하지 못했습니다. 다시 조회한 후 처리해 주세요.",
        );
      return false;
    } finally {
      if (current()) setLoading(false);
    }
  }, [supplierId, operator, page]);
  useEffect(() => {
    void load();
  }, [load]);
  const write = async () => {
    const scope = scopeRef.current;
    const target = data?.current;
    if (
      scope.writing ||
      disabled ||
      loading ||
      readError ||
      !data ||
      !note.trim() ||
      (operator && !target && !items.length)
    )
      return;
    scope.writing = true;
    onBusyChange?.(true);
    setPending(true);
    setActionError("");
    setNotice("");
    try {
      if (operator && !target) {
        const result = await supplierReviewApi.create(supplierId, items, note);
        if (scope.mounted)
          setNotice(
            result.notificationCreated
              ? "보완 요청을 저장하고 알림을 생성했습니다."
              : "보완 요청은 저장됐지만 알림 생성은 확인하지 못했습니다.",
          );
      } else if (target && operator) {
        await supplierReviewApi.resolve(
          supplierId,
          target.id,
          note,
          target.version,
        );
        if (scope.mounted)
          setNotice(
            "보완 요청의 검토 완료를 저장했습니다. 공급자 승인 상태는 별도로 처리합니다.",
          );
      } else if (target?.state === "requested") {
        await supplierReviewApi.submit(target.id, note, target.version);
        if (scope.mounted)
          setNotice("보완 제출을 저장했습니다. 운영자의 검토를 기다려 주세요.");
      } else return;
      if (!scope.mounted) return;
      setNote("");
      setItems([]);
      const ok = await load();
      if (scope.mounted) {
        try {
          await onSaved?.();
        } catch {
          setRefreshFailed(true);
        }
        if (!ok) setRefreshFailed(true);
      }
    } catch (error: unknown) {
      if (scope.mounted)
        setActionError(
          (
            error as {
              response?: { data?: { error?: { message?: string } } };
              message?: string;
            }
          )?.response?.data?.error?.message ||
            "저장에 실패했습니다. 입력을 유지했습니다. 대상이 변경됐다면 다시 조회해 주세요.",
        );
    } finally {
      scope.writing = false;
      if (scope.mounted) {
        setPending(false);
        onBusyChange?.(false);
      }
    }
  };
  const current = data?.current;
  const canWrite = !!data && (operator || current?.state === "requested");
  return (
    <section
      className="my-5 space-y-3 rounded-lg border border-slate-200 p-4"
      aria-label="공급자 보완 요청 및 처리 이력"
    >
      <h2 className="font-semibold">보완 요청 · 처리 이력</h2>
      <p className="text-xs text-slate-500">
        사업자 정보와 서류는 해당 입력란에서 저장한 뒤 보완 내용을 제출해
        주세요. 보완 제출·검토 완료는 공급자 승인과 별도입니다.
      </p>
      {notice && (
        <p role="status" className="text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {refreshFailed && (
        <p role="alert" className="text-sm text-amber-800">
          저장은 완료됐지만 목록 갱신에 실패했습니다. 다시 조회만 해 주세요.
        </p>
      )}
      {readError && (
        <p role="alert" className="text-sm text-red-700">
          {readError}
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-sm text-red-700">
          {actionError}
        </p>
      )}
      <button
        className={button}
        disabled={pending || loading}
        onClick={() => {
          if (!scopeRef.current.writing) void load();
        }}
      >
        보완 요청 다시 조회
      </button>
      {loading && (
        <p role="status" className="text-sm">
          보완 요청 조회 중...
        </p>
      )}
      {current && (
        <div className="space-y-2 rounded bg-sky-50 p-3 text-sm">
          <strong>{status[current.state]}</strong>
          <p>
            {current.items
              .map((i) => SUPPLIER_REVIEW_LABELS[i] || i)
              .join(" · ")}
          </p>
          <p className="whitespace-pre-wrap break-words">
            {current.request_note}
          </p>
          {current.response_note && (
            <p className="whitespace-pre-wrap break-words">
              제출 내용: {current.response_note}
            </p>
          )}
        </div>
      )}
      {!loading && !readError && data && !current && (
        <p className="text-sm">진행 중인 보완 요청이 없습니다.</p>
      )}
      {canWrite && (
        <fieldset
          disabled={pending || loading || !!readError || disabled}
          className="space-y-3 min-w-0"
        >
          {operator && !current && (
            <div className="flex flex-wrap gap-3">
              {Object.entries(SUPPLIER_REVIEW_LABELS).map(([key, label]) => (
                <label key={key} className="text-sm">
                  <input
                    type="checkbox"
                    checked={items.includes(key)}
                    onChange={(e) =>
                      setItems((prev) =>
                        e.target.checked
                          ? [...prev, key]
                          : prev.filter((i) => i !== key),
                      )
                    }
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
          )}
          <label className="block text-sm">
            {operator
              ? current
                ? "검토 완료 사유"
                : "보완 요청 내용"
              : "보완 제출 내용"}
            <textarea
              aria-label={
                operator
                  ? current
                    ? "검토 완료 사유"
                    : "보완 요청 내용"
                  : "보완 제출 내용"
              }
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              rows={3}
            />
          </label>
          <button
            className={button}
            disabled={!note.trim() || (operator && !current && !items.length)}
            onClick={() => void write()}
          >
            {pending
              ? "저장 중..."
              : operator
                ? current
                  ? "검토 완료 저장"
                  : "보완 요청 저장"
                : "보완 제출"}
          </button>
        </fieldset>
      )}
      {!!data?.requests.length && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            보완 요청 이력
          </summary>
          <ol className="mt-2 space-y-3">
            {data.requests.map((r) => (
              <li key={r.id} className="border-t pt-2 text-sm">
                <p>
                  {status[r.state]} ·{" "}
                  {new Date(r.created_at).toLocaleString("ko-KR")}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  요청: {r.request_note}
                </p>
                {r.response_note && (
                  <p className="whitespace-pre-wrap break-words">
                    제출: {r.response_note} ·{" "}
                    {r.submitted_at &&
                      new Date(r.submitted_at).toLocaleString("ko-KR")}
                  </p>
                )}
                {r.resolution_note && (
                  <p className="whitespace-pre-wrap break-words">
                    검토: {r.resolution_note} ·{" "}
                    {r.resolved_at &&
                      new Date(r.resolved_at).toLocaleString("ko-KR")}
                  </p>
                )}
                {operator && (
                  <p className="text-xs text-slate-500">
                    요청자 {r.requested_by || "계정 제거됨"} · 제출자{" "}
                    {r.submitted_by || "-"} · 검토자 {r.resolved_by || "-"}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
      {!!data?.actions.length && (
        <details>
          <summary className="cursor-pointer text-sm">
            기존 심사·정보 수정 이력 (최근 20건)
          </summary>
          {data.actions.map((a) => (
            <p key={a.id} className="text-xs">
              {actionLabels[
                a.action_key.replace(/^neture\.(operator|admin)\./, "")
              ] || "심사 처리"}{" "}
              · {new Date(a.created_at).toLocaleString("ko-KR")} ·{" "}
              {a.user_id || "계정 제거됨"}
            </p>
          ))}
        </details>
      )}
      {data && (
        <div className="flex gap-3">
          <button
            className={button}
            disabled={pending || loading || page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전 이력
          </button>
          <span className="self-center text-sm">{page} 페이지</span>
          <button
            className={button}
            disabled={pending || loading || !data.hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            다음 이력
          </button>
        </div>
      )}
    </section>
  );
}
