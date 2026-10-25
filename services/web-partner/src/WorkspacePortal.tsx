import { useEffect, useRef, useState, type FormEvent } from "react";
import App from "./App";
import {
  partnerApi,
  ApiError,
  type AuditEvent,
  type Notification,
  type Invitation,
  type Member,
  type ServerSpace,
  type SpaceRole,
  type SpaceSummary,
} from "./api";
import { parseWorkspace, type Workspace } from "./model";

const roleNames: Record<SpaceRole, string> = {
  owner: "소유자",
  editor: "편집자",
  viewer: "열람자",
};
const eventNames: Record<string, string> = {
  space_created: "공동공간 생성",
  workspace_saved: "자료 저장",
  invite_created: "초대 생성",
  invite_revoked: "초대 취소",
  member_joined: "참여자 합류",
  member_removed: "참여자 제외",
};

export default function WorkspacePortal() {
  const [mode, setMode] = useState<"local" | "server">(() =>
    new URLSearchParams(location.search).get("mode") === "local"
      ? "local"
      : "server",
  );
  const [user, setUser] = useState<{
    id: string;
    name?: string;
    displayName?: string;
  } | null>(null);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [selected, setSelected] = useState<ServerSpace | null>(null);
  const snapshot = useRef<ServerSpace | null>(null);
  const busyRef = useRef(false);
  const [epoch, setEpoch] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [manage, setManage] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]),
    [showNotifications, setShowNotifications] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [joinToken, setJoinToken] = useState("");
  useEffect(() => {
    const capture = () => {
      const match = location.hash.match(/^#join=([a-f0-9]{64})$/);
      if (!match) return;
      setJoinToken(match[1]);
      setMode("server");
      const clean = new URL(location.href);
      clean.searchParams.delete("mode");
      history.replaceState(null, "", `${clean.pathname}${clean.search}#home`);
    };
    capture();
    window.addEventListener("hashchange", capture);
    return () => window.removeEventListener("hashchange", capture);
  }, []);
  const run = async (work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setNotifications([]);
        setShowNotifications(false);
        setSpaces([]);
        setMembers([]);
        setEvents([]);
        setInvites([]);
        setManage(false);
        setUser(null);
        setSelected(null);
        snapshot.current = null;
        setInviteLink("");
      }
      if (e instanceof ApiError && e.code === "SPACE_NOT_FOUND") {
        setSelected(null);
        snapshot.current = null;
        setManage(false);
        setInviteLink("");
        setMembers([]);
        setInvites([]);
        setEvents([]);
      }
      setError(e instanceof Error ? e.message : "요청을 처리하지 못했습니다.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const connect = async () => {
    const u = await partnerApi.me();
    setUser(u);
    setSpaces(await partnerApi.list());
  };
  useEffect(() => {
    if (mode === "server")
      void run(async () => {
        try {
          await connect();
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) return;
          throw e;
        }
      });
    // Each explicit mode entry revalidates the cookie session. No login mutation on mount.
  }, [mode]);
  const choose = async (id: string) => {
    const s = await partnerApi.load(id);
    snapshot.current = s;
    setSelected(s);
    setEpoch((n) => n + 1);
    setManage(false);
    setInviteLink("");
  };
  const save = async (workspace: Workspace): Promise<Workspace> => {
    const s = snapshot.current;
    if (!s) throw new Error("공동공간을 다시 선택해 주세요.");
    if (busyRef.current)
      throw new Error("서버 요청이 처리 중입니다. 잠시 기다려 주세요.");
    busyRef.current = true;
    setBusy(true);
    try {
      const updated = await partnerApi.save(s.id, s.revision, workspace);
      if (snapshot.current?.id === s.id) {
        snapshot.current = updated;
        setSelected(updated);
      }
      return updated.workspace;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const refreshManagement = async () => {
    const s = snapshot.current;
    if (!s) return;
    const results = await Promise.all([
      partnerApi.members(s.id),
      ...(s.role === "owner"
        ? [partnerApi.invites(s.id), partnerApi.events(s.id)]
        : []),
    ]);
    setMembers(results[0] as Member[]);
    setInvites((results[1] || []) as Invitation[]);
    setEvents((results[2] || []) as AuditEvent[]);
  };
  const form =
    (fn: (f: FormData) => Promise<void>) => (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      void run(() => fn(f));
    };
  const toolbar = (
    <div className="connection-toolbar">
      <span>
        <strong>O4O Partner</strong> ·{" "}
        {mode === "local" ? "브라우저 작업공간" : "서버 공동공간"}
      </span>
      <div className="button-row">
        {mode === "server" && user && (
          <button
            className="button quiet"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                setNotifications(await partnerApi.notifications());
                setShowNotifications(!showNotifications);
              })
            }
          >
            공동공간 알림
          </button>
        )}
        <button
          className="button quiet"
          onClick={() => {
            const next = mode === "local" ? "server" : "local";
            const url = new URL(location.href);
            if (next === "local") url.searchParams.set("mode", "local");
            else url.searchParams.delete("mode");
            history.replaceState(
              null,
              "",
              `${url.pathname}${url.search}${url.hash}`,
            );
            setMode(next);
            setInviteLink("");
            setError("");
          }}
        >
          {mode === "local" ? "서버 공동공간 연결" : "로컬 도구 이용"}
        </button>
        {mode === "server" && user && (
          <button
            className="button quiet"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await partnerApi.logout();
                setUser(null);
                setSelected(null);
                snapshot.current = null;
                setSpaces([]);
                setInviteLink("");
                setMembers([]);
                setEvents([]);
                setInvites([]);
                setNotifications([]);
                setShowNotifications(false);
              })
            }
          >
            로그아웃
          </button>
        )}
      </div>
    </div>
  );

  if (mode === "local")
    return (
      <>
        {toolbar}
        <App />
      </>
    );
  return (
    <>
      {toolbar}
      <section className="server-console" aria-label="서버 공동공간">
        {showNotifications && user && (
          <div className="panel">
            <h2>공동공간 변경 알림</h2>
            <p className="hint">
              다른 참여자가 자료·파일·활동을 변경하면 확인할 수 있습니다. 본인이
              만든 변경은 제외합니다.
            </p>
            {notifications.map((n) => (
              <div className="notification-row" key={n.id} data-space-id={n.id}>
                <span>
                  {n.name} · 새 변경 {n.unread}건
                </span>
                <div className="button-row">
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => void run(() => choose(n.id))}
                  >
                    공간 열기
                  </button>
                  <button
                    className="text-button"
                    disabled={busy || !n.unread}
                    onClick={() =>
                      void run(async () => {
                        await partnerApi.markRead(n.id, n.cursor);
                        setNotifications(await partnerApi.notifications());
                      })
                    }
                  >
                    읽음으로 표시
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && (
          <p className="message failure" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="message success" role="status">
            {message}
          </p>
        )}
        {busy && (
          <p className="hint" role="status">
            서버에서 처리 중입니다…
          </p>
        )}
        {!user ? (
          <div className="server-welcome">
            <div>
              <p className="eyebrow">YOUR SHARED PARTNER SPACE</p>
              <h1>
                함께 쓸 자료는
                <br />
                공동공간에 모으세요.
              </h1>
              <p>
                기존 O4O 계정으로 로그인하고 필요한 사람을 초대하세요.
                <br />
                자료는 공동공간별로 분리하고, 참여 권한은 소유자가 관리합니다.
              </p>
              <p className="hint">
                협의·계약은 당사자가 자율적으로 진행합니다. O4O는 자료와 홍보
                도구를 제공합니다.
              </p>
              <a href="https://neture.co.kr" className="text-button">
                O4O 가입·계정 안내 ↗
              </a>
            </div>
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                const el = e.currentTarget,
                  f = new FormData(el);
                const email = String(f.get("email") || ""),
                  password = String(f.get("password") || "");
                (el.elements.namedItem("password") as HTMLInputElement).value =
                  "";
                void run(async () => {
                  await partnerApi.login(email, password);
                  await connect();
                });
              }}
            >
              <h2>O4O 계정 로그인</h2>
              <label className="field">
                이메일
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="field">
                비밀번호
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                로그인
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => void run(connect)}
              >
                기존 로그인 확인
              </button>
              <p className="hint">
                비밀번호는 기존 인증 API에만 전달하고 저장하지 않습니다. Google
                계정 이용자는 O4O 메인에서 로그인한 뒤 기존 로그인 확인을
                이용하세요.
              </p>
            </form>
          </div>
        ) : (
          <>
            <div className="space-selector">
              <div>
                <span className="eyebrow">
                  {user.displayName || user.name || "O4O 사용자"}님의 공동공간
                </span>
                <label className="field">
                  이용할 공동공간
                  <select
                    aria-label="이용할 공동공간"
                    value={selected?.id || ""}
                    disabled={busy}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id) void run(() => choose(id));
                    }}
                  >
                    <option value="" disabled>
                      공동공간 선택
                    </option>
                    {spaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {roleNames[s.role]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setSpaces(await partnerApi.list());
                    if (selected) await choose(selected.id);
                  })
                }
              >
                서버 자료 다시 불러오기
              </button>
              {selected && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await refreshManagement();
                      setManage(!manage);
                    })
                  }
                >
                  공동공간 관리
                </button>
              )}
            </div>
            {!selected && (
              <p className="hint">
                새 공동공간을 만들거나 초대 링크를 이용해 참여하세요.
              </p>
            )}
            <details className="space-actions" open={!selected}>
              <summary>공동공간 만들기 · 초대로 참여하기</summary>
              <div className="server-forms">
                <form
                  onSubmit={form(async (f) => {
                    const s = await partnerApi.create(
                      String(f.get("name") || "").trim(),
                    );
                    setSpaces(await partnerApi.list());
                    await choose(s.id);
                  })}
                >
                  <label className="field">
                    새 공동공간 이름
                    <input
                      name="name"
                      required
                      maxLength={250}
                      placeholder="브랜드 자료실 · 프로젝트 이름"
                    />
                  </label>
                  <button className="button primary" disabled={busy}>
                    공동공간 만들기
                  </button>
                </form>
                <form
                  onSubmit={form(async () => {
                    const s = await partnerApi.join(joinToken.trim());
                    setJoinToken("");
                    setSpaces(await partnerApi.list());
                    await choose(s.id);
                  })}
                >
                  <label className="field">
                    초대 코드
                    <input
                      value={joinToken}
                      onChange={(e) => setJoinToken(e.target.value)}
                      required
                      pattern="[a-f0-9]{64}"
                      autoComplete="off"
                    />
                  </label>
                  <button className="button secondary" disabled={busy}>
                    초대로 참여하기
                  </button>
                  <p className="hint">
                    초대 링크는 로그인한 계정으로 한 번만 참여할 수 있고 7일 후
                    만료됩니다.
                  </p>
                </form>
              </div>
            </details>
            {manage && selected && (
              <div className="space-management panel">
                <h2>{selected.name} · 참여자와 변경 이력</h2>
                <p className="hint">
                  참여자는 이 공동공간의 자료·활동·정산 내역을 볼 수 있습니다.
                  편집자는 자료를 변경할 수 있지만 정산은 소유자만 기록합니다.
                  비공개 자료는 별도의 공동공간에 보관하세요.
                </p>
                <ul className="member-list">
                  {members.map((m) => (
                    <li key={m.id}>
                      <span>
                        {m.name} · {roleNames[m.role]}
                      </span>
                      {selected.role === "owner" && m.role !== "owner" && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            if (
                              confirm("이 참여자의 공동공간 접근을 해제할까요?")
                            )
                              void run(async () => {
                                await partnerApi.removeMember(
                                  selected.id,
                                  m.id,
                                );
                                await refreshManagement();
                              });
                          }}
                        >
                          접근 해제
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {selected.role === "owner" && (
                  <>
                    <label className="field">
                      JSON 백업으로 공동공간 자료 교체
                      <input
                        type="file"
                        accept=".json,application/json"
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0];
                          e.currentTarget.value = "";
                          if (!file) return;
                          void run(async () => {
                            if (file.size > 1024 * 1024)
                              throw new Error(
                                "백업 파일은 1MB 이내로 선택해 주세요.",
                              );
                            const data = parseWorkspace(await file.text());
                            if (
                              !confirm(
                                "현재 공동공간 자료를 이 백업으로 교체할까요? 기존 자료가 있다면 먼저 자료 백업을 내려받아 주세요. 정산 변경 이력은 유지됩니다.",
                              )
                            )
                              return;
                            const s = snapshot.current;
                            if (!s)
                              throw new Error("공동공간을 다시 선택해 주세요.");
                            const updated = await partnerApi.save(
                              s.id,
                              s.revision,
                              data,
                            );
                            snapshot.current = updated;
                            setSelected(updated);
                            setEpoch((n) => n + 1);
                            await refreshManagement();
                            setMessage("백업을 서버 공동공간에 저장했습니다.");
                          });
                        }}
                      />
                    </label>
                    <form
                      onSubmit={form(async (f) => {
                        const invite = await partnerApi.invite(
                          selected.id,
                          f.get("role") === "editor" ? "editor" : "viewer",
                        );
                        setInviteLink(
                          `${location.origin}${location.pathname}#join=${invite.token}`,
                        );
                        await refreshManagement();
                      })}
                    >
                      <div className="inline-fields">
                        <label className="field">
                          초대 권한
                          <select name="role" aria-label="초대 권한">
                            <option value="viewer">
                              열람자 · 자료와 정산 보기
                            </option>
                            <option value="editor">
                              편집자 · 자료 변경, 정산 열람
                            </option>
                          </select>
                        </label>
                        <button className="button primary" disabled={busy}>
                          일회용 초대 링크 만들기
                        </button>
                      </div>
                    </form>
                    {inviteLink && (
                      <div>
                        <label className="field">
                          새 초대 링크
                          <textarea
                            aria-label="새 초대 링크"
                            readOnly
                            value={inviteLink}
                            rows={3}
                          />
                        </label>
                        <p className="hint">
                          링크를 받은 계정이 참여할 수 있습니다. 신뢰할 수 있는
                          상대에게 직접 전달하세요. 원문 링크는 다시 조회할 수
                          없습니다.
                        </p>
                        <button
                          className="button secondary"
                          onClick={() =>
                            void run(async () => {
                              await navigator.clipboard.writeText(inviteLink);
                              setMessage("초대 링크를 복사했습니다.");
                            })
                          }
                        >
                          초대 링크 복사
                        </button>
                      </div>
                    )}
                    <h3>최근 초대</h3>
                    <ul className="member-list">
                      {invites.map((i) => (
                        <li key={i.id}>
                          <span>
                            {roleNames[i.role]} ·{" "}
                            {i.revoked_at
                              ? "취소됨"
                              : i.consumed_at
                                ? "사용됨"
                                : new Date(i.expires_at).getTime() < Date.now()
                                  ? "만료됨"
                                  : "사용 가능"}{" "}
                            ·{" "}
                            {new Date(i.expires_at).toLocaleDateString("ko-KR")}{" "}
                            만료
                          </span>
                          {!i.revoked_at && !i.consumed_at && (
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  await partnerApi.revoke(selected.id, i.id);
                                  await refreshManagement();
                                  setInviteLink("");
                                })
                              }
                            >
                              초대 취소
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    <h3>최근 변경 이력</h3>
                    <ul className="audit-list">
                      {events.map((e) => (
                        <li key={e.id}>
                          <strong>{eventNames[e.kind] || "자료 변경"}</strong>
                          <span>
                            버전 {e.revision} ·{" "}
                            {new Date(e.created_at).toLocaleString("ko-KR")}
                          </span>
                          {e.changes.settlements?.map((c) => (
                            <p key={c.id}>
                              정산 기록:{" "}
                              {c.before
                                ? `${c.before.amount.toLocaleString()}원 · ${c.before.status === "paid" ? "외부 지급 기록" : "미지급"}`
                                : "신규"}{" "}
                              →{" "}
                              {c.after
                                ? `${c.after.amount.toLocaleString()}원 · ${c.after.status === "paid" ? "외부 지급 기록" : "미지급"}`
                                : "삭제"}
                            </p>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </section>
      {selected && user && (
        <App
          key={`${selected.id}-${epoch}`}
          remote={{
            spaceId: selected.id,
            workspace: selected.workspace,
            role: selected.role,
            name: selected.name,
            save,
          }}
        />
      )}
    </>
  );
}
