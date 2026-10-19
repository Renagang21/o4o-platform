import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  homeApi,
  SECTION_NAMES,
  type EditorialKind,
  type HomeItem,
  type HomePreview,
} from "./communityHomeApi";
const blank = (kind: EditorialKind): Partial<HomeItem> => ({
  kind,
  title: "",
  summary: "",
  body: "",
  linkUrl: "",
  status: "draft",
  audience: "members",
  isPinned: false,
  sortOrder: 0,
});
const errorText = (error: unknown) =>
  (error as { response?: { data?: { error?: string } } }).response?.data
    ?.error || "저장하지 못했습니다. 다시 시도해 주세요.";
export default function CommunityHomeManagementPage() {
  const [kind, setKind] = useState<EditorialKind | "forum">("notice"),
    [items, setItems] = useState<HomeItem[]>([]),
    [page, setPage] = useState(1),
    [hasNext, setHasNext] = useState(false),
    [forum, setForum] = useState<HomePreview | null>(null),
    [form, setForm] = useState<Partial<HomeItem>>(blank("notice")),
    [id, setId] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setItems([]);
    setForum(null);
    setId(null);
    setError("");
    if (kind !== "forum") setForm(blank(kind));
    const request =
      kind === "forum"
        ? homeApi.forum().then((data) => {
            if (active) setForum(data);
          })
        : homeApi.manage(kind, page).then((data) => {
            if (active) {
              setItems(data.items);
              setHasNext(data.hasNext);
            }
          });
    request
      .catch(() => {
        if (active) setError("목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, version, page]);
  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await homeApi.save(id, form);
      setVersion((v) => v + 1);
      setMessage("저장했습니다.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const pin = async (item: HomeItem) => {
    setBusy(true);
    setError("");
    try {
      await homeApi.pinForum(item.id, !item.isPinned);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const update = (key: keyof HomeItem, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <h1 className="text-2xl font-bold">첫 화면 섹션 관리</h1>
      <p className="text-sm text-slate-600">
        상시 노출은 섹션별 최대 2개이며 최근 항목 10개와 별도로 표시됩니다. 공개
        설정과 게시 상태에 따라 실제 노출됩니다.
      </p>
      <Link to="/" className="inline-block text-emerald-700">
        커뮤니티 첫 화면 보기 →
      </Link>
      <nav aria-label="관리 섹션" className="flex flex-wrap gap-2">
        {(["notice", "news", "forum", "content", "resource"] as const).map(
          (k) => (
            <button
              key={k}
              aria-pressed={kind === k}
              disabled={busy}
              onClick={() => {
                setPage(1);
                setKind(k);
                setMessage("");
              }}
              className={`min-h-11 rounded border px-4 ${kind === k ? "bg-emerald-700 text-white" : "bg-white"}`}
            >
              {SECTION_NAMES[k]}
            </button>
          ),
        )}
      </nav>
      {error && (
        <p role="alert" className="text-red-700">
          {error}{" "}
          <button
            disabled={busy}
            onClick={() => setVersion((v) => v + 1)}
            className="min-h-11 underline"
          >
            다시 불러오기
          </button>
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {loading && <p role="status">불러오는 중입니다…</p>}
      {!loading && kind === "forum" && (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">포럼 상시 노출 지정</h2>
          <p className="my-3 text-sm">
            최근 글을 선택하거나 글 ID로 지정합니다. 공개 범위는 기존
            게시판·공개 설정을 따릅니다.
          </p>
          <form
            className="mb-4 flex flex-wrap gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              try {
                await homeApi.pinForum(String(data.get("postId")), true);
                setVersion((v) => v + 1);
              } catch (err) {
                setError(errorText(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              게시글 ID{" "}
              <input
                required
                name="postId"
                className="max-w-full rounded border p-2"
              />
            </label>
            <button
              disabled={busy}
              className="rounded bg-emerald-700 px-3 py-2 text-white"
            >
              상시 노출 지정
            </button>
          </form>
          {[...(forum?.pinned ?? []), ...(forum?.recent ?? [])].map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-t py-3"
            >
              <span className="break-all">{item.title}</span>
              <button
                disabled={busy}
                onClick={() => pin(item)}
                className="shrink-0 rounded border px-3 py-2"
              >
                {item.isPinned ? "상시 노출 해제" : "상시 노출"}
              </button>
            </div>
          ))}
        </section>
      )}
      {!loading && kind !== "forum" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 font-semibold">등록 항목</h2>
            <button
              onClick={() => {
                setId(null);
                setForm(blank(kind));
              }}
              className="mb-3 min-h-11 text-emerald-700"
            >
              새 항목 작성 +
            </button>
            {!items.length && <p>등록된 항목이 없습니다.</p>}
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setId(item.id);
                  setForm({ ...item });
                }}
                className="block w-full border-t py-3 text-left"
              >
                <span className="break-all font-medium">{item.title}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {item.status} ·{" "}
                  {item.audience === "public" ? "공개" : "회원 전용"}
                  {item.isPinned ? ` · 상시 노출 (${item.sortOrder})` : ""}
                </span>
              </button>
            ))}
            <nav
              aria-label="관리 목록 페이지"
              className="mt-4 flex items-center gap-4"
            >
              <button
                type="button"
                disabled={busy || page === 1}
                onClick={() => setPage((n) => n - 1)}
                className="min-h-11 disabled:opacity-40"
              >
                이전 항목
              </button>
              <span>{page}페이지</span>
              <button
                type="button"
                disabled={busy || !hasNext}
                onClick={() => setPage((n) => n + 1)}
                className="min-h-11 disabled:opacity-40"
              >
                다음 항목
              </button>
            </nav>
          </section>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="space-y-4 rounded-xl border bg-white p-5"
          >
            <h2 className="font-semibold">{id ? "항목 편집" : "새 항목"}</h2>
            <label className="block">
              제목
              <input
                required
                maxLength={255}
                value={form.title ?? ""}
                onChange={(e) => update("title", e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block">
              요약
              <textarea
                maxLength={1000}
                value={form.summary ?? ""}
                onChange={(e) => update("summary", e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            {kind !== "news" && (
              <label className="block">
                본문
                <textarea
                  rows={7}
                  maxLength={50000}
                  value={form.body ?? ""}
                  onChange={(e) => update("body", e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>
            )}
            <label className="block">
              {kind === "news"
                ? "약사공론 기사 원문 URL"
                : "자료·외부 링크 URL (선택)"}
              <input
                type="url"
                required={kind === "news"}
                maxLength={500}
                value={form.linkUrl ?? ""}
                onChange={(e) => update("linkUrl", e.target.value)}
                placeholder="https://"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            {kind === "news" && (
              <p className="text-xs text-slate-500">
                약사공론 기사 제목과 원문 링크를 등록합니다. 본문을 복제하거나
                자동 수집하지 않습니다.
              </p>
            )}
            <div className="flex flex-wrap gap-4">
              <label>
                게시 상태
                <select
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                  className="ml-2 rounded border p-2"
                >
                  <option value="draft">초안</option>
                  <option value="published">게시</option>
                  <option value="archived">보관 · 게시 중지</option>
                </select>
              </label>
              <label>
                열람 범위
                <select
                  value={form.audience}
                  onChange={(e) => update("audience", e.target.value)}
                  className="ml-2 rounded border p-2"
                >
                  <option value="members">회원 전용</option>
                  <option value="public">비로그인 공개</option>
                </select>
              </label>
            </div>
            <label className="block">
              <input
                type="checkbox"
                checked={!!form.isPinned}
                onChange={(e) => update("isPinned", e.target.checked)}
                className="mr-2"
              />
              상시 노출
            </label>
            <label className="block">
              표시 순서 (작은 숫자 먼저)
              <input
                type="number"
                min={0}
                max={9999}
                value={form.sortOrder ?? 0}
                onChange={(e) => update("sortOrder", Number(e.target.value))}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <button
              disabled={busy}
              className="min-h-11 rounded bg-emerald-700 px-5 py-2 text-white disabled:opacity-40"
            >
              {busy ? "저장 중…" : "저장"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
