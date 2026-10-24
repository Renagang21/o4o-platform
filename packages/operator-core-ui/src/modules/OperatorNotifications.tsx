import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
interface Client {
  get(path: string): Promise<{ data: any }>;
  post(path: string, body: { notificationIds: string[] }): Promise<unknown>;
}
const changed = "o4o:operator-notifications-read";
interface Notice {
  id: string;
  title: string;
  message?: string;
  isRead: boolean;
  metadata?: { targetUrl?: unknown };
  createdAt: string;
}
export function OperatorNotificationLink({
  client,
  serviceKey,
  href,
  title,
}: {
  client: Client;
  serviceKey: string;
  href: string;
  title: string;
}) {
  const scope = `serviceKey=${encodeURIComponent(serviceKey)}`;
  const [count, setCount] = useState<number | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let live = true,
      running = false;
    const load = async () => {
      if (running) {
        return;
      }
      running = true;
      try {
        const r = await client.get(`/notifications/unread-count?${scope}`);
        const next = r.data.data?.count;
        if (!Number.isInteger(next) || next < 0) throw Error("Invalid count");
        if (live) {
          setCount(next);
          setError(false);
        }
      } catch {
        if (live) setError(true);
      } finally {
        running = false;
      }
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    window.addEventListener(changed, load);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener(changed, load);
    };
  }, [client, scope]);
  return (
    <Link to={href} aria-label={title}>
      {title}
      {error
        ? " · 확인 필요"
        : count === null
          ? " · 확인 중"
          : count > 0
            ? ` · ${count}`
            : ""}
    </Link>
  );
}
export function OperatorNotifications({
  client,
  serviceKey,
  title,
  resolveTarget,
}: {
  client: Client;
  serviceKey: string;
  title: string;
  resolveTarget: (value: unknown) => string | null;
}) {
  const scope = `serviceKey=${encodeURIComponent(serviceKey)}`;
  const [rows, setRows] = useState<Notice[] | null>(null),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  const live = useRef(false),
    writing = useRef(false);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setError("");
    setRows(null);
    client
      .get(`/notifications?${scope}&page=${page}&limit=20`)
      .then((r) => {
        const data = r.data.data;
        if (!Array.isArray(data?.notifications))
          throw Error("Invalid notifications");
        if (active) {
          setRows(data.notifications);
          setPages(Math.max(1, Number(data.totalPages) || 1));
        }
      })
      .catch(() => {
        if (active) setError("알림을 불러오지 못했습니다. 다시 시도해 주세요.");
      });
    return () => {
      active = false;
    };
  }, [client, scope, page, version]);
  const read = async (id: string) => {
    if (writing.current) {
      return;
    }
    writing.current = true;
    setBusy(id);
    setError("");
    try {
      await client.post("/notifications/read", { notificationIds: [id] });
      if (live.current) {
        setRows(
          (current) =>
            current?.map((row) =>
              row.id === id ? { ...row, isRead: true } : row,
            ) ?? null,
        );
        window.dispatchEvent(new Event(changed));
      }
    } catch {
      if (live.current)
        setError("읽음 표시를 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      writing.current = false;
      if (live.current) setBusy(null);
    }
  };
  return (
    <section className="section">
      <h1>{title}</h1>
      <p>
        담당 공간의 알림입니다. 알림의 읽음 표시는 업무 처리 상태를 바꾸지
        않습니다.
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        onClick={() => setVersion((v) => v + 1)}
        disabled={busy !== null}
      >
        알림 다시 확인
      </button>
      {rows === null && !error && (
        <p role="status">알림을 불러오는 중입니다.</p>
      )}
      {rows?.length === 0 && <p>알림이 없습니다.</p>}
      <ul>
        {rows?.map((row) => {
          const target = resolveTarget(row.metadata?.targetUrl);
          return (
            <li
              key={row.id}
              style={{ padding: "16px 0", overflowWrap: "anywhere" }}
            >
              <h2>
                {row.title}
                {row.isRead ? "" : " · 새 알림"}
              </h2>
              <p>{row.message}</p>
              {target &&
                (target.startsWith("/") ? (
                  <Link to={target}>업무 확인</Link>
                ) : (
                  <a href={target}>업무 확인</a>
                ))}{" "}
              {!row.isRead && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void read(row.id)}
                >
                  {busy === row.id ? "저장 중…" : "읽음 표시"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <nav aria-label="알림 페이지">
          <button
            disabled={page === 1 || busy !== null}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </button>{" "}
          {page} / {pages}{" "}
          <button
            disabled={page >= pages || busy !== null}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </button>
        </nav>
      )}
    </section>
  );
}
