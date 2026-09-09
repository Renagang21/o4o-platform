/**
 * MyEventsPage — 회원 행사 목록 · 참가 응답
 * WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1
 *
 * 게시된 행사와 취소된 행사를 함께 보여준다 — 취소 사실도 회원이 알아야 한다.
 * 참가/불참은 언제든 바꿀 수 있다 (중복 신청이 아니라 정정이다).
 *
 * 응답 가능 여부는 서버가 준 `rsvpOpen` 을 그대로 쓴다. 화면이 마감을 다시
 * 계산하면 서버 판정과 어긋나 "눌리는데 저장은 실패" 가 된다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  listMyEvents,
  respondToEvent,
  EVENT_STATUS_LABEL,
  RSVP_LABEL,
  type BranchEventItem,
  type RsvpStatus,
} from '../../lib/api/branchEvent';
import { describeApiError as describe } from '../../lib/errors';

function fmt(v: string | null): string {
  return v ? new Date(v).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
}

export default function MyEventsPage({ slug }: { slug: string }) {
  const [items, setItems] = useState<BranchEventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setItems(await listMyEvents(slug));
    } catch (e) {
      setItems(null);
      setError(describe(e));
    }
  }, [slug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function respond(ev: BranchEventItem, status: RsvpStatus) {
    setBusyId(ev.id);
    setActionError(null);
    setMessage(null);
    try {
      await respondToEvent(slug, ev.id, status);
      setMessage(`«${ev.title}» ${RSVP_LABEL[status]}(으)로 응답했습니다.`);
      await reload();
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">분회 행사</h1>
        <p className="mt-1 text-sm text-gray-500">
          분회가 게시한 행사입니다. 참가 여부는 마감 전까지 바꿀 수 있습니다.
        </p>
      </header>

      {error && <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>
      )}
      {message && (
        <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</p>
      )}

      {items === null && !error ? (
        <p className="text-sm text-gray-500">불러오는 중입니다…</p>
      ) : items && items.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          예정된 행사가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {(items ?? []).map((e) => (
            <div
              key={e.id}
              className={`rounded border p-4 ${e.status === 'cancelled' ? 'border-red-200 bg-red-50/40' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-900">{e.title}</span>
                {e.status === 'cancelled' && (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {EVENT_STATUS_LABEL.cancelled}
                  </span>
                )}
                {e.myRsvp && (
                  <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                    내 응답: {RSVP_LABEL[e.myRsvp.status]}
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-gray-700">
                {fmt(e.startsAt)}
                {e.endsAt ? ` ~ ${fmt(e.endsAt)}` : ''}
                {e.location ? ` · ${e.location}` : ''}
              </p>

              {e.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{e.description}</p>
              )}

              {e.externalUrl && (
                <p className="mt-2 text-sm">
                  <a
                    href={e.externalUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary-700 hover:underline"
                  >
                    자세히 보기 →
                  </a>
                </p>
              )}

              {e.rsvpEnabled && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {e.rsvpOpen ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === e.id}
                        onClick={() => void respond(e, 'attending')}
                        className={`rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                          e.myRsvp?.status === 'attending'
                            ? 'bg-primary-600 text-white'
                            : 'border border-primary-600 text-primary-700'
                        }`}
                      >
                        참가
                      </button>
                      <button
                        type="button"
                        disabled={busyId === e.id}
                        onClick={() => void respond(e, 'not_attending')}
                        className={`rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                          e.myRsvp?.status === 'not_attending'
                            ? 'bg-gray-600 text-white'
                            : 'border border-gray-400 text-gray-700'
                        }`}
                      >
                        불참
                      </button>
                      {e.rsvpDeadline && (
                        <span className="text-xs text-gray-500">마감 {fmt(e.rsvpDeadline)}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {e.status === 'cancelled' ? '취소된 행사입니다.' : '참가신청이 마감되었습니다.'}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
