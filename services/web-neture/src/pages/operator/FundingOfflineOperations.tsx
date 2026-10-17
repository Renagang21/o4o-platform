import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/apiClient";
type State = {
  version: number;
  withdrawn?: boolean;
  refundAmount?: number;
  refundedAt?: string;
  reason?: string;
  decision?: string;
};
type Participant = {
  id: string;
  name: string;
  paidAmount: string | null;
  contributionAmount: string;
  paymentStatus: string;
  offlineState: State;
  refundPending: string;
};
type Snapshot = {
  trial: { status: string; offlineState: State };
  totals: { netAmount: string; refundedAmount: string; withdrawnCount: number };
  participants: Participant[];
  page: number;
  hasMore: boolean;
  history: {
    id: string;
    actorId: string;
    at: string;
    action: string;
    reason: string;
    participantId: string | null;
    after: State;
  }[];
};
export default function FundingOfflineOperations({
  id,
  onSaved,
  disabled = false,
  onBusyChange,
}: {
  id: string;
  onSaved?: () => void;
  disabled?: boolean;
  onBusyChange?: (v: boolean) => void;
}) {
  const [data, setData] = useState<Snapshot | null>(null),
    [page, setPage] = useState(1),
    [reload, setReload] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(""),
    [action, setAction] = useState("result"),
    [decision, setDecision] = useState("met"),
    [amount, setAmount] = useState(""),
    [date, setDate] = useState(""),
    [reason, setReason] = useState("");
  const lifecycle = useRef({ alive: true, writing: false });
  useEffect(() => {
    const s = lifecycle.current;
    s.alive = true;
    return () => {
      s.alive = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    void api
      .get(`/neture/operator/market-trial/${id}/offline-operations`, {
        params: { page },
      })
      .then((r: { data: any }) => {
        if (!r.data.success || !r.data.data) throw Error("조회 응답 오류");
        if (active) {
          setData(r.data.data);
          setAction((v) =>
            v === "result" && r.data.data.trial.status !== "recruiting"
              ? "withdraw"
              : v === "stop" &&
                  !["recruiting", "development", "outcome_confirming"].includes(
                    r.data.data.trial.status,
                  )
                ? "withdraw"
                : v,
          );
        }
      })
      .catch((e: any) => {
        if (active)
          setError(e.response?.data?.message || "운영 현황 조회 실패");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, page, reload]);
  async function save() {
    if (
      !data ||
      lifecycle.current.writing ||
      disabled ||
      !reason.trim() ||
      loading
    )
      return;
    const participant = ["withdraw", "refund", "pledge"].includes(action)
      ? data.participants.find((v) => v.id === target)
      : null;
    if (["withdraw", "refund", "pledge"].includes(action) && !participant) {
      setError("참여자를 선택해 주세요.");
      return;
    }
    if (
      ["refund", "pledge"].includes(action) &&
      (!amount.trim() || !/^\d+(\.\d{1,2})?$/.test(amount))
    ) {
      setError("금액을 확인해 주세요.");
      return;
    }
    if (
      action === "refund" &&
      (!date || !Number.isFinite(new Date(date).getTime()))
    ) {
      setError("실제 환급 처리일을 입력해 주세요.");
      return;
    }
    const state = lifecycle.current;
    state.writing = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    setNotice("");
    try {
      const response = await api.post(
        `/neture/operator/market-trial/${id}/offline-operations`,
        {
          action,
          decision,
          participantId: participant?.id ?? null,
          version:
            participant?.offlineState.version ??
            data.trial.offlineState.version,
          amount: amount.trim() ? Number(amount) : null,
          processedAt: date ? new Date(date).toISOString() : null,
          reason,
        },
      );
      if (!response.data?.success)
        throw Error("저장 응답을 확인하지 못했습니다.");
      if (!state.alive) return;
      setNotice(
        "처리 기록을 저장했습니다. 실제 송금·환급은 실행하지 않았습니다.",
      );
      setReason("");
      setData(null);
      setReload((v) => v + 1);
      try {
        onSaved?.();
      } catch {
        /* Parent refresh cannot turn a committed record into a save failure. */
      }
    } catch (e: any) {
      if (state.alive)
        setError(
          e.response?.data?.message ||
            "저장 결과를 확인하지 못했습니다. 입력을 보존했습니다. 현황을 다시 조회해 주세요.",
        );
    } finally {
      state.writing = false;
      if (state.alive) {
        setBusy(false);
        onBusyChange?.(false);
      }
    }
  }
  const labels: Record<string, string> = {
    result: "모금 결과 등록",
    stop: "펀딩 중지",
    withdraw: "참여 철회",
    refund: "누적 환급 기록·정정",
    pledge: "약정 참여금 기록·정정",
  };
  return (
    <section
      aria-label="오프라인 펀딩 운영"
      className="mb-4 rounded border bg-white p-4 space-y-3"
    >
      <h2 className="font-semibold">오프라인 모금·사후 처리</h2>
      <p className="text-sm">
        입금·환급은 운영자가 오프라인에서 처리한 뒤 기록합니다. 모집 기한 만료가
        성공·실패를 자동 판정하지 않습니다.
      </p>
      {notice && (
        <p role="status" className="text-green-700">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
          {notice ? " 저장은 완료됐으니 조회만 재시도해 주세요." : ""}
        </p>
      )}
      <button
        disabled={busy || loading || disabled}
        onClick={() => setReload((v) => v + 1)}
        className="rounded border p-2"
      >
        운영 기록 다시 조회
      </button>
      {loading && <p>조회 중…</p>}
      {data && (
        <>
          <p>
            순모금 {Number(data.totals.netAmount).toLocaleString()}원 · 누적
            환급 {Number(data.totals.refundedAmount).toLocaleString()}원 · 철회{" "}
            {data.totals.withdrawnCount}명
          </p>
          <p>
            모금 확인:{" "}
            {(
              {
                pending: "미확인",
                met: "목표 도달 확인",
                not_met: "목표 미달 확인",
              } as Record<string, string>
            )[data.trial.offlineState.decision ?? "pending"] ?? "미확인"}
            {data.trial.offlineState.reason
              ? ` · ${data.trial.offlineState.reason}`
              : ""}
          </p>
          <div className="space-y-2">
            {data.participants.map((p) => (
              <div
                key={p.id}
                className="rounded border p-2 text-sm break-words"
              >
                <strong>{p.name}</strong> · 입금 {p.paidAmount ?? "미등록"}원 ·
                약정 {p.contributionAmount}원 · 환급{" "}
                {p.paymentStatus === "refunded" && !p.offlineState.refundedAt
                  ? "기존 완료 상태 · 금액 미등록"
                  : `${p.offlineState.refundAmount ?? 0}원`}{" "}
                · {p.offlineState.withdrawn ? "철회" : "참여 유지"} · 사후 환급
                확인 {p.refundPending}원
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              disabled={busy || disabled || page === 1}
              onClick={() => {
                setTarget("");
                setPage((v) => v - 1);
              }}
            >
              이전 참여자
            </button>
            <span>{page}쪽</span>
            <button
              disabled={busy || disabled || !data.hasMore}
              onClick={() => {
                setTarget("");
                setPage((v) => v + 1);
              }}
            >
              다음 참여자
            </button>
          </div>
          <fieldset disabled={busy || disabled} className="grid gap-3">
            <label>
              처리 종류
              <select
                aria-label="오프라인 처리 종류"
                className="block w-full border p-2"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setTarget("");
                }}
              >
                {data.trial.status === "recruiting" && (
                  <option value="result">{labels.result}</option>
                )}
                {["recruiting", "development", "outcome_confirming"].includes(
                  data.trial.status,
                ) && <option value="stop">{labels.stop}</option>}
                {["withdraw", "refund", "pledge"].map((v) => (
                  <option value={v} key={v}>
                    {labels[v]}
                  </option>
                ))}
              </select>
            </label>
            {action === "result" && (
              <label>
                목표 확인
                <select
                  aria-label="목표 확인"
                  className="block border p-2"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                >
                  <option value="met">목표 도달 확인 후 진행</option>
                  <option value="not_met">목표 미달 확인 후 종료</option>
                </select>
              </label>
            )}
            {["withdraw", "refund", "pledge"].includes(action) && (
              <label>
                참여자
                <select
                  aria-label="사후 처리 참여자"
                  className="block w-full border p-2"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    setAmount("");
                  }}
                >
                  <option value="">선택</option>
                  {data.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.id}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {["refund", "pledge"].includes(action) && (
              <label>
                {action === "refund" ? "누적 환급액" : "약정 참여금액"}
                <input
                  aria-label="기록 금액"
                  className="block w-full border p-2"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                />
              </label>
            )}
            {action === "refund" && (
              <label>
                실제 환급 처리일
                <input
                  aria-label="환급 처리일"
                  type="datetime-local"
                  className="block w-full border p-2"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            )}
            <label>
              처리·정정 사유
              <textarea
                aria-label="오프라인 처리 사유"
                maxLength={2000}
                className="block w-full border p-2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p className="text-xs">
              계좌번호·개인 연락처는 입력하지 마세요. 중지·철회는 실제 환급
              완료와 별도입니다.
            </p>
            <button
              className="rounded bg-blue-700 p-2 text-white"
              disabled={!reason.trim()}
              onClick={() => void save()}
            >
              {busy ? "저장 중…" : "오프라인 처리 기록 저장"}
            </button>
          </fieldset>
          <h3 className="font-semibold">최근 처리 이력 (최대 30건)</h3>
          {!data.history?.length && <p>조회된 이력이 없습니다.</p>}
          {data.history?.map((h) => (
            <div key={h.id} className="rounded border p-2 text-sm break-words">
              <p>
                {labels[h.action] ?? h.action} ·{" "}
                {new Date(h.at).toLocaleString("ko-KR")} · 처리자 {h.actorId}
              </p>
              <p>
                {h.participantId ? `참여 기록 ${h.participantId}` : "펀딩 전체"}{" "}
                · {h.reason}
              </p>
              {h.after.refundAmount != null && (
                <p>누적 환급 {h.after.refundAmount}원</p>
              )}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
