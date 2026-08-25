/**
 * SignageSchedulePanel — 편성(스케줄)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#70)
 *
 * KPA 의 [스케줄] 탭과 같은 업무다. 원장은 공통 `signage_schedules` 이며,
 * 재생 단위는 매장 재생 목록(`store_playlists`)이다.
 * 공통 service 계약상 **발행된 재생 목록만** 편성 대상이므로 선택지도 발행분만 보여준다
 * (없는 선택지를 만들어 두고 저장 시 실패시키지 않는다).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchSignageSchedules,
  createSignageSchedule,
  updateSignageSchedule,
  deleteSignageSchedule,
  fetchPlaylists,
  type SignageSchedule,
  type Playlist,
} from '../../../lib/api/pharmacyHubStoreSignage';
import { StoreConnectionNotice, type StoreConnectionState } from '../../../components/store-owner/StoreConnectionNotice';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface FormState {
  id: string | null;
  name: string;
  storePlaylistId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  storePlaylistId: '',
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '18:00',
};

function hhmm(raw: string): string {
  return raw?.slice(0, 5) ?? '';
}

export default function SignageSchedulePanel() {
  const [items, setItems] = useState<SignageSchedule[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchSignageSchedules(), fetchPlaylists()])
      .then(([s, p]) => {
        setConnection(s.storeConnection);
        setItems(s.items);
        setPlaylists(p.items);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '편성을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const publishable = useMemo(
    () => playlists.filter((p) => p.publishStatus === 'published' && p.isActive),
    [playlists],
  );

  const playlistName = useCallback(
    (id: string | null) => playlists.find((p) => p.id === id)?.name ?? '(삭제된 재생 목록)',
    [playlists],
  );

  const handleSave = async () => {
    if (!form) return;
    const name = form.name.trim();
    if (!name || !form.storePlaylistId || form.daysOfWeek.length === 0) {
      window.alert('이름 · 재생 목록 · 요일을 모두 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        storePlaylistId: form.storePlaylistId,
        daysOfWeek: form.daysOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
      };
      if (form.id) await updateSignageSchedule(form.id, payload);
      else await createSignageSchedule(payload);
      setForm(null);
      load();
    } catch (e: any) {
      window.alert(e?.message || '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: SignageSchedule) => {
    try {
      await updateSignageSchedule(s.id, { isActive: !s.isActive });
      load();
    } catch (e: any) {
      window.alert(e?.message || '처리하지 못했습니다.');
    }
  };

  const handleDelete = async (s: SignageSchedule) => {
    if (!window.confirm(`"${s.name}" 편성을 삭제할까요?`)) return;
    try {
      await deleteSignageSchedule(s.id);
      load();
    } catch (e: any) {
      window.alert(e?.message || '삭제하지 못했습니다.');
    }
  };

  if (connection && connection.status !== 'connected') {
    return <StoreConnectionNotice connection={connection} subject="매장 사이니지" />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-gray-500">
          요일과 시간대를 정해 재생 목록을 자동으로 트십니다. 발행한 재생 목록만 편성할 수 있습니다.
        </p>
        <button
          type="button"
          disabled={publishable.length === 0}
          title={publishable.length === 0 ? '먼저 재생 목록을 발행하세요.' : undefined}
          onClick={() => setForm({ ...EMPTY_FORM, storePlaylistId: publishable[0]?.id ?? '' })}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          편성 만들기
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">편성이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-400">
            {publishable.length === 0
              ? '[재생 목록] 탭에서 재생 목록을 만들고 "재생 시작" 으로 발행하면 편성할 수 있습니다.'
              : '"편성 만들기" 로 요일·시간대를 지정하세요.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span
                    className={`rounded px-1.5 py-0.5 ${
                      s.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.isActive ? '사용 중' : '중지'}
                  </span>
                  <span>{s.daysOfWeek.map((d) => DAY_LABELS[d]).join('·')}</span>
                  <span>
                    {hhmm(s.startTime)}–{hhmm(s.endTime)}
                  </span>
                  <span className="truncate">{playlistName(s.storePlaylistId)}</span>
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: s.id,
                      name: s.name,
                      storePlaylistId: s.storePlaylistId ?? '',
                      daysOfWeek: s.daysOfWeek,
                      startTime: hhmm(s.startTime),
                      endTime: hhmm(s.endTime),
                    })
                  }
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(s)}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  {s.isActive ? '중지' : '사용'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s)}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5">
            <h2 className="text-base font-semibold">{form.id ? '편성 수정' : '편성 만들기'}</h2>
            <label className="mt-4 block text-sm text-gray-700">
              이름
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="예: 평일 낮 시간대"
              />
            </label>
            <label className="mt-3 block text-sm text-gray-700">
              재생 목록
              <select
                value={form.storePlaylistId}
                onChange={(e) => setForm({ ...form, storePlaylistId: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">선택하세요</option>
                {publishable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 text-sm text-gray-700">
              요일
              <div className="mt-1 flex gap-1">
                {DAY_LABELS.map((label, day) => {
                  const on = form.daysOfWeek.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          daysOfWeek: on
                            ? form.daysOfWeek.filter((d) => d !== day)
                            : [...form.daysOfWeek, day].sort(),
                        })
                      }
                      className={`h-9 w-9 rounded-md border text-sm ${
                        on ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <label className="flex-1 text-sm text-gray-700">
                시작
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex-1 text-sm text-gray-700">
                종료
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
