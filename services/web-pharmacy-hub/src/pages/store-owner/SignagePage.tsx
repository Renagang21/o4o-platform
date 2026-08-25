/**
 * SignagePage (약국 경영자) — 디지털 사이니지
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 D)
 *
 * canonical 구조 그대로: 재생 단위 = `store_playlists`, 항목 = 매장 소유 스냅샷.
 * 항목을 추가하면 원본이 아니라 **매장 사본**이 만들어지므로, 이후 원본이 바뀌어도
 * 재생 목록은 그대로 유지된다.
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#69 · #70):
 *   KPA 와 같은 3탭 구조로 맞춘다 — [내 동영상] [재생 목록] [편성].
 *   동영상 원장은 공통 `signage_media`, 편성 원장은 공통 `signage_schedules` 다.
 *   매장은 자기 자료함(W8) 자료와 자기가 등록한 동영상을 재생 목록에 담는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  fetchPlaylists,
  fetchSignageSources,
  createPlaylist,
  updatePlaylist,
  archivePlaylist,
  fetchPlaylistItems,
  addItemFromLibrary,
  addItemFromMedia,
  deletePlaylistItem,
  type Playlist,
  type PlaylistItem,
  type PlaylistType,
  type SignageSources,
} from '../../lib/api/pharmacyHubStoreSignage';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';
import SignageMediaPanel from './signage/SignageMediaPanel';
import SignageSchedulePanel from './signage/SignageSchedulePanel';

/** 탭 = 경로. KPA 도 videos·schedules 를 별도 경로로 두므로 딥링크·사이드바가 짝을 이룬다. */
const TABS = [
  { key: 'media', label: '내 동영상', path: '/store-owner/signage/media' },
  { key: 'playlists', label: '재생 목록', path: '/store-owner/signage' },
  { key: 'schedules', label: '편성', path: '/store-owner/signage/schedules' },
] as const;

export default function StoreOwnerSignagePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname.endsWith('/media')
    ? 'media'
    : location.pathname.endsWith('/schedules')
      ? 'schedules'
      : 'playlists';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">디지털 사이니지</h1>
        <p className="mt-1 text-sm text-gray-500">
          매장 화면에 돌릴 동영상을 등록하고, 재생 목록으로 묶고, 요일·시간대로 편성합니다.
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => navigate(t.path)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              active === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'media' ? (
        <SignageMediaPanel />
      ) : active === 'schedules' ? (
        <SignageSchedulePanel />
      ) : (
        <PlaylistsPanel />
      )}
    </div>
  );
}

