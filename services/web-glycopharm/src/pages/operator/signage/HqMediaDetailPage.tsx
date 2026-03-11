/**
 * HQ Media Detail Page — Signage Console
 * WO-O4O-SIGNAGE-CONSOLE-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Film, ExternalLink } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
const SERVICE_KEY = 'glycopharm';

interface MediaDetail {
  id: string;
  name: string;
  description: string | null;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  embedId: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  resolution: string | null;
  fileSize: number | null;
  status: string;
  source: string;
  scope: string;
  tags: string[];
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '대기' },
  { value: 'active', label: '활성' },
  { value: 'archived', label: '아카이브' },
];

const statusConfig: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { text: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

const mediaTypeLabel: Record<string, string> = {
  video: '동영상', image: '이미지', html: 'HTML', text: '텍스트', rich_text: '리치 텍스트', link: '링크',
};

const sourceTypeLabel: Record<string, string> = {
  upload: '업로드', youtube: 'YouTube', vimeo: 'Vimeo', url: 'URL', cms: 'CMS',
};

export default function HqMediaDetailPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();

  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, [getAccessToken]);

  const fetchMedia = useCallback(async () => {
    if (!mediaId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${SERVICE_KEY}/media/${mediaId}`);
      setMedia(data.data || data.media || data);
    } catch (err: any) {
      setError(err?.message || '미디어를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [mediaId, apiFetch]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleStatusChange = async (newStatus: string) => {
    if (!media || media.status === newStatus) return;
    setIsUpdating(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media/${media.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setMedia(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      setError(err?.message || '상태 변경에 실패했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ko-KR'); } catch { return '-'; }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/operator/signage/hq-media')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> HQ 미디어 목록
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '미디어를 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  const sc = statusConfig[media.status] || { text: media.status, cls: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button onClick={() => navigate('/operator/signage/hq-media')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> HQ 미디어 목록
      </button>

      {/* Title */}
      <div className="flex items-center gap-3">
        <Film className="w-6 h-6 text-slate-600" />
        <h1 className="text-2xl font-bold text-slate-800">{media.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
      </div>

      {/* Status Control */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">상태 관리</h2>
        <div className="flex items-center gap-2">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              disabled={isUpdating || media.status === opt.value}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                media.status === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Info */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">미디어 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <InfoRow label="이름" value={media.name} />
          <InfoRow label="미디어 타입" value={mediaTypeLabel[media.mediaType] || media.mediaType} />
          <InfoRow label="소스 타입" value={sourceTypeLabel[media.sourceType] || media.sourceType} />
          <InfoRow label="Scope" value={media.scope} />
          {media.embedId && <InfoRow label="Embed ID" value={media.embedId} mono />}
          {media.duration && <InfoRow label="재생 시간" value={`${media.duration}초`} />}
          {media.resolution && <InfoRow label="해상도" value={media.resolution} />}
          {media.category && <InfoRow label="카테고리" value={media.category} />}
          <InfoRow label="생성일" value={formatDate(media.createdAt)} />
          <InfoRow label="수정일" value={formatDate(media.updatedAt)} />
        </div>
        {media.sourceUrl && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">소스 URL</p>
            <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              {media.sourceUrl.substring(0, 80)}{media.sourceUrl.length > 80 ? '...' : ''} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        {media.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">설명</p>
            <p className="text-sm text-slate-700">{media.description}</p>
          </div>
        )}
        {media.tags && media.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">태그</p>
            <div className="flex flex-wrap gap-1">
              {media.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {media.thumbnailUrl && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
          <img src={media.thumbnailUrl} alt={media.name} className="max-w-md rounded-lg border border-slate-200" />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
