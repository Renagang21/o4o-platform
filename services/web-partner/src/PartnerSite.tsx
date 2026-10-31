import { PARTNER_PUBLIC_NAV, PARTNER_OPERATOR_NAV } from "./config/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GlobalHeader } from "@o4o/ui";
import {
  PublicLegalFooterInfo,
  PolicyDocumentViewer,
} from "@o4o/shared-space-ui";
import { safeServiceReturnPath } from "@o4o/auth-utils";
import {
  PasswordInput,
  ServiceSpaceSwitcher,
  MyHomeButton,
  O4OHomeButton,
  ServiceAccountMenu,
  ServiceFooter,
} from "@o4o/auth-react";
import WorkspacePortal, {
  type WorkspaceSessionChange,
} from "./WorkspacePortal";
import { ApiError, partnerApi, request } from "./api";
import {
  communityApi,
  type CommunityBoard,
  type CommunityPolicy,
  type CommunityPost,
  type Membership,
} from "./community-api";
import CommunityOperator from "./CommunityOperator";

const navigationApi = {
  get: async (path: string) => ({
    data: { data: await request(`/api/v1${path}`) },
  }),
  post: async (path: string, body: unknown) => ({
    data: {
      data: await request<{ targetUrl?: string }>(
        `/api/v1${path}`,
        "POST",
        body,
      ),
    },
  }),
};
const loadPartnerLegal = async () =>
  request<import("@o4o/shared-space-ui").PublicLegalProfileDto | null>(
    "/api/v1/public/services/partner-support/footer-legal",
  );