function PlaylistsPanel() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchPlaylists()
      .then((r) => {
        setConnection(r.storeConnection);
        setPlaylists(r.items);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '재생 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleArchive = async (p: Playlist) => {
    if (!window.confirm(`"${p.name}" 재생 목록을 보관할까요? 매장 화면에서 내려갑니다.`)) return;
    try {
      await archivePlaylist(p.id);
      if (openId === p.id) setOpenId(null);
      load();
    } catch (e: any) {
      window.alert(e?.message || '처리하지 못했습니다.');
    }
  };

  const handleTogglePublish = async (p: Playlist) => {
    try {
      await updatePlaylist(p.id, {
        publishStatus: p.publishStatus === 'published' ? 'draft' : 'published',
      });
      load();
    } catch (e: any) {
      window.alert(e?.message || '처리하지 못했습니다.');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-gray-500">
          자료함 자료와 내 동영상을 순서대로 담아 재생 목록을 만듭니다.
        </p>
        {connection?.status === 'connected' && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            재생 목록 만들기
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' ? (
        <StoreConnectionNotice connection={connection} subject="매장 사이니지" />
      ) : loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : playlists.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">재생 목록이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-400">
            "재생 목록 만들기" 로 시작하세요. 담을 자료는{' '}
            <Link to="/store-owner/library/resources" className="text-blue-600 hover:underline">
              자료함
            </Link>
            에서 먼저 등록합니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {playlists.map((p) => (
            <li key={p.id} className="rounded-lg border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                      {p.playlistType === 'SINGLE' ? '단일 재생' : '목록 재생'}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 ${
                        p.publishStatus === 'published'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.publishStatus === 'published' ? '재생 중' : '작성 중'}
                    </span>
                    <span>항목 {p.itemCount}개</span>
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === p.id ? null : p.id)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {openId === p.id ? '접기' : '항목 관리'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(p)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {p.publishStatus === 'published' ? '내리기' : '재생 시작'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(p)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    보관
                  </button>
                </div>
              </div>

              {openId === p.id && <PlaylistItems playlist={p} onChanged={load} />}
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <CreatePlaylistDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

// ─── 항목 관리 ───────────────────────────────────────────────────────────────

function PlaylistItems({ playlist, onChanged }: { playlist: Playlist; onChanged: () => void }) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [sources, setSources] = useState<SignageSources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchPlaylistItems(playlist.id)
      .then((i) => {
        setItems(i);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '항목을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [playlist.id]);

  useEffect(() => {
    load();
    fetchSignageSources()
      .then(setSources)
      .catch(() => setSources(null));
  }, [load]);

  const handleAdd = async (kind: 'library' | 'media', id: string) => {
    setAdding(true);
    try {
      if (kind === 'library') await addItemFromLibrary(playlist.id, id);
      else await addItemFromMedia(playlist.id, id);
      load();
      onChanged();
    } catch (e: any) {
      window.alert(e?.message || '추가하지 못했습니다.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (item: PlaylistItem) => {
    try {
      await deletePlaylistItem(playlist.id, item.id);
      load();
      onChanged();
    } catch (e: any) {
      window.alert(e?.message || '삭제하지 못했습니다.');
    }
  };

  const hasSources = (sources?.libraryAssets.length ?? 0) + (sources?.media.length ?? 0) > 0;

  return (
    <div className="border-t border-gray-100 px-4 py-3">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="mb-3 text-sm text-gray-400">담긴 항목이 없습니다.</p>
      ) : (
        <ol className="mb-3 space-y-1">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm">
                <span className="mr-2 text-xs text-gray-400">{idx + 1}</span>
                {item.title || '(제목 없음)'}
                {item.isForced && (
                  <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                    운영자 편성
                  </span>
                )}
              </span>
              {/* 운영자 강제 편성 항목은 매장이 지울 수 없다 — 버튼을 아예 노출하지 않는다. */}
              {!item.isLocked && (
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="flex-shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  빼기
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      <div>
        <p className="mb-1 text-xs font-semibold text-gray-500">항목 추가</p>
        {!sources ? (
          <p className="text-sm text-gray-400">자료를 불러오는 중…</p>
        ) : !hasSources ? (
          <p className="text-sm text-gray-400">
            추가할 자료가 없습니다.{' '}
            <Link to="/store-owner/library/resources" className="text-blue-600 hover:underline">
              자료함
            </Link>
            에서 먼저 등록해 주세요.
          </p>
        ) : (
          <select
            aria-label="추가할 자료"
            disabled={adding}
            value=""
            onChange={(e) => {
              const [kind, id] = e.target.value.split(':');
              if (id) handleAdd(kind as 'library' | 'media', id);
            }}
            className="w-full max-w-md rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">선택하면 목록에 추가됩니다</option>
            {sources.libraryAssets.length > 0 && (
              <optgroup label="자료함">
                {sources.libraryAssets.map((a) => (
                  <option key={a.id} value={`library:${a.id}`}>
                    {a.title}
                  </option>
                ))}
              </optgroup>
            )}
            {sources.media.length > 0 && (
              <optgroup label="매장 미디어">
                {sources.media.map((m) => (
                  <option key={m.id} value={`media:${m.id}`}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
      </div>
    </div>
  );
}

// ─── 재생 목록 만들기 ────────────────────────────────────────────────────────

function CreatePlaylistDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [playlistType, setPlaylistType] = useState<PlaylistType>('LIST');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPlaylist(name.trim(), playlistType);
      onCreated();
    } catch (e: any) {
      setError(e?.message || '만들지 못했습니다.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label="재생 목록 만들기"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-base font-semibold">재생 목록 만들기</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-pl-name">
              이름
            </label>
            <input
              id="ph-pl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 매장 앞 화면"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-pl-type">
              재생 방식
            </label>
            <select
              id="ph-pl-type"
              value={playlistType}
              onChange={(e) => setPlaylistType(e.target.value as PlaylistType)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="LIST">목록 재생 — 여러 자료를 순서대로</option>
              <option value="SINGLE">단일 재생 — 자료 하나만</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '만드는 중…' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}
