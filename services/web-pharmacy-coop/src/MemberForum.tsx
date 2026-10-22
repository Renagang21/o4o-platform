import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ForumPostContent, forumContentToHtml, ForumWriteForm, type ForumWriteFormPayload } from "@o4o/shared-space-ui";
import type { PharmacyManagementClient as Client } from "@o4o/operator-core-ui/modules/pharmacy-management";
import { LoadFeedback, useRows, workError } from "./Participation";

type Post = {
  id: string;
  title: string;
  excerpt?: string;
  content?: unknown;
  author?: { name?: string };
  createdAt?: string;
  authorId?: string;
  status?: string;
};
type Board = { id: string; name: string };
/** Reuses the business member forum. No independent community enrollment or store grant. */
export function MemberForum({
  client,
  businessKey,
  currentUserId,
  canManage,
}: Readonly<{ client: Client; businessKey: string; currentUserId?: string; canManage: boolean }>) {
  const [communityKey, setCommunityKey] = useState<string | null>(null);
  const [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setCommunityKey(null);
    setError("");
    client
      .get(`/neture/pharmacy/businesses/${encodeURIComponent(businessKey)}`)
      .then((r) => {
        if (
          r.data.data.key !== businessKey ||
          typeof r.data.data.communityKey !== "string"
        )
          throw new Error();
        if (live) setCommunityKey(r.data.data.communityKey);
      })
      .catch((e) => {
        if (live) setError(workError(e));
      });
    return () => {
      live = false;
    };
  }, [client, businessKey, version]);
  return communityKey ? (
    <ForumWorkspace
      key={communityKey}
      client={client}
      communityKey={communityKey}
      currentUserId={currentUserId}
      canManage={canManage}
    />
  ) : (
    <LoadFeedback
      error={error}
      loading
      retry={() => setVersion((v) => v + 1)}
    />
  );
}
function ForumWorkspace({
  client,
  communityKey,
  currentUserId,
  canManage,
}: Readonly<{ client: Client; communityKey: string; currentUserId?: string; canManage: boolean }>) {
  const root = `/communities/${encodeURIComponent(communityKey)}`;
  const base = `${root}/forum`;
  const [params, setParams] = useSearchParams();
  const editId = params.get("edit");
  const postId = editId || params.get("post");
  const rawPage = params.get("page") || "1";
  const page = /^\d{1,6}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<Post[] | null>(null),
    [detail, setDetail] = useState<Post | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const boards = useRows<Board>(client, `${base}/categories`);
  useEffect(() => {
    let live = true;
    setPosts(null);
    setDetail(null);
    setError("");
    const path = postId
      ? `${base}/posts/${encodeURIComponent(postId)}`
      : `${base}/posts?page=${page}&limit=20`;
    client
      .get(path)
      .then((r) => {
        const value = r.data.data;
        if (postId ? !value || value.id !== postId : !Array.isArray(value))
          throw new Error("Invalid posts");
        if (!live) return;
        if (postId) setDetail(value);
        else {
          setPosts(value);
          setTotalPages(
            Number(r.data.pagination?.totalPages ?? r.data.totalPages) || 1,
          );
        }
      })
      .catch((e) => {
        if (live) setError(workError(e));
      });
    return () => {
      live = false;
    };
  }, [client, base, page, postId, version]);
  const reload = () => setVersion((v) => v + 1);
  return (
    <div className="coop-management">
      <LoadFeedback error={error} loading={!posts && !detail} retry={reload} />
      {postId ? (
        <>
          <button type="button" onClick={() => setParams({})}>
            게시글 목록
          </button>
          {detail && (
            <article className="card spaced">
              <h3>{detail.title}</h3>
              <p>{detail.author?.name || "조합원"}</p>
              {editId && detail.status === 'draft' && detail.authorId === currentUserId ?
                <DraftReview key={detail.id} post={detail} client={client} base={base} onSaved={() => { setParams({ post: detail.id }); reload(); }} /> :
                <ForumPostContent content={detail.content} escapePlainText />}
              {detail.status === 'draft' && detail.authorId === currentUserId && !editId && <button type="button" onClick={() => setParams({ edit: detail.id })}>초안 검토·게시</button>}
            </article>
          )}
        </>
      ) : (
        <>
          {posts?.length === 0 && <p>등록된 게시글이 없습니다.</p>}
          {posts?.map((post) => (
            <article className="card spaced" key={post.id}>
              <h3>
                <button
                  type="button"
                  onClick={() => setParams({ post: post.id })}
                >
                  {post.title}
                </button>
              </h3>
              {post.excerpt && <p>{post.excerpt}</p>}
            </article>
          ))}
          {posts && (
            <nav aria-label="게시글 페이지">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setParams({ page: String(page - 1) })}
              >
                이전
              </button>
              <span>
                {page} / {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setParams({ page: String(page + 1) })}
              >
                다음
              </button>
            </nav>
          )}
          <LoadFeedback
            error={boards.error}
            loading={boards.rows === null}
            retry={boards.refresh}
          />
          {boards.rows && (
            <ForumPostForm
              client={client}
              base={base}
              boards={boards.rows}
              onSaved={reload}
            />
          )}
          {canManage && (
            <BoardForm client={client} root={root} onSaved={boards.refresh} />
          )}
        </>
      )}
    </div>
  );
}
function ForumPostForm({
  client,
  base,
  boards,
  onSaved,
}: Readonly<{
  client: Client;
  base: string;
  boards: Board[];
  onSaved: () => void;
}>) {
  const [forumId, setForumId] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  if (!boards.length)
    return <p>개설된 게시판이 없습니다. 조합 운영자에게 문의하세요.</p>;
  return (
    <form
      className="card spaced"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const response = await client.post(`${base}/posts`, {
            forumId,
            title: title.trim(),
            content: [
              {
                id: "paragraph-0",
                type: "paragraph",
                content: forumContentToHtml(body.trim(), {
                  escapePlainText: true,
                }),
              },
            ],
            type: "discussion",
          });
          if (response.data.success === false) throw new Error();
          setTitle("");
          setBody("");
          setMessage("게시글을 등록했습니다.");
          onSaved();
        } catch (err) {
          setError(workError(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>회원 글쓰기</h3>
      <label>
        <span>게시판</span>
        <select
          required
          value={forumId}
          onChange={(e) => setForumId(e.target.value)}
        >
          <option value="">게시판 선택</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>글 제목</span>
        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        <span>글 내용</span>
        <textarea
          required
          maxLength={20000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={
          busy ||
          !boards.some((b) => b.id === forumId) ||
          !title.trim() ||
          !body.trim()
        }
      >
        글 등록
      </button>
      {error && <p role="alert">{error}</p>}
      {message && <output>{message}</output>}
    </form>
  );
}
function BoardForm({
  client,
  root,
  onSaved,
}: Readonly<{ client: Client; root: string; onSaved: () => void }>) {
  const [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <form
      className="card spaced"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          await client.post(`${root}/boards`, { name: name.trim() });
          setName("");
          setMessage("게시판을 개설했습니다.");
          onSaved();
        } catch (err) {
          setError(workError(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>조합 게시판 개설</h3>
      <label>
        <span>게시판 이름</span>
        <input
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button type="submit" disabled={busy || !name.trim()}>
        게시판 개설
      </button>
      {error && <p role="alert">{error}</p>}
      {message && <output>{message}</output>}
    </form>
  );
}

/** Explicit user publication in the existing business forum, separate from delegated draft writes. */
function DraftReview({ post, client, base, onSaved }: Readonly<{ post: Post; client: Client; base: string; onSaved: () => void }>) {
  const [error, setError] = useState('');
  const submit = async ({ title, editorHtml }: ForumWriteFormPayload) => {
    setError('');
    try {
      await client.put(`${base}/posts/${encodeURIComponent(post.id)}`, { title, content: editorHtml, status: 'publish' });
      onSaved();
    } catch (e) { setError(workError(e)); }
  };
  return <section><p>비공개 초안입니다. 검토 후 게시하면 이 조합 게시판 이용자에게 공개됩니다.</p>
    {error && <p role="alert">{error}</p>}
    <ForumWriteForm initialTitle={post.title} initialContentHtml={forumContentToHtml(post.content, { escapePlainText: true })} submitLabel="검토한 초안 게시" onSubmit={submit} onCancel={onSaved} />
  </section>;
}
