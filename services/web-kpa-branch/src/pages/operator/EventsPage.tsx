/**
 * EventsPage — 운영자 행사 관리
 * WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1
 *
 * 목록 + 생성/수정 폼 + 참가 명단. 한 화면에서 끝낸다.
 *
 * 행사 종류별 템플릿을 만들지 않는다 (WO §3) — 총회도 친목행사도 같은 폼이다.
 * 게시·취소는 별도 버튼이지만 같은 PATCH 를 쓴다 (상태도 행사의 한 속성이다).
 * `rsvpOpen` 은 서버 판정값을 그대로 쓴다 — 화면이 마감을 다시 계산하지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  listOperatorEvents,
  createEvent,
  updateEvent,
  listEventRsvps,
  EVENT_STATUS_LABEL,
  EVENT_VISIBILITY_LABEL,
  RSVP_LABEL,
  type BranchEventItem,
  type EventRsvpRow,
  type EventStatus,
  type EventVisibility,
} from '../../lib/api/branchEvent';
import { describeApiError as describe } from '../../lib/errors';

const STATUS_FILTERS: Array<{ value: '' | EventStatus; label: string }> = [
  { value: '', label: '전체' },
  { value: 'draft', label: '작성중' },
  { value: 'published', label: '게시' },
  { value: 'cancelled', label: '취소' },
];

const STATUS_CLASS: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

/** ISO → `yyyy-MM-ddTHH:mm` (datetime-local 용). 로컬 시각 그대로 쓴다 */
function toLocalInput(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmt(v: string | null): string {
  return v ? new Date(v).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
}

interface Draft {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  externalUrl: string;
  rsvpEnabled: boolean;
  rsvpDeadline: string;
  visibility: EventVisibility;
}

const EMPTY: Draft = {
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  location: '',
  externalUrl: '',
  rsvpEnabled: false,
  rsvpDeadline: '',
  visibility: 'members_only',
};

export default function EventsPage({ slug }: { slug: string }) {
  const [status, setStatus] = useState<'' | EventStatus>('');
  const [items, setItems] = useState<BranchEventItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const [rsvpFor, setRsvpFor] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<EventRsvpRow[] | null>(null);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setListError(null);
    try {
      setItems(await listOperatorEvents(slug, status || null));
    } catch (e) {
      setItems(null);
      setListError(describe(e));
    }
  }, [slug, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openCreate() {
    setEditId(null);
    setDraft(EMPTY);
    setFormOpen(true);
    setActionError(null);
    setMessage(null);
  }

  function openEdit(e: BranchEventItem) {
    setEditId(e.id);
    setDraft({
      title: e.title,
      description: e.description ?? '',
      startsAt: toLocalInput(e.startsAt),
      endsAt: toLocalInput(e.endsAt),
      location: e.location ?? '',
      externalUrl: e.externalUrl ?? '',
      rsvpEnabled: e.rsvpEnabled,
      rsvpDeadline: toLocalInput(e.rsvpDeadline),
      visibility: e.visibility,
    });
    setFormOpen(true);
    setActionError(null);
    setMessage(null);
  }

  async function save() {
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      const input = {
        title: draft.title,
        description: draft.description || null,
        startsAt: draft.startsAt,
        endsAt: draft.endsAt || null,
        location: draft.location || null,
        externalUrl: draft.externalUrl || null,
        rsvpEnabled: draft.rsvpEnabled,
        // 신청을 받지 않으면 마감일은 보내지 않는다 (서버·DB 계약과 같은 방향)
        rsvpDeadline: draft.rsvpEnabled ? draft.rsvpDeadline || null : null,
        visibility: draft.visibility,
      };
      if (editId) {
        await updateEvent(slug, editId, input);
        setMessage('행사를 저장했습니다.');
      } else {
        await createEvent(slug, input);
        setMessage('행사를 만들었습니다. 아직 작성중 상태이며 게시해야 회원에게 보입니다.');
      }
      setFormOpen(false);
      setEditId(null);
      await reload();
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function setEventStatus(e: BranchEventItem, next: EventStatus) {
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      await updateEvent(slug, e.id, { status: next });
      setMessage(`«${e.title}» ${EVENT_STATUS_LABEL[next]} 처리했습니다.`);
      await reload();
      if (rsvpFor === e.id) await openRsvps(e.id);
    } catch (err) {
      setActionError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  const openRsvps = useCallback(
    async (eventId: string) => {
      setRsvpFor(eventId);
      setRsvps(null);
      setRsvpError(null);
      try {
        const res = await listEventRsvps(slug, eventId);
        setRsvps(res.items);
      } catch (e) {
        setRsvpError(describe(e));
      }
    },
    [slug],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">행사 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            총회·세미나·교육·친목행사를 하나로 관리합니다. 결제·좌석배정·출결 기능은 없습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | EventStatus)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            행사 만들기
          </button>
        </div>
      </header>

      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>
      )}
      {message && (
        <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</p>
      )}

      {/* ── 생성 / 수정 폼 ─────────────────────────────────────────── */}
      {formOpen && (
        <section className="rounded border border-gray-200">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
            <h2 className="text-sm font-semibold text-gray-800">{editId ? '행사 수정' : '새 행사'}</h2>
          </div>
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="text-xs text-gray-500">행사명 *</span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                placeholder="예: 2026년 정기총회"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-gray-500">시작 일시 *</span>
                <input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">종료 일시</span>
                <input
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">장소</span>
                <input
                  type="text"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">외부 링크</span>
                <input
                  type="url"
                  value={draft.externalUrl}
                  onChange={(e) => setDraft({ ...draft, externalUrl: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  placeholder="https://"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-gray-500">안내</span>
              <textarea
                rows={4}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.rsvpEnabled}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      rsvpEnabled: e.target.checked,
                      ...(e.target.checked ? {} : { rsvpDeadline: '' }),
                    })
                  }
                />
                참가신청 받기
              </label>
              {draft.rsvpEnabled && (
                <label className="text-sm text-gray-700">
                  마감{' '}
                  <input
                    type="datetime-local"
                    value={draft.rsvpDeadline}
                    onChange={(e) => setDraft({ ...draft, rsvpDeadline: e.target.value })}
                    className="ml-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </label>
              )}
              <label className="text-sm text-gray-700">
                공개 범위{' '}
                <select
                  value={draft.visibility}
                  onChange={(e) => setDraft({ ...draft, visibility: e.target.value as EventVisibility })}
                  className="ml-1 rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="members_only">회원 전용</option>
                  <option value="public">전체 공개</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditId(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                취소
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── 목록 ────────────────────────────────────────────────────── */}
      {listError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{listError}</p>}

      {items === null && !listError ? (
        <p className="text-sm text-gray-500">불러오는 중입니다…</p>
      ) : items && items.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          등록된 행사가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {(items ?? []).map((e) => (
            <div key={e.id} className="rounded border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-gray-900">{e.title}</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[e.status]}`}>
                      {EVENT_STATUS_LABEL[e.status]}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {EVENT_VISIBILITY_LABEL[e.visibility]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {fmt(e.startsAt)}
                    {e.endsAt ? ` ~ ${fmt(e.endsAt)}` : ''}
                    {e.location ? ` · ${e.location}` : ''}
                  </p>
                  {e.rsvpEnabled && (
                    <p className="mt-1 text-xs text-gray-500">
                      참가신청 {e.rsvpOpen ? '접수중' : '마감'}
                      {e.rsvpDeadline ? ` (마감 ${fmt(e.rsvpDeadline)})` : ''} · 참가 {e.counts.attending}명 ·
                      불참 {e.counts.notAttending}명
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button type="button" onClick={() => openEdit(e)} className="text-primary-700 hover:underline">
                    수정
                  </button>
                  {e.status === 'draft' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setEventStatus(e, 'published')}
                      className="rounded border border-primary-600 px-2 py-1 font-medium text-primary-700 disabled:opacity-50"
                    >
                      게시
                    </button>
                  )}
                  {e.status === 'published' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setEventStatus(e, 'cancelled')}
                      className="rounded border border-red-300 px-2 py-1 font-medium text-red-700 disabled:opacity-50"
                    >
                      취소
                    </button>
                  )}
                  {e.rsvpEnabled && (
                    <button
                      type="button"
                      onClick={() => void openRsvps(e.id)}
                      className="text-primary-700 hover:underline"
                    >
                      참가명단
                    </button>
                  )}
                </div>
              </div>

              {rsvpFor === e.id && (
                <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
                  {rsvpError ? (
                    <p className="text-sm text-red-700">{rsvpError}</p>
                  ) : rsvps === null ? (
                    <p className="text-sm text-gray-500">불러오는 중입니다…</p>
                  ) : rsvps.length === 0 ? (
                    <p className="text-sm text-gray-500">아직 응답한 회원이 없습니다.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500">
                          <th className="py-1">회원</th>
                          <th className="py-1">응답</th>
                          <th className="py-1">메모</th>
                          <th className="py-1">응답일시</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rsvps.map((r) => (
                          <tr key={r.userId} className="border-t border-gray-200">
                            <td className="py-1">
                              <div className="text-gray-900">{r.name ?? '-'}</div>
                              <div className="text-xs text-gray-500">{r.email ?? ''}</div>
                            </td>
                            <td className="py-1">{RSVP_LABEL[r.status]}</td>
                            <td className="py-1 text-gray-600">{r.memo ?? '-'}</td>
                            <td className="py-1 text-gray-600">{fmt(r.respondedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
