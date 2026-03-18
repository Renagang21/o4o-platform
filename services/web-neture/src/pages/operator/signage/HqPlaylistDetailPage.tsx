/**
 * HqPlaylistDetailPage - HQ 재생목록 상세
 * 재생목록 상세 정보, 항목 목록, 상태 변경 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ListMusic,
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  FileEdit,
  Film,
  GripVertical,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { api, API_BASE_URL } from '../../../lib/apiClient';

const SERVICE_KEY = 'neture';

type PlaylistStatus = 'draft' | 'pending' | 'active' | 'archived';

interface PlaylistDetail {
  id: string;
  name: string;
  description?: string;
  status: PlaylistStatus;
  itemCount?: number;
  totalDuration?: number;
  loop?: boolean;
  transition?: string;
  transitionDuration?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

interface PlaylistMediaItem {
  id: string;
  mediaId: string;
  mediaName?: string;
  mediaType?: string;
  duration?: number;
  sortOrder: number;
  status?: string;
}

const statusConfig: Record<PlaylistStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-700', icon: FileEdit },
  pending: { label: '대기', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  active: { label: '활성', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  archived: { label: '아카이브', bg: 'bg-slate-100', text: 'text-slate-600', icon: Archive },
};

const statusTransitions: Record<PlaylistStatus, { label: string; target: PlaylistStatus; color: string }[]> = {
  draft: [
    { label: '검토 요청', target: 'pending', color: 'bg-amber-600 hover:bg-amber-700' },
    { label: '바로 활성화', target: 'active', color: 'bg-green-600 hover:bg-green-700' },
  ],
  pending: [
    { label: '활성화', target: 'active', color: 'bg-green-600 hover:bg-green-700' },
    { label: '초안으로', target: 'draft', color: 'bg-slate-600 hover:bg-slate-700' },
  ],
  active: [
    { label: '아카이브', target: 'archived', color: 'bg-slate-600 hover:bg-slate-700' },
    { label: '초안으로', target: 'draft', color: 'bg-slate-500 hover:bg-slate-600' },
  ],
  archived: [
    { label: '다시 활성화', target: 'active', color: 'bg-green-600 hover:bg-green-700' },
    { label: '초안으로', target: 'draft', color: 'bg-slate-600 hover:bg-slate-700' },
  ],
};

const mediaTypeLabels: Record<string, string> = {
  video: '동영상',
  image: '이미지',
  html: 'HTML',
  text: '텍스트',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}분 ${secs}초`;
  return `${secs}초`;
}

export default function HqPlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [items, setItems] = useState<PlaylistMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadPlaylist = useCallback(async () => {
    if (!playlistId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${API_BASE_URL}/api/signage/${SERVICE_KEY}/playlists/${playlistId}`);
      const playlistData = data.data || null;
      setPlaylist(playlistData);
      setItems(playlistData?.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '재생목록을 불러오는데 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const handleStatusChange = async (newStatus: PlaylistStatus) => {
    if (!playlistId) return;
    setIsUpdating(true);
    try {
      const { data } = await api.patch(`${API_BASE_URL}/api/signage/${SERVICE_KEY}/hq/playlists/${playlistId}/status`, { status: newStatus });
      if (data.data) {
        setPlaylist(data.data);
      } else {
        await loadPlaylist();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '상태 변경에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-3 text-slate-600">재생목록 로딩 중...</span>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/operator/signage/hq-playlists')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="mt-4 text-red-600">{error || '재생목록을 찾을 수 없습니다.'}</p>
          <button
            onClick={loadPlaylist}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = statusConfig[playlist.status];
  const transitions = statusTransitions[playlist.status] || [];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/operator/signage/hq-playlists')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
        <button
          onClick={loadPlaylist}
          className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* Title */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary-100 rounded-xl">
          <ListMusic className="w-8 h-8 text-primary-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-slate-500 mt-1">{playlist.description}</p>
          )}
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${currentStatus.bg} ${currentStatus.text}`}>
          <StatusIcon className="w-4 h-4" />
          {currentStatus.label}
        </span>
      </div>

      {/* Info Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">재생목록 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-500">상태</p>
            <p className="font-medium text-slate-800 mt-1">{currentStatus.label}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">항목 수</p>
            <p className="font-medium text-slate-800 mt-1">
              {playlist.itemCount != null ? `${playlist.itemCount}개` : `${items.length}개`}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">총 재생시간</p>
            <p className="font-medium text-slate-800 mt-1">
              {playlist.totalDuration != null ? formatDuration(playlist.totalDuration) : '-'}
            </p>
          </div>
          {playlist.loop != null && (
            <div>
              <p className="text-sm text-slate-500">반복 재생</p>
              <p className="font-medium text-slate-800 mt-1">{playlist.loop ? '예' : '아니오'}</p>
            </div>
          )}
          {playlist.transition && (
            <div>
              <p className="text-sm text-slate-500">전환 효과</p>
              <p className="font-medium text-slate-800 mt-1">{playlist.transition}</p>
            </div>
          )}
          {playlist.transitionDuration != null && (
            <div>
              <p className="text-sm text-slate-500">전환 시간</p>
              <p className="font-medium text-slate-800 mt-1">{playlist.transitionDuration}ms</p>
            </div>
          )}
          <div>
            <p className="text-sm text-slate-500">생성일</p>
            <p className="font-medium text-slate-800 mt-1">{formatDate(playlist.createdAt)}</p>
          </div>
          {playlist.updatedAt && (
            <div>
              <p className="text-sm text-slate-500">수정일</p>
              <p className="font-medium text-slate-800 mt-1">{formatDate(playlist.updatedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Management */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">상태 관리</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-slate-500">현재 상태:</span>
          <span className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${currentStatus.bg} ${currentStatus.text}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {currentStatus.label}
          </span>
        </div>
        {transitions.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {transitions.map((t) => (
              <button
                key={t.target}
                onClick={() => handleStatusChange(t.target)}
                disabled={isUpdating}
                className={`px-4 py-2 text-white rounded-lg ${t.color} disabled:opacity-50 transition-colors`}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin inline-block mr-1" />
                ) : null}
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          재생 항목 ({items.length}개)
        </h2>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-sm font-mono w-6 text-center">{index + 1}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <Film className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {item.mediaName || item.mediaId}
                    </p>
                    {item.mediaType && (
                      <p className="text-sm text-slate-500">
                        {mediaTypeLabels[item.mediaType] || item.mediaType}
                      </p>
                    )}
                  </div>
                  {item.duration != null && (
                    <span className="text-sm text-slate-500 whitespace-nowrap">
                      {formatDuration(item.duration)}
                    </span>
                  )}
                  {item.status && (
                    <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded">
                      {item.status}
                    </span>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <Film className="w-6 h-6 text-slate-400" />
            </div>
            <p className="mt-3 text-slate-500">등록된 항목이 없습니다</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      {playlist.metadata && Object.keys(playlist.metadata).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">메타데이터</h2>
          <pre className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 overflow-x-auto">
            {JSON.stringify(playlist.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
