/**
 * MediaDeleteDialog — 사이니지 미디어 삭제 안전 다이얼로그
 * WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1 (Scope 8/9)
 *
 * 삭제 클릭 시 먼저 사용처 API 를 조회한다.
 *   - 미사용 → 일반 삭제 확인(destructive confirm) 후 삭제.
 *   - 사용 중 → 삭제 확인이 아니라 "사용처 경고"를 띄운다.
 *       HQ/매장 사용처 개수와 목록을 보여주고, HQ 플레이리스트 상세로 이동 링크를 제공한다.
 *       강제 삭제 버튼은 제공하지 않는다. "먼저 플레이리스트에서 제거하세요" 안내만 한다.
 *
 * 매장 플레이리스트 전용 운영자 화면은 존재하지 않으므로, 매장 사용처는
 * 매장명·플레이리스트명 텍스트로만 표기한다(존재하지 않는 route 를 만들지 않는다).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Loader2, Trash2, X } from 'lucide-react';

export interface MediaUsageData {
  mediaId: string;
  inUse: boolean;
  directPlaylistUsageCount: number;
  snapshotCount: number;
  referencedSnapshotCount: number;
  storePlaylistUsageCount: number;
  storeCount: number;
  tagCount: number;
  usages: {
    hqPlaylists: Array<{ playlistId: string; playlistName: string; itemCount: number; status?: string }>;
    storePlaylists: Array<{ storeId: string; storeName?: string | null; playlistId: string; playlistName?: string | null; snapshotId: string; itemCount: number }>;
  };
}

type Phase = 'checking' | 'in-use' | 'confirm' | 'deleting';

interface Props {
  media: { id: string; name: string };
  /** 인증 포함 fetch 헬퍼 — { success, data } 또는 raw JSON 을 반환. */
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
  serviceKey: string;
  onDeleted: () => void;
  onClose: () => void;
}

export default function MediaDeleteDialog({ media, apiFetch, serviceKey, onDeleted, onClose }: Props) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('checking');
  const [usage, setUsage] = useState<MediaUsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/signage/${serviceKey}/hq/media/${media.id}/usage`);
        const data: MediaUsageData = res?.data ?? res;
        if (!alive) return;
        setUsage(data);
        setPhase(data.inUse ? 'in-use' : 'confirm');
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || '사용처를 확인할 수 없습니다');
        setPhase('confirm'); // 조회 실패 시에도 강제 삭제하지 않고 확인 단계로 — 삭제는 서버 가드가 최종 차단
      }
    })();
    return () => { alive = false; };
  }, [apiFetch, serviceKey, media.id]);

  const handleConfirmDelete = async () => {
    setPhase('deleting');
    setError(null);
    try {
      await apiFetch(`/api/signage/${serviceKey}/hq/media/${media.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err: any) {
      // 서버 사용처 가드(409)에 걸리면 다시 경고 화면으로 전환
      const msg = err?.message || '삭제에 실패했습니다';
      if (/사용 중|IN_USE/i.test(msg)) {
        try {
          const res = await apiFetch(`/api/signage/${serviceKey}/hq/media/${media.id}/usage`);
          setUsage(res?.data ?? res);
          setPhase('in-use');
          return;
        } catch { /* fall through */ }
      }
      setError(msg);
      setPhase('confirm');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && phase !== 'deleting') onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            {phase === 'in-use'
              ? <><AlertTriangle className="w-5 h-5 text-amber-500" /> 삭제할 수 없는 미디어</>
              : <><Trash2 className="w-5 h-5 text-red-500" /> 미디어 완전 삭제</>}
          </h2>
          <button onClick={onClose} disabled={phase === 'deleting'} className="text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-700 font-medium break-all">"{media.name}"</p>

          {phase === 'checking' && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> 사용처를 확인하는 중...
            </div>
          )}

          {phase === 'in-use' && usage && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                이 미디어는 아래 위치에서 <strong>사용 중</strong>이라 삭제할 수 없습니다.
                <br />먼저 모든 플레이리스트에서 이 미디어를 제거한 뒤 다시 시도하세요.
              </div>

              <div className="flex gap-4 text-xs text-slate-500">
                <span>HQ 플레이리스트 <strong className="text-slate-800">{usage.directPlaylistUsageCount}</strong></span>
                <span>매장 플레이리스트 <strong className="text-slate-800">{usage.storePlaylistUsageCount}</strong></span>
                <span>매장 <strong className="text-slate-800">{usage.storeCount}</strong></span>
              </div>

              {usage.usages.hqPlaylists.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">HQ 플레이리스트</p>
                  <ul className="space-y-1">
                    {usage.usages.hqPlaylists.map((p) => (
                      <li key={p.playlistId}>
                        <button
                          onClick={() => navigate(`/operator/signage/hq-playlists/${p.playlistId}`)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-left"
                        >
                          <span className="truncate text-slate-700">{p.playlistName || p.playlistId}</span>
                          <span className="flex items-center gap-1 text-xs text-blue-600 shrink-0">
                            {p.itemCount}개 항목 <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {usage.usages.storePlaylists.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">매장 플레이리스트 (매장이 가져간 사본)</p>
                  <ul className="space-y-1">
                    {usage.usages.storePlaylists.map((s) => (
                      <li
                        key={`${s.storeId}:${s.playlistId}:${s.snapshotId}`}
                        className="px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-600"
                      >
                        <span className="truncate">{s.storeName || s.storeId}</span>
                        <span className="text-slate-400"> · {s.playlistName || s.playlistId} · {s.itemCount}개 항목</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-400 mt-1">
                    매장 플레이리스트는 각 매장에서 직접 관리합니다. 필요 시 매장에 제거를 요청하세요.
                  </p>
                </div>
              )}
            </div>
          )}

          {phase !== 'checking' && phase !== 'in-use' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              삭제 시 이 미디어와 연결된 항목이 함께 제거됩니다. 이 작업은 되돌릴 수 없습니다.
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 pb-5">
          <button
            onClick={onClose}
            disabled={phase === 'deleting'}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {phase === 'in-use' ? '닫기' : '취소'}
          </button>
          {phase !== 'in-use' && (
            <button
              onClick={handleConfirmDelete}
              disabled={phase === 'checking' || phase === 'deleting'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {phase === 'deleting' ? <><Loader2 className="w-4 h-4 animate-spin" /> 삭제 중...</> : '완전 삭제'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
