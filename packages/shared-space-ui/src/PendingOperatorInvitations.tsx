import { useEffect, useRef, useState } from "react";
interface InvitationClient { get(path: string): Promise<{data: any}>; post(path: string,body?: unknown): Promise<{data: any}>; }
type Row = {
  id: string;
  invited_email: string;
  role: string;
  expires_at: string;
};
/** Only pending, scoped delivery data is displayed; terminal personal data is erased server-side. */
export function PendingOperatorInvitations({
  client,
  kind,
  scope,
  role = "operator",
  version = 0,
}: {
  client: InvitationClient;
  kind: "service" | "branch" | "cooperative";
  scope: string;
  role?: "admin" | "operator";
  version?: number;
}) {
  const [rows, setRows] = useState<Row[] | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  const generation = useRef(0),
    lock = useRef(false);
  const path = `/service-operator-invitations/scopes/${kind}/${encodeURIComponent(scope)}?role=${role}`;
  useEffect(() => {
    const ticket = ++generation.current;
    setRows(null);
    setError("");
    setBusy(false);
    lock.current = false;
    client
      .get(path)
      .then((r) => {
        if (!Array.isArray(r.data.data))
          throw new Error("Invalid pending list");
        if (ticket === generation.current) setRows(r.data.data);
      })
      .catch(() => {
        if (ticket === generation.current)
          setError("초대 대기 목록을 불러오지 못했습니다.");
      });
    return () => {
      if (generation.current === ticket) generation.current = ticket + 1;
    };
  }, [client, path, revision, version]);
  async function change(id: string, action: "resend" | "cancel") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const ticket = generation.current;
    try {
      await client.post(
        `/service-operator-invitations/manage/${encodeURIComponent(id)}/${action}`,
        {},
      );
      if (ticket === generation.current) setRevision((v) => v + 1);
    } catch {
      if (ticket === generation.current)
        setError(
          "초대 처리에 실패했습니다. 새로고침해 현재 상태를 확인하세요.",
        );
    } finally {
      if (ticket === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <section aria-label="운영자 초대 대기" className="mt-4 space-y-2">
      <h3>수락 대기 중인 운영자 초대</h3>
      <p>본인 수락 후 권한이 활성화됩니다. 기존 운영자의 권한은 유지됩니다.</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => setRevision((v) => v + 1)}
      >
        초대 목록 새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      {rows === null ? (
        <p>목록 확인 중</p>
      ) : rows.length === 0 ? (
        <p>대기 중인 초대가 없습니다.</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap gap-2 py-2">
              <span className="break-all">{r.invited_email}</span>
              <span>
                {new Date(r.expires_at).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}
                까지
              </span>
              <button
                disabled={busy}
                type="button"
                onClick={() => void change(r.id, "resend")}
              >
                재발송
              </button>
              <button
                disabled={busy}
                type="button"
                onClick={() => void change(r.id, "cancel")}
              >
                초대 취소
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
