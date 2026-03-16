/**
 * HQ Media Detail Page — Signage HQ Media Detail & Status Management
 *
 * Cookie-based auth (K-Cosmetics)
 * API: GET  /api/signage/k-cosmetics/media/:mediaId
 * API: PATCH /api/signage/k-cosmetics/hq/media/:id/status
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../../lib/apiClient';
const SERVICE_KEY = 'k-cosmetics';

// ─── Types ───────────────────────────────────────────────────

interface MediaDetail {
  id: string;
  name: string;
  mediaType: string;
  sourceType: string;
  sourceUrl: string | null;
  embedId: string | null;
  duration: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Labels ──────────────────────────────────────────────────

const MEDIA_TYPE_LABELS: Record<string, string> = {
  video: '동영상',
  image: '이미지',
  html: 'HTML',
  text: '텍스트',
  rich_text: '리치 텍스트',
  link: '링크',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  upload: '업로드',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  url: 'URL',
  cms: 'CMS',
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'bg-slate-100 text-slate-700' },
  pending: { label: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { label: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { label: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

const STATUS_ACTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '대기' },
  { value: 'active', label: '활성' },
  { value: 'archived', label: '아카이브' },
];

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('/api/v1') ? path.replace(/^\/api\/v1/, '') : `${API_BASE_URL}${path}`;
  const method = (options?.method || 'GET').toUpperCase();
  let body: any;
  if (options?.body && typeof options.body === 'string') {
    try { body = JSON.parse(options.body); } catch { body = options.body; }
  }
  const response = await api.request({ method, url, data: body });
  return response.data;
}

// ─── Component ───────────────────────────────────────────────

export default function HqMediaDetailPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!mediaId) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ success: boolean; data: MediaDetail }>(
          `/api/signage/${SERVICE_KEY}/media/${mediaId}`
        );
        if (data.success) {
          setMedia(data.data);
        }
      } catch (err: any) {
        console.error('Failed to load media detail:', err);
        setError(err?.message || '미디어 정보를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [mediaId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!mediaId || !media || media.status === newStatus) return;
    setIsUpdating(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; data: MediaDetail }>(
        `/api/signage/${SERVICE_KEY}/hq/media/${mediaId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (data.success) {
        setMedia(data.data);
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(err?.message || '상태 변경에 실패했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">미디어 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  // Error / not found state
  if (error && !media) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/operator/signage/hq-media')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          HQ 미디어 목록으로
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '미디어를 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  if (!media) return null;

  const currentStatus = STATUS_CONFIG[media.status] || { label: media.status, cls: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => navigate('/operator/signage/hq-media')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          HQ 미디어 목록으로
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{media.name}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatus.cls}`}>
            {currentStatus.label}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Media Info */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">미디어 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <InfoRow label="이름" value={media.name} />
          <InfoRow label="미디어 타입" value={MEDIA_TYPE_LABELS[media.mediaType] || media.mediaType} />
          <InfoRow label="소스 타입" value={SOURCE_TYPE_LABELS[media.sourceType] || media.sourceType} />
          <InfoRow label="소스 URL" value={media.sourceUrl || '-'} mono />
          <InfoRow label="Embed ID" value={media.embedId || '-'} mono />
          <InfoRow label="재생 시간" value={formatDuration(media.duration)} />
          <InfoRow label="상태" value={currentStatus.label} />
          <InfoRow label="생성일" value={formatDate(media.createdAt)} />
          <InfoRow label="수정일" value={formatDate(media.updatedAt)} />
        </div>
      </div>

      {/* Status Management */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">상태 관리</h2>
        <p className="text-sm text-slate-500 mb-4">미디어의 상태를 변경합니다.</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((action) => {
            const isActive = media.status === action.value;
            return (
              <button
                key={action.value}
                onClick={() => handleStatusChange(action.value)}
                disabled={isActive || isUpdating}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  isActive
                    ? 'bg-pink-600 text-white cursor-default'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {isUpdating ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    변경 중...
                  </span>
                ) : (
                  action.label
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}
