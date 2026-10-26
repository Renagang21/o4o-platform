import { useEffect, useState } from "react";
import {
  personalMailApi,
  mailActionLabels,
  mailErrorMessage,
  type MailJob,
} from "../../api/personalMail";

/** History paging is independent of the selected job's review and execution controls. */
export function MailJobHistory({
  accountId,
  version,
  busy,
  onSelect,
}: {
  readonly accountId: string;
  readonly version: number;
  readonly busy: boolean;
  readonly onSelect: (job: MailJob) => void;
}) {
  const [page, setPage] = useState(1),
    [rows, setRows] = useState<MailJob[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false,
      fetching = false;
    async function refresh() {
      if (fetching) return;
      fetching = true;
      setLoading(true);
      try {
        const jobs = await personalMailApi.jobs(accountId, page);
        if (!cancelled) {
          setRows(jobs);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(mailErrorMessage(e));
      } finally {
        fetching = false;
        if (!cancelled) setLoading(false);
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [accountId, page, version]);
  return (
    <section
      className="space-y-3 rounded-xl border bg-white p-5"
      aria-label="메일 작업 이력"
    >
      <h2 className="font-semibold">작업 이력</h2>
      <p className="text-sm text-slate-600">
        미완료 사용자 작업을 먼저 표시합니다. 이전 이력도 페이지를 이동해
        조회·제어할 수 있습니다.
      </p>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">작업 이력을 확인하고 있습니다…</p>}
      {!rows.length && !loading && (
        <p>
          {page === 1
            ? "아직 요청한 작업이 없습니다."
            : "이 페이지에 작업이 없습니다."}
        </p>
      )}
      {rows.map((row) => (
        <button
          className="block w-full rounded border p-3 text-left"
          key={row.id}
          disabled={busy || loading}
          onClick={() => onSelect(row)}
        >
          {mailActionLabels[row.action]} · {row.total}{" "}
          {row.kind === "rule" ? "발신처" : "메일"} · {row.status}
        </button>
      ))}
      <nav className="flex items-center gap-3" aria-label="작업 이력 페이지">
        <button
          className="rounded border p-2"
          disabled={busy || loading || page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          이전 작업
        </button>
        <span>{page}페이지</span>
        <button
          className="rounded border p-2"
          disabled={busy || loading || rows.length < 50 || page >= 10000}
          onClick={() => setPage((p) => p + 1)}
        >
          다음 작업
        </button>
      </nav>
    </section>
  );
}
