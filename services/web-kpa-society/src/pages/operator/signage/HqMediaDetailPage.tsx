/**
 * HQ Media Detail Page — Signage Console (KPA Society)
 * WO-O4O-SIGNAGE-CONSOLE-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../../contexts/AuthContext';
import { ArrowLeft, Film, ExternalLink, Trash2, Maximize } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';

interface MediaDetail {
  id: string;
  name: string;
  description: string | null;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  status: string;
  isPublic: boolean;
  source: string;
  scope: string;
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
  upload: '업로드', url: 'URL', embed: '임베드', youtube: 'YouTube', vimeo: 'Vimeo', cms: 'CMS',
};

export default function HqMediaDetailPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

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

  const handleDelete = async () => {
    if (!media) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media/${media.id}`, { method: 'DELETE' });
      navigate('/operator/signage/hq-media');
    } catch (err: any) {
      setError(err?.message || '삭제에 실패했습니다');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ko-KR'); } catch { return '-'; }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
        <Film className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">{media.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
        <div className="ml-auto">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" /> 완전 삭제
          </button>
        </div>
      </div>

      {/* Status Control */}
      <div className="bg-white rounded-xl border border-blue-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">상태 관리</h2>
        <div className="flex items-center gap-2">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              disabled={isUpdating || media.status === opt.value}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                media.status === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* HUB Visibility Indicator */}
        <div className={`mt-4 px-4 py-3 rounded-lg text-sm ${
          media.status === 'active'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-slate-50 border border-slate-200 text-slate-500'
        }`}>
          {media.status === 'active' ? (
            <p><span className="font-medium">매장 HUB 노출 중</span> — 이 미디어는 매장 HUB 사이니지 라이브러리의 "운영자" 탭에 표시됩니다.</p>
          ) : (
            <p><span className="font-medium">매장 HUB 미노출</span> — 활성 상태로 변경하면 매장 HUB 사이니지 라이브러리에 노출됩니다.</p>
          )}
        </div>
      </div>

      {/* Media Info */}
      <div className="bg-white rounded-xl border border-blue-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">미디어 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <InfoRow label="이름" value={media.name} />
          <InfoRow label="미디어 타입" value={mediaTypeLabel[media.mediaType] || media.mediaType} />
          <InfoRow label="소스 타입" value={sourceTypeLabel[media.sourceType] || media.sourceType} />
          <InfoRow label="상태" value={sc.text} />
          <InfoRow label="공개 여부" value={media.isPublic ? '공개' : '비공개'} />
          <InfoRow label="Scope" value={media.scope || '-'} />
          <InfoRow label="생성일" value={formatDate(media.createdAt)} />
          <InfoRow label="수정일" value={formatDate(media.updatedAt)} />
        </div>
        {media.sourceUrl && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">소스 URL</p>
            <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
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
      </div>

      {/* Preview */}
      {media.mediaType === 'image' && media.sourceUrl && (
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
          <img src={media.sourceUrl} alt={media.name} className="max-w-md rounded-lg border border-slate-200" />
        </div>
      )}
      {media.mediaType === 'video' && media.sourceUrl && (
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
          <video src={media.sourceUrl} controls className="max-w-md rounded-lg border border-slate-200" />
        </div>
      )}
      {/* WO-KPA-SIGNAGE-FULLSCREEN-PLAYER-V1: YouTube/Vimeo embed preview */}
      {(media.sourceType === 'youtube' || (media.sourceUrl && media.sourceUrl.includes('youtu'))) && (() => {
        const ytMatch = media.sourceUrl.match(/(?:youtu\.be\/|v=)([\w-]+)/);
        return ytMatch ? (
          <div className="bg-white rounded-xl border border-blue-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
            <iframe
              src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0`}
              className="w-full max-w-lg aspect-video rounded-lg border border-slate-200"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={media.name}
            />
          </div>
        ) : null;
      })()}
      {(media.sourceType === 'vimeo' || (media.sourceUrl && media.sourceUrl.includes('vimeo'))) && (() => {
        const vmMatch = media.sourceUrl.match(/vimeo\.com\/(\d+)/);
        return vmMatch ? (
          <div className="bg-white rounded-xl border border-blue-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
            <iframe
              src={`https://player.vimeo.com/video/${vmMatch[1]}?title=0&byline=0&portrait=0`}
              className="w-full max-w-lg aspect-video rounded-lg border border-slate-200"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={media.name}
            />
          </div>
        ) : null;
      })()}
      {media.thumbnailUrl && media.mediaType !== 'image' && media.mediaType !== 'video' && !media.sourceUrl?.includes('youtu') && !media.sourceUrl?.includes('vimeo') && (
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">썸네일</h2>
          <img src={media.thumbnailUrl} alt={media.name} className="max-w-md rounded-lg border border-slate-200" />
        </div>
      )}

      {/* WO-KPA-SIGNAGE-FULLSCREEN-PLAYER-V1: 전체화면 재생 링크 */}
      <div className="bg-white rounded-xl border border-blue-100 p-6">
        <a
          href={`/signage/play/media/${media.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Maximize className="w-4 h-4" /> 전체화면 재생 (새 탭)
        </a>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">미디어 완전 삭제</h3>
            <p className="text-sm text-slate-500 mb-4">이 작업은 되돌릴 수 없습니다.</p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium text-slate-700">{media.name}</p>
              <p className="text-slate-400 text-xs mt-1">타입: HQ 미디어 · 삭제 시 연결된 플레이리스트 항목도 함께 제거됩니다</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">취소</button>
              <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? '삭제 중...' : '완전 삭제'}
              </button>
            </div>
          </div>
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
