import { useFundingOperations } from './runtime';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type FundingHistoryItem } from './fundingExceptions';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from './types';
const label = (value: string | null) =>
  value === null
    ? "-"
    : PAYMENT_STATUS_LABELS[value as PaymentStatus] ||
      ({ fulfilled: "이행 완료" } as Record<string, string>)[value] ||
      value;
export default function FundingParticipantHistory({
  trialId,
  participantId,
  refreshKey,
}: {
  trialId: string;
  participantId: string;
  refreshKey?: string;
}) {
 const { api: { fundingExceptionsApi } } = useFundingOperations();



  const [items, setItems] = useState<FundingHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const scope = useRef({ mounted: false, sequence: 0 });
  useLayoutEffect(() => {
    const current = { mounted: true, sequence: 0 };
    scope.current = current;
    setItems([]);
    setHasMore(false);
    setPage(1);
    return () => {
      current.mounted = false;
      current.sequence++;
    };
  }, [trialId, participantId]);
  const load = useCallback(
    async (nextPage = 1) => {
      const current = scope.current;
      const sequence = ++current.sequence;
      const active = () => current.mounted && current.sequence === sequence;
      setLoading(true);
      setError("");
      try {
        const rows = await fundingExceptionsApi.history(
          trialId,
          participantId,
          nextPage,
        );
        if (active()) {
          setItems((previous) =>
            nextPage === 1
              ? rows.items
              : [
                  ...previous,
                  ...rows.items.filter(
                    (row) => !previous.some((p) => p.id === row.id),
                  ),
                ],
          );
          setPage(rows.page);
          setHasMore(rows.hasMore);
        }
      } catch {
        if (active())
          setError("처리 이력을 조회하지 못했습니다. 다시 조회해 주세요.");
      } finally {
        if (active()) setLoading(false);
      }
    },
    [trialId, participantId],
  );
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  return (
    <section
      className="my-4 space-y-2 rounded border p-3 text-sm"
      aria-label="펀딩 참여자 처리 이력"
    >
      <h2 className="font-semibold">대상 참여자 처리 이력</h2>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={loading}
        onClick={() => void load()}
        className="min-h-11 rounded border px-3 disabled:opacity-50"
      >
        처리 이력 다시 조회
      </button>
      {loading && <p role="status">처리 이력 조회 중...</p>}
      {!loading && !error && !items.length ? (
        <p>조회 가능한 처리 이력이 없습니다.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((row) => {
            const reward = row.action.endsWith("reward_change");
            const offline = row.action === "funding.offline_operation";
            return (
              <li key={row.id} className="border-t pt-2">
                <p>
                  {offline
                    ? ({
                        refund: "환급 기록",
                        withdraw: "철회 기록",
                        pledge: "약정 기록",
                      }[row.offlineAction ?? ""] ?? "사후 처리 기록")
                    : reward
                      ? "이행 기록"
                      : "입금 기록"}{" "}
                  · {new Date(row.at).toLocaleString("ko-KR")}
                </p>
                {!offline && (
                  <p>
                    {reward && row.beforeStatus === "pending"
                      ? "이행 대기"
                      : label(row.beforeStatus)}{" "}
                    →{" "}
                    {reward && row.afterStatus === "pending"
                      ? "이행 대기"
                      : label(row.afterStatus)}
                  </p>
                )}
                {offline && (
                  <p>
                    {row.reason}
                    {row.offlineAction === "refund" &&
                      ` · 누적 환급 ${row.beforeRefundAmount ?? 0} → ${row.afterRefundAmount ?? 0}원`}
                  </p>
                )}
                {!reward && !offline && (
                  <p>
                    확인 금액 {row.beforeAmount ?? "미기록"} →{" "}
                    {row.afterAmount ?? "미기록"} · 참고값 변경{" "}
                    {row.referenceChanged ? "있음" : "없음"} · 메모 변경{" "}
                    {row.noteChanged ? "있음" : "없음"}
                  </p>
                )}
                <p className="break-all text-xs text-slate-500">
                  처리자 {row.actorId || "계정 제거됨"}
                </p>
              </li>
            );
          })}
        </ol>
      )}
      {hasMore && (
        <button
          disabled={loading}
          onClick={() => void load(page + 1)}
          className="min-h-11 rounded border px-3"
        >
          이전 이력 더 보기
        </button>
      )}
    </section>
  );
}