async function loadPartnerPolicy(_key: string, type: string) {
  try {
    return await request<import("@o4o/shared-space-ui").PolicyDocumentDto>(
      `/api/v1/public/services/partner-support/policies/${type}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
export type Run = (work: () => Promise<void>) => Promise<void>;
export type PartnerUser = { id: string; name?: string; displayName?: string };
const resyncWorkspaceSession = (token?: string) => {
  const target =
    token && /^[a-f0-9]{64}$/.test(token)
      ? `/workspace#join=${token}`
      : "/workspace";
  window.history.replaceState(null, "", target);
  window.location.reload();
};
const date = (s: string) => new Date(s).toLocaleString("ko-KR");
export default function PartnerSite() {
  const nav = useNavigate(),
    location = useLocation();
  const [user, setUser] = useState<PartnerUser | null>(null),
    [membership, setMembership] = useState<Membership>({
      status: null,
      operator: false,
    });
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [boards, setBoards] = useState<CommunityBoard[]>([]),
    [policies, setPolicies] = useState<CommunityPolicy[]>([]),
    [password, setPassword] = useState("");
  const [policiesReady, setPoliciesReady] = useState(false);
  const running = useRef(false);
  const reloadMembership = async () => {
    setMembership(await communityApi.membership());
  };
  const run: Run = async (work) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setMembership({ status: null, operator: false });
      }
      setError(e instanceof Error ? e.message : "요청을 처리하지 못했습니다.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      communityApi.boards(),
      communityApi.policies(),
      partnerApi.me(),
    ]).then(async (results) => {
      if (!active) return;
      if (results[0].status === "fulfilled") setBoards(results[0].value);
      else
        setError("게시판을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");
      if (results[1].status === "fulfilled") {
        setPolicies(results[1].value);
        setPoliciesReady(true);
      } else
        setError(
          "서비스 이용 안내를 불러오지 못했습니다. 페이지를 새로 열어 주세요.",
        );
      const session = results[2];
      if (session.status === "fulfilled") {
        setUser(session.value);
        try {
          const m = await communityApi.membership();
          if (active) setMembership(m);
        } catch (e) {
          if (active)
            setError(
              e instanceof Error
                ? e.message
                : "가입 상태를 확인하지 못했습니다.",
            );
        }
      } else if (
        !(session.reason instanceof ApiError && session.reason.status === 401)
      )
        setError(
          session.reason instanceof Error
            ? session.reason.message
            : "계정 연결을 확인하지 못했습니다.",
        );
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const login = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const secret = password;
    setPassword("");
    void run(async () => {
      await partnerApi.login(String(data.get("email")), secret);
      setUser(await partnerApi.me());
      await reloadMembership();
      const invite = location.state?.workspaceInvite;
      if (typeof invite === "string" && /^[a-f0-9]{64}$/.test(invite)) {
        resyncWorkspaceSession(invite);
        return;
      }
      nav(
        safeServiceReturnPath(
          new URLSearchParams(location.search).get("returnTo"),
        ) ?? "/community",
        { replace: true },
      );
    });
  };
  const onWorkspaceSessionChange = (change: WorkspaceSessionChange) => {
    if (change.type === "signed-in") {
      resyncWorkspaceSession(change.inviteToken);
      return;
    }
    setUser(null);
    setMembership({ status: null, operator: false });
    setError(change.error ?? "");
    nav("/community");
  };
  const workspace =
    location.pathname.startsWith("/workspace") ||
    location.hash.startsWith("#join=") ||
    new URLSearchParams(location.search).get("mode") === "local";
  const operator = location.pathname.startsWith("/operator");
  const loginPage = location.pathname === "/login";
  const member = membership.status === "active";
  return (
    <>
      <GlobalHeader
        brand={{ name: "O4O Partner", icon: "p.", href: "/" }}
        publicNav={PARTNER_PUBLIC_NAV}
        contextualNav={membership.operator ? PARTNER_OPERATOR_NAV : []}
        user={
          !ready
            ? { displayName: "계정 확인 중", email: "" }
            : user
              ? {
                  displayName: user.displayName || user.name || "회원",
                  email: "",
                }
              : null
        }
        onLogin={() => {
          const invite = location.hash.startsWith("#join=")
            ? location.hash.slice(6)
            : "";
          const returnTo =
            safeServiceReturnPath(
              location.pathname + location.search + location.hash,
            ) ?? (workspace ? "/workspace" : "/community");
          nav(`/login?returnTo=${encodeURIComponent(returnTo)}`, {
            state: /^[a-f0-9]{64}$/.test(invite)
              ? { workspaceInvite: invite }
              : undefined,
          });
        }}
        onRegister={() => window.location.assign("https://neture.co.kr/signup")}
        showMobileUserMenu={false}
        homeSlot={
          <span className="partner-account-tools">
            <ServiceSpaceSwitcher
              api={navigationApi}
              accountId={user?.id}
              isAuthenticated={!!user}
              authLoading={!ready}
            />
            <MyHomeButton
              className="o4o-home-link"
              api={navigationApi}
              accountId={user?.id}
              isAuthenticated={!!user}
              authLoading={!ready}
            />
            <O4OHomeButton
              className="o4o-home-link"
              api={navigationApi}
              isAuthenticated={!!user}
              authLoading={!ready}
            />
          </span>
        }
        accountSlot={
          user ? (
            <ServiceAccountMenu
              displayName={user.displayName || user.name || "회원"}
              onLogout={() =>
                run(async () => {
                  try {
                    await partnerApi.logout();
                  } finally {
                    setUser(null);
                    setMembership({ status: null, operator: false });
                    nav("/community");
                  }
                })
              }
            />
          ) : !ready ? (
            <span role="status">계정 확인 중…</span>
          ) : undefined
        }
      />
      <main className="community-shell" aria-busy={busy}>
        {error && (
          <p role="alert" className="message failure">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="message success">
            {message}
          </p>
        )}
        {!ready && <p role="status">계정 연결을 확인하고 있습니다…</p>}
        {location.pathname === "/terms" || location.pathname === "/privacy" ? (
          <PolicyDocumentViewer
            serviceKey="partner-support"
            documentType={location.pathname === "/terms" ? "terms" : "privacy"}
            heading={
              location.pathname === "/terms" ? "이용약관" : "개인정보처리방침"
            }
            loadPolicy={loadPartnerPolicy}
          />
        ) : workspace ? (
          <WorkspacePortal onSessionChange={onWorkspaceSessionChange} />
        ) : loginPage ? (
          <section className="community-auth panel">
            <h1>O4O 계정 로그인</h1>
            <p>로그인 후 파트너 커뮤니티에 별도로 가입할 수 있습니다.</p>
            <form onSubmit={login}>
              <label className="field">
                이메일
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  disabled={busy}
                />
              </label>
              <PasswordInput
                label="비밀번호"
                name="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                disabled={busy}
              />
              <button className="button primary" disabled={busy || !ready}>
                로그인
              </button>
            </form>
            <a href="https://neture.co.kr/signup">O4O 계정 만들기 ↗</a>
          </section>
        ) : operator ? (
          <>
            {!ready ? (
              <p>운영 권한 확인 중…</p>
            ) : membership.operator ? (
              <CommunityOperator
                key={user!.id}
                user={user!}
                busy={busy}
                run={run}
                admin={membership.admin === true}
              />
            ) : (
              <section className="panel">
                <h1>Partner 운영 관리</h1>
                <p>
                  활성 Partner 회원 자격과 중앙에서 초대·수락한 Partner 운영
                  권한이 필요합니다. 작업공간 소유자나 다른 서비스 운영자에게
                  자동으로 부여되지 않습니다.
                </p>
                <Link to="/community">커뮤니티로 돌아가기</Link>
              </section>
            )}
          </>
        ) : (
          <>
            <section className="community-hero">
              <p className="eyebrow">PARTNER COMMUNITY</p>
              <h1>
                함께 만들고,
                <br />
                경험을 나누세요.
              </h1>
              <p>
                콘텐츠 제작 팁과 채널 활동 경험, 궁금한 점을 파트너들과 나누는
                공간입니다.
              </p>
              <p className="hint">
                사업자와 홍보자의 협의·계약은 당사자가 자율적으로 진행합니다.
              </p>
            </section>
            {ready && !member && (
              <section className="panel community-join">
                <h2>파트너 커뮤니티 참여</h2>
                {!user ? (
                  <>
                    <p>
                      O4O 계정으로 로그인한 뒤 커뮤니티에 별도로 가입하세요.
                      작업공간 초대와 커뮤니티 가입은 각각 관리됩니다.
                    </p>
                    <Link
                      className="button primary"
                      to={`/login?returnTo=${encodeURIComponent(safeServiceReturnPath(location.pathname + location.search + location.hash) ?? "/community")}`}
                    >
                      로그인하고 참여하기
                    </Link>
                  </>
                ) : membership.status ? (
                  <p>
                    현재 커뮤니티 이용 상태:{" "}
                    {membership.status === "suspended"
                      ? "이용 정지"
                      : membership.status}
                    . 운영자에게 이용 상태를 확인해 주세요.
                  </p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        setMembership(await communityApi.join(policies));
                        setMessage("파트너 커뮤니티에 가입했습니다.");
                      });
                    }}
                  >
                    <p>
                      서로를 존중하고, 타인의 개인정보·무단 복제 콘텐츠·스팸을
                      게시하지 마세요. 게시글과 댓글은 커뮤니티 회원에게
                      표시됩니다.
                    </p>
                    {policies.map((p) => (
                      <details key={p.id}>
                        <summary>
                          {p.title} · 버전 {p.version}
                        </summary>
                        <div className="community-body">{p.content}</div>
                      </details>
                    ))}
                    <label className="community-check">
                      <input type="checkbox" required /> 커뮤니티 이용 안내
                      {policies.length
                        ? "와 표시된 서비스 약관·개인정보 안내"
                        : ""}
                      를 확인하고 가입합니다.
                    </label>
                    <button
                      className="button primary"
                      disabled={busy || !policiesReady}
                    >
                      커뮤니티 가입하기
                    </button>
                  </form>
                )}
              </section>
            )}
            <div className="community-grid">
              <aside className="panel">
                <h2>게시판</h2>
                <nav aria-label="커뮤니티 게시판">
                  {boards.map((b) => (
                    <Link key={b.id} to={`/community/boards/${b.id}`}>
                      {b.name}
                    </Link>
                  ))}
                </nav>
                <Link to="/workspace">자료·활동·정산 작업공간 ↗</Link>
              </aside>
              <section>
                {member && user ? (
                  <CommunityContent
                    key={location.pathname}
                    user={user}
                    boards={boards}
                    membership={membership}
                    busy={busy}
                    run={run}
                    notify={setMessage}
                  />
                ) : (
                  <div className="community-board-cards">
                    {boards.map((b) => (
                      <article className="panel" key={b.id}>
                        <h2>{b.name}</h2>
                        <p>{b.description}</p>
                        <p className="hint">
                          게시글·댓글은 가입한 회원에게 제공됩니다.
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      <ServiceFooter
        brand="O4O Partner"
        links={
          <>
            <a href="https://neture.co.kr/contact?service=partner-support">
              Contact Us
            </a>
            <Link to="/terms">이용약관</Link>
            <Link to="/privacy">개인정보처리방침</Link>
          </>
        }
      >
        <PublicLegalFooterInfo
          serviceKey="partner-support"
          loadProfile={loadPartnerLegal}
        />
      </ServiceFooter>
    </>
  );
}

function CommunityContent({
  user,
  boards,
  membership,
  busy,
  run,
  notify,
}: {
  user: PartnerUser;
  boards: CommunityBoard[];
  membership: Membership;
  busy: boolean;
  run: Run;
  notify: (s: string) => void;
}) {
  const location = useLocation(),
    nav = useNavigate();
  const postId = location.pathname.match(
    /^\/community\/posts\/([a-f0-9-]+)$/,
  )?.[1];
  const boardId =
    location.pathname.match(/^\/community\/boards\/([a-f0-9-]+)$/)?.[1] ||
    boards[0]?.id;
  const board = boards.find((b) => b.id === boardId);
  const [post, setPost] = useState<CommunityPost | null>(null),
    [items, setItems] = useState<CommunityPost[]>([]),
    [count, setCount] = useState(0),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [writing, setWriting] = useState(false),
    [editing, setEditing] = useState(false),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [comment, setComment] = useState(""),
    [report, setReport] = useState<{ commentId?: string } | null>(null),
    [reason, setReason] = useState("");
  const reload = async () => {
    if (postId) setPost(await communityApi.detail(postId));
    else if (boardId) {
      const result = await communityApi.list(boardId, search, page);
      setItems(result.items);
      setCount(result.count);
    }
  };
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    const work = postId
      ? communityApi.detail(postId)
      : boardId
        ? communityApi.list(boardId, search, page)
        : Promise.resolve(null);
    void work
      .then((r) => {
        if (!active) return;
        if (postId) setPost(r as CommunityPost);
        else if (r) {
          const list = r as { items: CommunityPost[]; count: number };
          setItems(list.items);
          setCount(list.count);
        }
      })
      .catch((e) => {
        if (active)
          setLoadError(
            e instanceof Error ? e.message : "목록을 불러오지 못했습니다.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId, boardId, page, search]);
  const action = (work: () => Promise<void>) => void run(work);
  if (loading) return <p role="status">게시글을 불러오고 있습니다…</p>;
  if (loadError)
    return (
      <p role="alert" className="message failure">
        {loadError}
      </p>
    );
  const editor = (onSubmit: () => Promise<void>): ReactNode => (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        action(onSubmit);
      }}
    >
      <label className="field">
        글 제목
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
      </label>
      <label className="field">
        글 내용
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={20000}
          required
          rows={10}
        />
      </label>
      <div className="button-row">
        <button className="button primary" disabled={busy}>
          글 저장
        </button>
        <button
          type="button"
          className="button quiet"
          disabled={busy}
          onClick={() => {
            setWriting(false);
            setEditing(false);
          }}
        >
          취소
        </button>
      </div>
    </form>
  );
  if (postId && post)
    return (
      <article className="panel">
        <Link to={`/community/boards/${post.board_id}`}>← 게시판 목록</Link>
        {editing ? (
          editor(async () => {
            await communityApi.edit(post.id, {
              revision: post.revision,
              title,
              body,
            });
            setEditing(false);
            await reload();
          })
        ) : (
          <>
            <h1>
              {post.pinned ? "📌 " : ""}
              {post.title}
            </h1>
            <p className="hint">
              {post.author_name} · {date(post.created_at)}
            </p>
            <div className="community-body">{post.body}</div>
            <div className="button-row">
              {post.author_id === user.id && (
                <>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setTitle(post.title);
                      setBody(post.body);
                      setEditing(true);
                    }}
                  >
                    글 수정
                  </button>
                  <button
                    className="text-button danger"
                    disabled={busy}
                    onClick={() => {
                      if (confirm("이 글을 삭제할까요?"))
                        action(async () => {
                          await communityApi.remove(post.id, post.revision);
                          nav(`/community/boards/${post.board_id}`);
                        });
                    }}
                  >
                    글 삭제
                  </button>
                </>
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setReport({});
                  setReason("");
                }}
              >
                글 신고
              </button>
            </div>
          </>
        )}
        <h2>댓글 {post.comments?.length || 0}</h2>
        {post.comments?.map((c) => (
          <section className="community-comment" key={c.id}>
            <p className="hint">
              {c.author_name} · {date(c.created_at)}
            </p>
            <div className="community-body">
              {c.state === "published"
                ? c.body
                : c.state === "hidden"
                  ? "운영자가 숨긴 댓글입니다."
                  : "삭제된 댓글입니다."}
            </div>
            {c.state === "published" && (
              <div className="button-row">
                {c.author_id === user.id && (
                  <>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        const next = prompt("수정할 댓글", c.body);
                        if (next?.trim())
                          action(async () => {
                            await communityApi.editComment(
                              c.id,
                              c.revision,
                              next,
                            );
                            await reload();
                          });
                      }}
                    >
                      댓글 수정
                    </button>
                    <button
                      className="text-button danger"
                      disabled={busy}
                      onClick={() => {
                        if (confirm("이 댓글을 삭제할까요?"))
                          action(async () => {
                            await communityApi.removeComment(c.id, c.revision);
                            await reload();
                          });
                      }}
                    >
                      댓글 삭제
                    </button>
                  </>
                )}
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setReport({ commentId: c.id });
                    setReason("");
                  }}
                >
                  댓글 신고
                </button>
              </div>
            )}
          </section>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action(async () => {
              await communityApi.comment(post.id, comment);
              setComment("");
              await reload();
            });
          }}
        >
          <label className="field">
            댓글 내용
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              maxLength={4000}
            />
          </label>
          <button className="button primary" disabled={busy}>
            댓글 등록
          </button>
        </form>
        {report && (
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                await communityApi.report(post.id, reason, report.commentId);
                setReport(null);
                notify("신고를 접수했습니다. 운영자가 확인합니다.");
              });
            }}
          >
            <h3>{report.commentId ? "댓글" : "글"} 신고</h3>
            <label className="field">
              신고 사유
              <textarea
                required
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={busy}>
              신고 접수
            </button>
            <button
              type="button"
              className="button quiet"
              onClick={() => setReport(null)}
            >
              취소
            </button>
          </form>
        )}
      </article>
    );
  return (
    <>
      <div className="panel">
        <h1>{board?.name || "게시판"}</h1>
        <p>{board?.description}</p>
        <form
          className="community-search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(query);
          }}
        >
          <label>
            글 검색
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={100}
            />
          </label>
          <button className="button quiet">검색</button>
        </form>
        {board && (!board.operator_only || membership.operator) && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => {
              setWriting(!writing);
              setTitle("");
              setBody("");
            }}
          >
            글쓰기
          </button>
        )}
      </div>
      {writing &&
        board &&
        editor(async () => {
          const p = await communityApi.post({ boardId: board.id, title, body });
          nav(`/community/posts/${p.id}`);
        })}
      <div className="panel">
        {!items.length && (
          <p>아직 게시글이 없습니다. 첫 이야기를 남겨보세요.</p>
        )}
        {items.map((p) => (
          <article className="community-list-item" key={p.id}>
            <Link to={`/community/posts/${p.id}`}>
              {p.pinned ? "📌 " : ""}
              {p.title}
            </Link>
            <p className="hint">
              {p.author_name} · {date(p.created_at)} · 댓글{" "}
              {p.comment_count || 0}
            </p>
          </article>
        ))}
        <div className="button-row">
          <button
            className="button quiet"
            disabled={page <= 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            이전
          </button>
          <span>
            {page} / {Math.max(1, Math.ceil(count / 20))}
          </span>
          <button
            className="button quiet"
            disabled={page * 20 >= count || busy}
            onClick={() => setPage(page + 1)}
          >
            다음
          </button>
        </div>
      </div>
    </>
  );
}
