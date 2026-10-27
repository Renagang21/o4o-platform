import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/apiClient";

type History = {
  id: string;
  actorId: string | null;
  at: string;
  action: string;
  reason: string;
  participantId: string | null;
  after: { refundAmount?: number };
};
const labels: Record<string, string> = {
  result: "모집 결과 확인",
  stop: "진행 중지",
  withdraw: "참여 철회",
  refund: "환급 확인·정정",
  pledge: "약정 참여금 기록",
};

/** Reading older history never replaces the editable participant snapshot/version. */
export default function FundingOfflineHistory({
  id,
  initial,
  hasMore,
  participantPage,
}: {
  id: string;
  initial: History[];
  hasMore: boolean;
  participantPage: number;
}) {
  const [rows, setRows] = useState(initial);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(hasMore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const lock = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    lock.current = false;
    setRows(initial);
    setPage(1);
    setMore(hasMore);
    setError("");
    setBusy(false);
    return () => {
      generation.current = current + 1;
    };
  }, [id, initial, hasMore]);
  const load = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const current = generation.current;
    try {
      const response = await api.get(
        `/neture/operator/market-trial/${id}/offline-operations`,
        { params: { page: participantPage, historyPage: page + 1 } },
      );
      const data = response.data?.data;
      if (!response.data?.success || !Array.isArray(data?.history))
        throw new Error("이력 응답 오류");
      if (current === generation.current) {
        setRows((previous) => [
          ...previous,
          ...data.history.filter(
            (row: History) => !previous.some((p) => p.id === row.id),
          ),
        ]);
        setPage(data.historyPage);
        setMore(data.historyHasMore === true);
      }
    } catch {
      if (current === generation.current)
        setError("이전 이력을 조회하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      if (current === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <section aria-label="펀딩 사후 처리 이력" className="space-y-2">
      <h3 className="font-semibold">사후 처리 이력</h3>
      {!rows.length && <p>조회된 이력이 없습니다.</p>}
      {rows.map((h) => (
        <div key={h.id} className="rounded border p-2 text-sm break-words">
          <p>
            {labels[h.action] ?? h.action} ·{" "}
            {new Date(h.at).toLocaleString("ko-KR")} · 처리자{" "}
            {h.actorId || "계정 제거됨"}
          </p>
          <p>
            {h.participantId ? `참여 기록 ${h.participantId}` : "펀딩 전체"} ·{" "}
            {h.reason}
          </p>
          {h.after.refundAmount != null && (
            <p>누적 환급 {h.after.refundAmount}원</p>
          )}
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
      {more && (
        <button
          className="min-h-11 rounded border px-3"
          disabled={busy}
          onClick={() => void load()}
        >
          {busy ? "이력 조회 중…" : "이전 사후 처리 이력 더 보기"}
        </button>
      )}
    </section>
  );
}
