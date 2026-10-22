import { useCallback, useEffect, useRef, useState } from "react";

export interface InboxClient {
  get(url: string): Promise<{ data: { data: any } }>;
  patch(url: string, body: unknown): Promise<{ data: { data: any } }>;
}
interface Task {
  key: string;
  label: string;
  href: string;
  count: number | null;
  oldest: string | null;
  available: boolean;
}
interface Summary {
  name: string;
  contact: {
    pending: number;
    oldest: string | null;
    deliveryAttention: number;
  };
  tasks: Task[];
}
interface Contact {
  id: string;
  subject: string;
  status: string;
  notificationStatus: string | null;
  createdAt: string;
  version: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  internalNote?: string;
  history?: {
    action: string;
    at: string;
    beforeStatus: string;
    afterStatus: string;
  }[];
}
const labels: Record<string, string> = {
  received: "접수",
  in_review: "확인 중",
  answered: "답변 완료",
  closed: "종료",
  spam: "스팸",
};
const panel = {
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  padding: 16,
  marginBlock: 16,
  overflowWrap: "anywhere" as const,
};
const control = {
  minHeight: 44,
  padding: 8,
  border: "1px solid #94a3b8",
  borderRadius: 6,
  maxWidth: "100%",
};
const oldest = (value: string | null) =>
  value
    ? `가장 오래된 접수: ${new Date(value).toLocaleDateString("ko-KR")}`
    : "";

