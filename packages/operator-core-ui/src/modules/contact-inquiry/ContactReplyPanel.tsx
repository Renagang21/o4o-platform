import { useEffect, useRef, useState } from "react";
import type { ContactInquiryApi, ContactReply } from "./types";

/** Scoped to a single inquiry. A failed/uncertain send is never presented as an answered inquiry. */
export function ContactReplyPanel({
  api,
  serviceKey,
  contactId,
  onSent,
}: {
  onSent?: () => void;
  api: ContactInquiryApi;
  serviceKey: string;
  contactId: string;
}) {
  const [history, setHistory] = useState<ContactReply[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const sending = useRef(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const current = ++generation.current;
    setError("");
    setNotice("");
    setUncertain(true);
    setHistory([]);
    api
      .getReplies?.(serviceKey, contactId)
      .then((rows) => {
        if (!Array.isArray(rows)) throw new Error("Invalid reply history");
        if (current === generation.current) {
          setHistory(rows);
          setUncertain(rows.some((row) => row.status === "sending"));
        }
      })
      .catch(() => {
        if (current === generation.current)
          setError("답변 이력을 불러오지 못했습니다.");
      });
    return () => {
      generation.current++;
    };
  }, [api, serviceKey, contactId, revision]);
  const send = async () => {
    if (uncertain || sending.current || !api.sendReply || !text.trim()) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const current = generation.current;
    try {
      const result = await api.sendReply(serviceKey, contactId, {
        requestId: crypto.randomUUID(),
        message: text.trim(),
      });
      if (current !== generation.current) return;
      if (result.status === "sent") {
        onSent?.();
        setNotice("답변을 발송했습니다.");
        setText("");
      } else if (result.status === "failed")
        setError(
          "답변을 발송하지 못했습니다. 메일 설정을 확인한 뒤 다시 보내 주세요.",
        );
      else {
        setUncertain(true);
        setError(
          "발송 결과를 확인 중입니다. 이력을 확인하고, 같은 답변을 다시 보내지 마세요.",
        );
      }
      try {
        const rows = await api.getReplies?.(serviceKey, contactId);
        if (current === generation.current && Array.isArray(rows))
          setHistory(rows);
      } catch {
        if (current === generation.current)
          setError("답변 이력을 갱신하지 못했습니다. 다시 확인해 주세요.");
      }
    } catch (failure) {
      if (current === generation.current) {
        setUncertain(true);
        const code = (
          failure as { response?: { data?: { error?: { code?: string } } } }
        )?.response?.data?.error?.code;
        setError(
          code === "REPLY_IN_PROGRESS"
            ? "다른 답변의 발송 결과를 확인 중입니다. 답변 이력을 다시 확인해 주세요."
            : "발송 결과를 확인하지 못했습니다. 답변 이력을 다시 확인해 주세요.",
        );
      }
    } finally {
      sending.current = false;
      if (current === generation.current) setBusy(false);
    }
  };
  if (!api.sendReply) return null;
  return (
    <section aria-label="문의자에게 답변" className="my-4 rounded border p-3">
      <h3 className="font-semibold">문의자에게 이메일 답변</h3>
      <p className="my-2 text-sm">
        자동 접수 확인과 별도로 문의자의 이메일에 답변을 보냅니다.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <ul aria-label="답변 이력">
        {history.map((reply) => (
          <li
            key={reply.id}
            className="my-2 whitespace-pre-wrap break-words text-sm"
          >
            <strong>
              {reply.status === "sent"
                ? "발송 완료"
                : reply.status === "failed"
                  ? "발송 실패"
                  : "발송 결과 확인 중"}
            </strong>{" "}
            · {new Date(reply.createdAt).toLocaleString()}
            <p>{reply.message}</p>
          </li>
        ))}
      </ul>
      <textarea
        aria-label="이메일 답변 내용"
        className="w-full rounded border p-2"
        rows={5}
        maxLength={5000}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || uncertain || !text.trim()}
          onClick={() => void send()}
        >
          {busy ? "발송 중…" : "답변 보내기"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          답변 이력 다시 확인
        </button>
        {api.retryNotifications && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api.retryNotifications!(serviceKey, contactId);
                setNotice(
                  "알림 재처리 후 문의 상세를 다시 열어 결과를 확인해 주세요.",
                );
              } catch (failure) {
                const code = (
                  failure as {
                    response?: { data?: { error?: { code?: string } } };
                  }
                )?.response?.data?.error?.code;
                setError(
                  code === "NOTIFICATION_IN_PROGRESS"
                    ? "접수 알림의 발송 결과를 확인 중입니다. 문의 상세를 다시 확인해 주세요."
                    : "알림을 재처리하지 못했습니다.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            접수 알림 재처리
          </button>
        )}
      </div>
    </section>
  );
}
