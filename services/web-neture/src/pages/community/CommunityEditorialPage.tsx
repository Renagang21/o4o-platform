import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../contexts";
import {
  homeApi,
  SECTION_NAMES,
  SECTION_PATHS,
  type EditorialKind,
  type HomeItem,
} from "./communityHomeApi";
import { PreviewItems } from "./CommunityHostHomePage";
export default function CommunityEditorialPage({
  kind,
}: {
  kind: EditorialKind;
}) {
  const { id } = useParams(),
    { user } = useAuth();
  const [items, setItems] = useState<HomeItem[]>([]),
    [item, setItem] = useState<HomeItem | null>(null),
    [page, setPage] = useState(1),
    [hasNext, setHasNext] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setPage(1);
  }, [kind]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setItem(null);
    setItems([]);
    const request = id
      ? homeApi.detail(id).then((row) => {
          if (row.kind !== kind) throw Error();
          if (alive) setItem(row);
        })
      : homeApi.list(kind, page).then((result) => {
          if (alive) {
            setItems(result.items);
            setHasNext(result.hasNext);
          }
        });
    request
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [kind, id, page, user?.id, retry]);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="text-sm text-emerald-700">
        커뮤니티 첫 화면 →
      </Link>
      <h1 className="my-5 text-2xl font-bold">{SECTION_NAMES[kind]}</h1>
      {loading && <p role="status">불러오는 중입니다…</p>}
      {!loading && error && (
        <div role="alert">
          항목을 불러올 수 없습니다. 열람 자격과 주소를 확인해 주세요.{" "}
          <button
            onClick={() => setRetry((n) => n + 1)}
            className="min-h-11 text-emerald-700"
          >
            다시 시도
          </button>
        </div>
      )}
      {!loading && !error && item && (
        <article className="rounded-xl border bg-white p-6 [overflow-wrap:anywhere]">
          <h2 className="text-xl font-semibold">{item.title}</h2>
          {item.summary && (
            <p className="mt-3 text-slate-600">{item.summary}</p>
          )}
          <p className="mt-6 whitespace-pre-wrap">{item.body}</p>
          {item.linkUrl && (
            <a
              href={item.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block min-h-11 text-emerald-700"
            >
              {kind === "resource" ? "자료 열기 · 다운로드" : "원문 보기"} ↗
            </a>
          )}
          <Link
            to={SECTION_PATHS[kind]}
            className="mt-5 block text-emerald-700"
          >
            목록으로 →
          </Link>
        </article>
      )}
      {!loading && !error && !item && (
        <>
          <div className="rounded-xl border bg-white p-5">
            <PreviewItems items={items} section={kind} member={false} />
            {!items.length && <p>현재 열람 가능한 항목이 없습니다.</p>}
          </div>
          <nav aria-label="페이지" className="mt-5 flex items-center gap-4">
            <button
              className="min-h-11 disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((n) => n - 1)}
            >
              이전
            </button>
            <span>{page}페이지</span>
            <button
              className="min-h-11 disabled:opacity-40"
              disabled={!hasNext}
              onClick={() => setPage((n) => n + 1)}
            >
              다음
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