/** Host must key by current account and scope. All work remains in its own service/organization. */
export function OperatorInbox({
  client,
  endpoint,
  title = "운영 알림·문의함",
}: {
  client: InboxClient;
  endpoint: string;
  title?: string;
}) {
  const [summary, setSummary] = useState<Summary | null>(null),
    [items, setItems] = useState<Contact[]>([]);
  const [page, setPage] = useState(1),
    [pages, setPages] = useState(0),
    [filter, setFilter] = useState("open");
  const [detail, setDetail] = useState<Contact | null>(null),
    [status, setStatus] = useState("received"),
    [note, setNote] = useState("");
  const [error, setError] = useState(""),
    [detailError, setDetailError] = useState(""),
    [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false),
    [detailLoading, setDetailLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const lifecycle = useRef({ alive: true, list: 0, detail: 0, writing: false });
  useEffect(() => {
    const state = { alive: true, list: 0, detail: 0, writing: false };
    lifecycle.current = state;
    return () => {
      state.alive = false;
      state.list++;
      state.detail++;
    };
  }, [endpoint, client]);
  const load = useCallback(async () => {
    const state = lifecycle.current,
      seq = ++state.list;
    setLoading(true);
    setError("");
    try {
      const [s, list] = await Promise.all([
        client.get(`${endpoint}/manage`),
        client.get(`${endpoint}/manage/contacts?page=${page}&status=${filter}`),
      ]);
      if (!state.alive || seq !== state.list) return false;
      setSummary(s.data.data);
      setItems(list.data.data.items);
      setPages(list.data.data.totalPages);
      return true;
    } catch {
      if (state.alive && seq === state.list)
        setError("운영 정보를 불러오지 못했습니다.");
      return false;
    } finally {
      if (state.alive && seq === state.list) setLoading(false);
    }
  }, [client, endpoint, page, filter]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (!lifecycle.current.writing) void load();
    }, 60000);
    return () => clearInterval(timer);
  }, [load]);
  async function open(id: string) {
    const state = lifecycle.current;
    if (state.writing) return;
    const seq = ++state.detail;
    setDetail(null);
    setDetailError("");
    setNotice("");
    setDetailLoading(true);
    try {
      const r = await client.get(
        `${endpoint}/manage/contacts/${encodeURIComponent(id)}`,
      );
      if (!state.alive || seq !== state.detail) return;
      setDetail(r.data.data);
      setStatus(r.data.data.status);
      setNote(r.data.data.internalNote ?? "");
    } catch {
      if (state.alive && seq === state.detail)
        setDetailError(
          "문의 상세를 불러오지 못했습니다. 목록에서 다시 선택해 주세요.",
        );
    } finally {
      if (state.alive && seq === state.detail) setDetailLoading(false);
    }
  }
  async function save() {
    const state = lifecycle.current;
    if (
      state.writing ||
      !detail ||
      (detail.status === status &&
        (detail.internalNote ?? " ").trim() === note.trim())
    )
      return;
    state.writing = true;
    setBusy(true);
    setDetailError("");
    setNotice("");
    try {
      const r = await client.patch(
        `${endpoint}/manage/contacts/${encodeURIComponent(detail.id)}`,
        { status, internalNote: note, expectedUpdatedAt: detail.version },
      );
      if (!state.alive) return;
      setDetail({ ...r.data.data, history: detail.history });
      setNotice(
        (await load())
          ? "문의 처리 내용을 저장했습니다."
          : "저장은 완료됐지만 목록을 갱신하지 못했습니다. 다시 저장하지 말고 목록을 새로고침해 주세요.",
      );
    } catch (e) {
      if (state.alive)
        setDetailError(
          (e as { response?: { status?: number } })?.response?.status === 409
            ? "다른 운영자가 수정했거나 권한이 변경됐습니다. 입력은 유지됩니다. 현재 문의를 다시 열어 확인해 주세요."
            : "저장하지 못했습니다. 입력은 유지됩니다. 다시 시도해 주세요.",
        );
    } finally {
      state.writing = false;
      if (state.alive) setBusy(false);
    }
  }
  return (
    <section
      style={{ maxWidth: 1100, margin: "0 auto", padding: 16, minWidth: 0 }}
      aria-label={title}
    >
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>{title}</h1>
      <p>
        미처리 업무는 실제 기록에서 조회합니다. 알림을 확인해도 처리 완료로
        바뀌지 않습니다. 1분마다 갱신합니다.
      </p>
      <button
        style={control}
        disabled={busy || loading}
        onClick={() => void load()}
      >
        새로고침
      </button>
      {error && (
        <p role="alert">{error} 이전 결과는 최신 상태가 아닐 수 있습니다.</p>
      )}
      {summary && (
        <div style={panel}>
          <h2>{summary.name} 미처리 업무</h2>
          <p>
            미처리 문의 {summary.contact.pending}건 · 알림 전달 확인 필요{" "}
            {summary.contact.deliveryAttention}건
          </p>
          <p>{oldest(summary.contact.oldest)}</p>
          <ul>
            {summary.tasks.map((t) => (
              <li key={t.key} style={{ marginBlock: 12 }}>
                <a href={t.href}>{t.label}</a>:{" "}
                {t.available ? `${t.count}건` : "조회 실패 — 확인 필요"}{" "}
                {oldest(t.oldest)}
              </li>
            ))}
          </ul>
          <p>
            전달 확인 필요에는 수신자 없음·실패·일부 실패·전달 상태 미확인이
            포함됩니다. 이메일 재발송은 실행하지 않습니다.
          </p>
        </div>
      )}
      <div style={panel}>
        <h2>문의 목록</h2>
        <label>
          문의 목록 상태{" "}
          <select
            style={control}
            aria-label="문의 목록 상태"
            value={filter}
            disabled={busy}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="open">미처리</option>
            <option value="">전체</option>
            {Object.entries(labels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {loading && <p role="status">불러오는 중…</p>}
        {!loading && !error && items.length === 0 && (
          <p>해당 상태의 문의가 없습니다.</p>
        )}
        <ul>
          {items.map((c) => (
            <li key={c.id} style={{ marginBlock: 12 }}>
              <button
                style={control}
                disabled={busy}
                onClick={() => void open(c.id)}
              >
                {c.subject}
              </button>{" "}
              · {labels[c.status]} ·{" "}
              {new Date(c.createdAt).toLocaleDateString("ko-KR")} ·{" "}
              {c.notificationStatus || "알림 상태 미확인"}
            </li>
          ))}
        </ul>
        <nav aria-label="문의 페이지">
          <button
            style={control}
            disabled={busy || loading || page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </button>{" "}
          {page} / {Math.max(1, pages)}{" "}
          <button
            style={control}
            disabled={busy || loading || page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </button>
        </nav>
      </div>
      {detailLoading && <p role="status">문의 상세를 불러오는 중…</p>}
      {detailError && <p role="alert">{detailError}</p>}
      {notice && <p role="status">{notice}</p>}
      {detail && (
        <form
          style={panel}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h2>{detail.subject}</h2>
          <p>
            {detail.name} · {detail.email} {detail.phone}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{detail.message}</p>
          <label>
            문의 처리 상태{" "}
            <select
              style={control}
              aria-label="문의 처리 상태"
              value={status}
              disabled={busy}
              onChange={(e) => setStatus(e.target.value)}
            >
              {Object.entries(labels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "block", marginBlock: 12 }}>
            내부 메모
            <textarea
              style={{
                ...control,
                display: "block",
                width: "100%",
                boxSizing: "border-box",
              }}
              value={note}
              disabled={busy}
              maxLength={5000}
              aria-label="내부 메모"
              rows={5}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {detail.history && (
            <ul aria-label="문의 처리 이력">
              {detail.history.map((h, i) => (
                <li key={i}>
                  {new Date(h.at).toLocaleString("ko-KR")} ·{" "}
                  {labels[h.beforeStatus] ?? h.beforeStatus} →{" "}
                  {labels[h.afterStatus] ?? h.afterStatus}
                </li>
              ))}
            </ul>
          )}
          <p>
            내부 처리 기록입니다. 문의자에게 답변 이메일을 발송하지 않습니다.
          </p>
          <button
            style={control}
            disabled={
              busy ||
              detailLoading ||
              (detail.status === status && (detail.internalNote ?? "") === note)
            }
            type="submit"
          >
            {busy ? "저장 중…" : "처리 내용 저장"}
          </button>
        </form>
      )}
    </section>
  );
}

/** Persistent work indicator; failures are visible rather than converted to a zero badge. */
export function OperatorInboxLink({
  client,
  endpoint,
  href,
  requireAccess = false,
}: {
  client: Pick<InboxClient, "get">;
  endpoint: string;
  href: string;
  requireAccess?: boolean;
}) {
  const [state, setState] = useState<"loading" | "pending" | "clear" | "error" | "denied">(
    "loading",
  );
  useEffect(() => {
    let active = true;
    let running = false;
    setState("loading");
    const load = async () => {
      if (running) return;
      running = true;
      try {
        const r = await client.get(`${endpoint}/manage`);
        if (active) {
          const s = r.data.data as Summary;
          setState(
            s.tasks.some((t) => !t.available)
              ? "error"
              : s.contact.pending > 0 || s.tasks.some((t) => (t.count ?? 0) > 0)
                ? "pending"
                : "clear",
          );
        }
      } catch (error) {
        const status=(error as {response?:{status?:number}})?.response?.status;
        if (active) setState(requireAccess && status && [401,403,404].includes(status) ? "denied" : "error");
      } finally {
        running = false;
      }
    };
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [client, endpoint, requireAccess]);
  if (requireAccess && (state === "loading" || state === "denied")) return null;
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        maxWidth: "100%",
        overflowWrap: "anywhere",
        padding: 8,
        fontSize: 13,
      }}
      aria-label={`운영 알림·문의함${state === "pending" ? " — 미처리 업무 있음" : state === "error" ? " — 조회 확인 필요" : ""}`}
    >
      운영 알림·문의함
      {state === "pending" ? " ●" : state === "error" ? " · 확인 필요" : ""}
    </a>
  );
}
