import { useEffect, useState } from "react";
import {
  communityApi,
  type CommunityBoard,
  type CommunityPost,
  type OperatorOverview,
} from "./community-api";
import type { PartnerUser, Run } from "./PartnerSite";

const eventLabels: Record<string, string> = {
  member_joined: "커뮤니티 가입",
  member_active: "회원 이용 정지 해제",
  member_suspended: "회원 이용 정지",
  post_created: "글 작성",
  post_edited: "글 수정",
  post_deleted: "글 삭제",
  post_hidden: "글 숨김",
  post_published: "글 게시·고정 변경",
  comment_created: "댓글 작성",
  comment_edited: "댓글 수정",
  comment_deleted: "댓글 삭제",
  comment_hidden: "댓글 숨김",
  comment_published: "댓글 복구",
  report_created: "신고 접수",
  report_resolved: "신고 처리",
  board_created: "게시판 생성",
  board_updated: "게시판 변경",
};
const blank = { name: "", description: "", operatorOnly: false, active: true };
export default function CommunityOperator({
  user,
  busy,
  run,
}: {
  user: PartnerUser;
  busy: boolean;
  run: Run;
}) {
  const [data, setData] = useState<OperatorOverview | null>(null),
    [tab, setTab] = useState("reports"),
    [post, setPost] = useState<CommunityPost | null>(null);
  const [board, setBoard] = useState(blank),
    [editing, setEditing] = useState<CommunityBoard | null>(null),
    [boardReason, setBoardReason] = useState("");
  const [action, setAction] = useState<{
      label: string;
      work: (reason: string) => Promise<unknown>;
    } | null>(null),
    [reason, setReason] = useState("");
  const reload = async () => {
    setData(await communityApi.overview());
  };
  useEffect(() => {
    void run(reload);
  }, []);
  const ask = (label: string, work: (reason: string) => Promise<unknown>) => {
    setAction({ label, work });
    setReason("");
  };
  const viewPost = (id: string) =>
    void run(async () => {
      setPost(await communityApi.detail(id, true));
      setTab("posts");
    });
  return (
    <section>
      <div className="community-hero">
        <p className="eyebrow">PARTNER OPERATIONS</p>
        <h1>커뮤니티 운영 관리</h1>
        <p>
          Partner 회원과 게시판을 관리합니다. 협의·계약·보상 판정은 당사자의
          영역입니다.
        </p>
      </div>
      <nav className="community-tabs" aria-label="운영 메뉴">
        {[
          ["reports", "신고 처리"],
          ["posts", "글·댓글 관리"],
          ["members", "회원 관리"],
          ["boards", "게시판 관리"],
          ["events", "운영 이력"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`button ${tab === id ? "primary" : "quiet"}`}
            disabled={busy}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button
          className="button quiet"
          disabled={busy}
          onClick={() => void run(reload)}
        >
          새로고침
        </button>
      </nav>
      <p className="hint">
        최근 100건을 표시합니다. 운영 조치는 현재 권한을 확인하고 사유와 함께
        기록합니다. 운영자 지정·회수는 중앙 관리자 초대·수락 체계를 이용합니다.
      </p>
      {!data && <p role="status">운영 자료를 불러오고 있습니다…</p>}
      {action && (
        <form
          className="panel community-operation"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await action.work(reason);
              setAction(null);
              await reload();
              if (post) setPost(await communityApi.detail(post.id, true));
            });
          }}
        >
          <h2>{action.label}</h2>
          <label className="field">
            처리 사유
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={1000}
            />
          </label>
          <div className="button-row">
            <button className="button primary" disabled={busy}>
              조치 적용
            </button>
            <button
              type="button"
              className="button quiet"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              취소
            </button>
          </div>
        </form>
      )}
      {data && tab === "reports" && (
        <div className="panel">
          <h2>신고 목록</h2>
          {!data.reports.length && <p>접수된 신고가 없습니다.</p>}
          {data.reports.map((r) => (
            <article
              className="community-list-item"
              key={r.id}
              data-report-post-id={r.post_id}
            >
              <strong>
                {r.comment_id ? "댓글 신고" : "게시글 신고"} ·{" "}
                {r.status === "open" ? "접수" : "처리 완료"}
              </strong>
              <p className="community-body">{r.reason}</p>
              {r.resolution && <p>처리 기록: {r.resolution}</p>}
              <div className="button-row">
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => viewPost(r.post_id)}
                >
                  대상 글·댓글 확인
                </button>
                {r.status === "open" && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      ask("신고 처리 완료", (note) =>
                        communityApi.resolve(r.id, r.revision, note),
                      )
                    }
                  >
                    처리 기록 남기기
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {data && tab === "posts" && (
        <div className="community-grid">
          <div className="panel">
            <h2>최근 게시글</h2>
            {data.posts.map((p) => (
              <article className="community-list-item" key={p.id}>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => viewPost(p.id)}
                >
                  {p.title}
                </button>
                <p className="hint">
                  {p.state === "hidden" ? "숨김" : "게시"} · {p.author_name}
                </p>
              </article>
            ))}
          </div>
          {post && (
            <article className="panel">
              <h2>{post.title}</h2>
              <div className="community-body">{post.body}</div>
              <div className="button-row">
                <button
                  className="button quiet"
                  disabled={busy}
                  onClick={() =>
                    ask(
                      post.state === "hidden" ? "게시글 복구" : "게시글 숨김",
                      (note) =>
                        communityApi.moderate("posts", post.id, {
                          revision: post.revision,
                          state:
                            post.state === "hidden" ? "published" : "hidden",
                          reason: note,
                        }),
                    )
                  }
                >
                  {post.state === "hidden" ? "게시글 복구" : "게시글 숨김"}
                </button>
                <button
                  className="button quiet"
                  disabled={busy}
                  onClick={() =>
                    ask(post.pinned ? "고정 해제" : "게시글 고정", (note) =>
                      communityApi.moderate("posts", post.id, {
                        revision: post.revision,
                        state: post.state === "hidden" ? "hidden" : "published",
                        pinned: !post.pinned,
                        reason: note,
                      }),
                    )
                  }
                >
                  {post.pinned ? "고정 해제" : "게시글 고정"}
                </button>
              </div>
              <h3>댓글 관리</h3>
              {post.comments?.map((c) => (
                <section className="community-comment" key={c.id}>
                  <p>
                    {c.author_name} · {c.state}
                  </p>
                  <div className="community-body">
                    {c.body || "삭제된 댓글입니다."}
                  </div>
                  {c.state !== "deleted" && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        ask(
                          c.state === "hidden" ? "댓글 복구" : "댓글 숨김",
                          (note) =>
                            communityApi.moderate("comments", c.id, {
                              revision: c.revision,
                              state:
                                c.state === "hidden" ? "published" : "hidden",
                              reason: note,
                            }),
                        )
                      }
                    >
                      {c.state === "hidden" ? "댓글 복구" : "댓글 숨김"}
                    </button>
                  )}
                </section>
              ))}
            </article>
          )}
        </div>
      )}
      {data && tab === "members" && (
        <section className="panel">
          <h2>커뮤니티 회원</h2>
          {data.members.map((m) => (
            <article
              className="community-list-item"
              key={m.id}
              data-member-id={m.id}
            >
              <strong>{m.name}</strong>
              <p>
                {m.status === "active"
                  ? "활동 중"
                  : m.status === "suspended"
                    ? "이용 정지"
                    : m.status}
              </p>
              {m.id !== user.id &&
                ["active", "suspended"].includes(m.status) && (
                  <button
                    className="button quiet"
                    disabled={busy}
                    onClick={() =>
                      ask(
                        m.status === "active"
                          ? "회원 이용 정지"
                          : "회원 이용 정지 해제",
                        (note) =>
                          communityApi.member(m.id, {
                            status:
                              m.status === "active" ? "suspended" : "active",
                            reason: note,
                            expectedVersion: m.version,
                          }),
                      )
                    }
                  >
                    {m.status === "active" ? "이용 정지" : "정지 해제"}
                  </button>
                )}
            </article>
          ))}
        </section>
      )}
      {data && tab === "boards" && (
        <div className="community-grid">
          <section className="panel">
            <h2>게시판 목록</h2>
            {data.boards.map((b) => (
              <article className="community-list-item" key={b.id}>
                <h3>{b.name}</h3>
                <p>
                  {b.active ? "운영 중" : "운영 중지"} ·{" "}
                  {b.operator_only ? "운영자만 글 작성" : "회원 글 작성"}
                </p>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(b);
                    setBoard({
                      name: b.name,
                      description: b.description,
                      operatorOnly: b.operator_only,
                      active: b.active !== false,
                    });
                    setBoardReason("");
                  }}
                >
                  게시판 수정
                </button>
              </article>
            ))}
            <button
              className="button quiet"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setBoard(blank);
                setBoardReason("");
              }}
            >
              새 게시판
            </button>
          </section>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await communityApi.board(editing?.id, {
                  ...board,
                  revision: editing?.revision,
                  reason: boardReason,
                });
                setEditing(null);
                setBoard(blank);
                setBoardReason("");
                await reload();
              });
            }}
          >
            <h2>{editing ? "게시판 수정" : "게시판 만들기"}</h2>
            <label className="field">
              게시판 이름
              <input
                required
                maxLength={80}
                value={board.name}
                onChange={(e) => setBoard({ ...board, name: e.target.value })}
              />
            </label>
            <label className="field">
              게시판 소개
              <textarea
                maxLength={500}
                value={board.description}
                onChange={(e) =>
                  setBoard({ ...board, description: e.target.value })
                }
              />
            </label>
            <label className="community-check">
              <input
                type="checkbox"
                checked={board.operatorOnly}
                onChange={(e) =>
                  setBoard({ ...board, operatorOnly: e.target.checked })
                }
              />
              운영자만 글 작성
            </label>
            <label className="community-check">
              <input
                type="checkbox"
                checked={board.active}
                onChange={(e) =>
                  setBoard({ ...board, active: e.target.checked })
                }
              />
              게시판 운영
            </label>
            <label className="field">
              변경 사유
              <textarea
                required
                maxLength={1000}
                value={boardReason}
                onChange={(e) => setBoardReason(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={busy}>
              게시판 저장
            </button>
          </form>
        </div>
      )}
      {data && tab === "events" && (
        <section className="panel">
          <h2>운영·활동 이력</h2>
          {data.events.map((e) => (
            <article className="community-list-item" key={e.id}>
              <strong>{eventLabels[e.kind] || "커뮤니티 활동"}</strong>
              <p>{e.actor_name || "회원"}</p>
              <p>{new Date(e.created_at).toLocaleString("ko-KR")}</p>
              {e.reason && <p className="community-body">{e.reason}</p>}
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
