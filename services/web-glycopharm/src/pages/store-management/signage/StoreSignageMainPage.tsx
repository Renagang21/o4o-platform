/**
 * StoreSignageMainPage — GlycoPharm
 * WO-O4O-GLYCOPHARM-SIGNAGE-PHASE1-V1
 *
 * /store/signage
 * 1. HQ 글로벌 플레이리스트 목록 + "내 매장으로 복사" 버튼
 * 2. 내 플레이리스트 목록 + "재생" 버튼
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  Play,
  Copy,
  RefreshCw,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { publicContentApi, type SignagePlaylist } from '@/lib/api/signageV2';
import { assetSnapshotApi } from '@/api/assetSnapshot';
import { api, API_BASE_URL } from '@/lib/apiClient';

const SERVICE_KEY = 'glycopharm';
const SIGNAGE_BASE = `${API_BASE_URL}/api/signage/${SERVICE_KEY}`;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

// ── 내 플레이리스트 fetch (인증 필요) ─────────────────────────────────────────
async function fetchMyPlaylists(): Promise<SignagePlaylist[]> {
  const res = await api.get<{ items?: SignagePlaylist[]; data?: SignagePlaylist[] }>(
    `${SIGNAGE_BASE}/playlists`,
  );
  const body = res.data as any;
  return body?.items ?? body?.data ?? [];
}

// ── PlaylistCard ────────────────────────────────────────────────────────────
function PlaylistCard({
  playlist,
  action,
}: {
  playlist: SignagePlaylist;
  action: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
        <List className="w-5 h-5 text-primary-600" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-800 truncate">{playlist.name}</h3>
        {playlist.description && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{playlist.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <List className="w-3 h-3" /> {playlist.itemCount ?? 0}개
          </span>
          {(playlist.totalDuration ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDuration(playlist.totalDuration)}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function StoreSignageMainPage() {
  const navigate = useNavigate();

  // Global (HQ) playlists
  const [globalPlaylists, setGlobalPlaylists] = useState<SignagePlaylist[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // My playlists
  const [myPlaylists, setMyPlaylists] = useState<SignagePlaylist[]>([]);
  const [myLoading, setMyLoading] = useState(true);
  const [myError, setMyError] = useState<string | null>(null);

  // Copy state (playlistId → status)
  const [copyState, setCopyState] = useState<Record<string, 'idle' | 'copying' | 'done' | 'error'>>({});

  const loadGlobal = useCallback(async () => {
    setGlobalLoading(true);
    setGlobalError(null);
    try {
      const res = await publicContentApi.listPlaylists('hq', SERVICE_KEY, { limit: 30 });
      setGlobalPlaylists(res.success ? (res.data?.items ?? []) : []);
      if (!res.success) setGlobalError('HQ 플레이리스트를 불러오지 못했습니다.');
    } catch {
      setGlobalError('HQ 플레이리스트를 불러오지 못했습니다.');
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  const loadMy = useCallback(async () => {
    setMyLoading(true);
    setMyError(null);
    try {
      const items = await fetchMyPlaylists();
      setMyPlaylists(items);
    } catch {
      setMyError('내 플레이리스트를 불러오지 못했습니다.');
    } finally {
      setMyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGlobal();
    loadMy();
  }, [loadGlobal, loadMy]);

  const handleCopy = async (playlistId: string) => {
    setCopyState((prev) => ({ ...prev, [playlistId]: 'copying' }));
    try {
      await assetSnapshotApi.copy({ sourceAssetId: playlistId, assetType: 'signage' });
      setCopyState((prev) => ({ ...prev, [playlistId]: 'done' }));
      // 내 플레이리스트 갱신
      await loadMy();
    } catch {
      setCopyState((prev) => ({ ...prev, [playlistId]: 'error' }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">디지털 사이니지</h1>
        <p className="text-slate-500 text-sm mt-1">약국 화면에 재생할 플레이리스트를 관리합니다.</p>
      </div>

      {/* ── 내 플레이리스트 ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">내 플레이리스트</h2>
          <button
            onClick={loadMy}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 새로고침
          </button>
        </div>

        {myLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : myError ? (
          <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {myError}
          </div>
        ) : myPlaylists.length === 0 ? (
          <div className="py-8 text-center bg-white rounded-xl border border-slate-200 border-dashed">
            <List className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              아래 HQ 플레이리스트를 복사하여 시작하세요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myPlaylists.map((pl) => (
              <PlaylistCard
                key={pl.id}
                playlist={pl}
                action={
                  <button
                    onClick={() => navigate(`play/${pl.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> 재생
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ── HQ 글로벌 플레이리스트 ────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-slate-800">HQ 플레이리스트</h2>
            <p className="text-xs text-slate-400 mt-0.5">본부에서 제공하는 공식 콘텐츠</p>
          </div>
          <button
            onClick={loadGlobal}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 새로고침
          </button>
        </div>

        {globalLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : globalError ? (
          <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {globalError}
          </div>
        ) : globalPlaylists.length === 0 ? (
          <div className="py-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-400">등록된 HQ 플레이리스트가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {globalPlaylists.map((pl) => {
              const state = copyState[pl.id] ?? 'idle';
              return (
                <PlaylistCard
                  key={pl.id}
                  playlist={pl}
                  action={
                    state === 'done' ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5" /> 복사됨
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCopy(pl.id)}
                        disabled={state === 'copying'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-60"
                      >
                        {state === 'copying' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {state === 'copying' ? '복사 중...' : state === 'error' ? '재시도' : '내 매장으로 복사'}
                      </button>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
