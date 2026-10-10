/** Branch entry displays current notices, events and resources without a separate introduction page. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicSite, getPublicPosts, type BranchPost, type BranchSite } from '../lib/api/branch';
import { listPublicEvents, type BranchEventItem } from '../lib/api/branchEvent';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; site: BranchSite; notices: BranchPost[]; resources: BranchPost[] };

export default function BranchHomePage({ slug, basePath }: { slug: string; basePath: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [events, setEvents] = useState<BranchEventItem[]>([]);

  useEffect(() => {
    let alive = true;
    setState({ kind: 'loading' });
    Promise.all([
      getPublicSite(slug),
      getPublicPosts(slug, { category: 'notice', limit: 5 }),
      getPublicPosts(slug, { category: 'resource', limit: 5 }),
    ])
      .then(([site, notices, resources]) => {
        if (alive) setState({ kind: 'ready', site, notices: notices.items, resources: resources.items });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const status = (e as { response?: { status?: number } })?.response?.status;
        setState({
          kind: 'error',
          message:
            status === 404
              ? '아직 공개되지 않은 분회 홈페이지입니다.'
              : '분회 홈페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        });
      });
    listPublicEvents(slug)
      .then((rows) => {
        if (!alive) return;
        const now = Date.now();
        setEvents(
          rows
            .filter((e) => new Date(e.startsAt).getTime() >= now)
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
            .slice(0, 5),
        );
      })
      .catch(() => alive && setEvents([]));

    return () => {
      alive = false;
    };
  }, [slug]);

  if (state.kind === 'loading') return <p className="text-gray-500">불러오는 중입니다…</p>;
  if (state.kind === 'error') return <p className="text-gray-700">{state.message}</p>;

  const { notices, resources } = state;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">공지 · 행사</h1>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">다가오는 행사</h2>
          <Link to={`${basePath}/events`} className="text-sm text-primary-700 hover:underline">더보기</Link>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">예정된 행사가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded border border-gray-200">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="truncate text-gray-800">{e.title}</span>
                <span className="ml-auto shrink-0 text-xs text-gray-400">
                  {new Date(e.startsAt).toLocaleDateString('ko-KR')}
                  {e.location ? ` · ${e.location}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <PostPreview title="공지" to={`${basePath}/notices`} items={notices} />
        <PostPreview title="자료실" to={`${basePath}/resources`} items={resources} />
      </div>

    </div>
  );
}

function PostPreview({ title, to, items }: { title: string; to: string; items: BranchPost[] }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <Link to={to} className="text-sm text-primary-700 hover:underline">더보기</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 글이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded border border-gray-200">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              {p.isPinned && <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs text-primary-700">고정</span>}
              <span className="truncate text-gray-800">{p.title}</span>
              <span className="ml-auto shrink-0 text-xs text-gray-400">
                {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('ko-KR') : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
