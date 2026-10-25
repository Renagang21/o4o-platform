import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  fundingExceptionsApi,
  type FundingHistoryItem,
} from "../../api/fundingExceptions";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "../../api/trial";
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
  const [items, setItems] = useState<FundingHistoryItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const scope = useRef({ mounted: false, sequence: 0 });
  useLayoutEffect(() => {
    const current = { mounted: true, sequence: 0 };
    scope.current = current;
    setItems([]);
    return () => {
      current.mounted = false;
      current.sequence++;
    };
  }, [trialId, participantId]);
  const load = useCallback(async () => {
    const current = scope.current;
    const sequence = ++current.sequence;
    const active = () => current.mounted && current.sequence === sequence;
    setLoading(true);
    setError("");
    try {
      const rows = await fundingExceptionsApi.history(trialId, participantId);
      if (active()) setItems(rows);
    } catch {
      if (active())
        setError("처리 이력을 조회하지 못했습니다. 다시 조회해 주세요.");
    } finally {
      if (active()) setLoading(false);
    }
  }, [trialId, participantId]);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  return (
    <section
      className="my-4 space-y-2 rounded border p-3 text-sm"
      aria-label="펀딩 참여자 처리 이력"
    >
      <h2 className="font-semibold">대상 참여자 처리 이력 (최근 50건)</h2>
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
      {loading ? (
        <p role="status">처리 이력 조회 중...</p>
      ) : !error && !items.length ? (
        <p>조회 가능한 처리 이력이 없습니다.</p>
      ) : (
        !error && (
          <ol className="space-y-2">
            {items.map((row) => {
              const reward = row.action.endsWith("reward_change");
              return (
                <li key={row.id} className="border-t pt-2">
                  <p>
                    {reward ? "이행 기록" : "입금 기록"} ·{" "}
                    {new Date(row.at).toLocaleString("ko-KR")}
                  </p>
                  <p>
                    {reward && row.beforeStatus === "pending"
                      ? "이행 대기"
                      : label(row.beforeStatus)}{" "}
                    →{" "}
                    {reward && row.afterStatus === "pending"
                      ? "이행 대기"
                      : label(row.afterStatus)}
                  </p>
                  {!reward && (
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
        )
      )}
    </section>
  );
}
