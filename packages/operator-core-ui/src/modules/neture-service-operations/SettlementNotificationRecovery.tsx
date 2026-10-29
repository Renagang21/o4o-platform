import {useNetureServiceOperations} from './runtime';
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type SettlementNotificationJob,
  type SettlementNotificationQueue,
} from "./settlement-notification";
const labels = {
  pending: "미처리 · 대기",
  failed: "알림함 저장 실패",
  delivered: "알림함 저장 완료",
  legacy_unknown: "과거 발송 여부 확인 불가",
  not_applicable: "지급 완료 전 · 대상 아님",
};
function JobView({
  job,
  pending,
  onRetry,
}: {
  job: SettlementNotificationJob;
  pending: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-2 rounded border border-slate-200 p-3">
      <output className="block font-medium" aria-live="polite">
        {labels[job.state]}
      </output>
      <p className="text-sm text-slate-600">
        확인된 처리 시도 {job.attempts}회 · 처리 시점 저장 {job.deliveredCount}건
      </p>
      {job.updatedAt && (
        <p className="text-xs text-slate-500">
          최근 처리 확인:{" "}
          <time dateTime={job.updatedAt}>
            {new Date(job.updatedAt).toLocaleString("ko-KR")}
          </time>
        </p>
      )}
      {job.lastErrorCode && (
        <p className="text-sm">
          {job.lastErrorCode === "NO_CURRENT_OWNER"
            ? "현재 공급자 수신자가 없습니다. 소유 관계를 확인한 뒤 재처리하세요."
            : "알림 저장을 완료하지 못했습니다. 상태를 확인하고 재처리할 수 있습니다."}
        </p>
      )}
      {job.state === "legacy_unknown" && (
        <p className="text-sm">
          추적 도입 전의 지급 건은 실패로 추정하지 않으며 여기서 재발송하지
          않습니다.
        </p>
      )}
      {["pending", "failed"].includes(job.state) && (
        <button
          type="button"
          disabled={pending}
          onClick={onRetry}
          className="rounded border border-blue-600 px-3 py-2 text-sm text-blue-700 disabled:opacity-50"
        >
          {pending ? "처리 결과 확인 중…" : "알림 저장 재처리"}
        </button>
      )}
    </div>
  );
}
export function SettlementNotificationStatus({
  settlementId,
  refreshKey = 0,
}: {
  settlementId: string;
  refreshKey?: number;
}) {
 const {settlementNotificationApi}=useNetureServiceOperations();
  const [job, setJob] = useState<SettlementNotificationJob | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const epoch = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    const ticket = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const data = await settlementNotificationApi.get(settlementId);
      if (alive.current && ticket === epoch.current) setJob(data);
    } catch {
      if (alive.current && ticket === epoch.current)
        setError("알림 상태를 확인하지 못했습니다. 다시 조회해 주세요.");
    } finally {
      if (alive.current && ticket === epoch.current) setBusy(false);
    }
  }, [settlementId]);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  async function retry() {
    if (busy) return;
    setBusy(true);
    setError("");
    const ticket = ++epoch.current;
    try {
      const data = await settlementNotificationApi.retry(settlementId);
      if (alive.current && ticket === epoch.current) setJob(data);
    } catch {
      if (alive.current && ticket === epoch.current)
        setError(
          "처리 결과를 확인하지 못했습니다. 재지급하지 말고 알림 상태를 다시 조회해 주세요.",
        );
    } finally {
      if (alive.current && ticket === epoch.current) setBusy(false);
    }
  }
  return (
    <section aria-label="정산 알림 상태" className="my-3 space-y-2">
      <h3 className="font-semibold">정산 알림</h3>
      <p className="text-sm text-slate-600">
        저장 완료는 알림함 기록 기준입니다. 즉시 화면 수신·열람이나 은행 송금
        확인을 뜻하지 않습니다.
      </p>
      {job?.settlementId === settlementId && (
        <JobView job={job} pending={busy} onRetry={() => void retry()} />
      )}
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void load()}
        className="text-sm text-blue-700 underline"
      >
        {busy ? "확인 중…" : "알림 상태 다시 조회"}
      </button>
    </section>
  );
}
export default function SettlementNotificationRecovery({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
 const {settlementNotificationApi}=useNetureServiceOperations();
  const [state, setState] = useState<"failed" | "pending">("failed"),
    [page, setPage] = useState(1),
    [queue, setQueue] = useState<SettlementNotificationQueue | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const epoch = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++epoch.current;
    setLoading(true);
    setError("");
    setQueue(null);
    try {
      const data = await settlementNotificationApi.list(state, page);
      if (ticket === epoch.current) setQueue(data);
    } catch {
      if (ticket === epoch.current)
        setError("알림 처리 목록을 확인하지 못했습니다. 다시 조회해 주세요.");
    } finally {
      if (ticket === epoch.current) setLoading(false);
    }
  }, [state, page]);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  return (
    <section
      className="my-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      aria-label="정산 알림 복구 목록"
    >
      <h2 className="font-semibold">정산 알림 확인·재처리</h2>
      <p className="text-sm text-slate-600">
        지급 결과와 알림 저장은 별개입니다. 재처리는 알림만 다루며 지급·송금을
        다시 실행하지 않습니다.
      </p>
      <label>
        처리 상태{" "}
        <select
          value={state}
          onChange={(e) => {
            setPage(1);
            setState(e.target.value as "failed" | "pending");
          }}
        >
          <option value="failed">저장 실패</option>
          <option value="pending">미처리·대기</option>
        </select>
      </label>
      <button
        type="button"
        disabled={loading}
        onClick={() => void load()}
        className="ml-3 text-sm text-blue-700 underline"
      >
        목록 다시 조회
      </button>
      {loading && <p>알림 처리 목록 확인 중…</p>}
      {error && <p role="alert">{error}</p>}
      {queue && queue.items.length === 0 && (
        <p>
          선택한 상태의 추적 대상이 없습니다. 과거 지급 건의 발송 성공을
          뜻하지는 않습니다.
        </p>
      )}
      {queue?.items.map((row) => (
        <article key={row.settlementId} className="border-t py-2">
          <h3>
            {row.supplierName || "공급자"} · {row.periodStart?.slice(0, 10)} ~{" "}
            {row.periodEnd?.slice(0, 10)}
          </h3>
          <SettlementNotificationStatus
            key={row.settlementId}
            settlementId={row.settlementId}
          />
        </article>
      ))}
      {queue && (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </button>
          <span>
            {page}페이지 · {queue.total}건
          </span>
          <button
            type="button"
            disabled={page * queue.limit >= queue.total || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </button>
        </div>
      )}
    </section>
  );
}
