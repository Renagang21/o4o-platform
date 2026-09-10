/**
 * BranchEventsPage — 공개 행사 안내
 * WO-O4O-KPA-BRANCH-IA-AND-NAVIGATION-FINALIZATION-V1 §2 · §10
 *
 * 이미 있던 공개 API(`GET /branches/:slug/events`)에 진입점이 없어 도달할 수 없던 화면이다.
 * 참가 신청(RSVP)은 회원 경로(`/mypage/events`)의 책임이며 여기서는 안내만 한다 —
 * 공개 영역과 회원 영역의 책임을 섞지 않는다.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublicEvents, type BranchEventItem } from '../lib/api/branchEvent';

function fmt(v: string | null): string {
  return v ? new Date(v).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
}

export default function BranchEventsPage({ slug, basePath }: { slug: string; basePath: string }) {
  const [items, setItems] = useState<BranchEventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError(null);
    listPublicEvents(slug)
      .then((r) => alive && setItems(r))
      .catch(() => alive && setError('행사 목록을 불러오지 못했습니다.'));
    return () => {
      alive = false;
    };
  }, [slug]);

  const now = Date.now();
  const upcoming = (items ?? []).filter((e) => new Date(e.startsAt).getTime() >= now);
  const past = (items ?? []).filter((e) => new Date(e.startsAt).getTime() < now);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-bold text-gray-900">행사</h1>
        <p className="mt-1 text-sm text-gray-600">
          분회가 공개한 행사입니다. 참가 신청은 로그인 후{' '}
          <Link to={`${basePath}/mypage/events`} className="text-primary-700 hover:underline">
            행사 참가신청
          </Link>{' '}
          에서 할 수 있습니다.
        </p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && items === null && <p className="text-sm text-gray-500">불러오는 중입니다…</p>}

      {items !== null && (
        <>
          <Section title="예정된 행사" items={upcoming} empty="예정된 행사가 없습니다." />
          {past.length > 0 && <Section title="지난 행사" items={past} empty="" />}
        </>
      )}
    </div>
  );
}

function Section({ title, items, empty }: { title: string; items: BranchEventItem[]; empty: string }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded border border-gray-200">
          {items.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <p className="font-medium text-gray-900">{e.title}</p>
              <p className="mt-1 text-xs text-gray-500">
                {fmt(e.startsAt)}
                {e.endsAt ? ` ~ ${fmt(e.endsAt)}` : ''}
                {e.location ? ` · ${e.location}` : ''}
              </p>
              {e.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{e.description}</p>
              )}
              {e.externalUrl && (
                <a
                  href={e.externalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-block text-sm text-primary-700 hover:underline"
                >
                  자세히 보기
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
