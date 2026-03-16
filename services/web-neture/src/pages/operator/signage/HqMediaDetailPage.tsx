/**
 * HqMediaDetailPage - HQ 미디어 상세
 * 미디어 상세 정보 및 상태 변경 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Film,
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  FileEdit,
  ExternalLink,
} from 'lucide-react';
import { api, API_BASE_URL } from '../../../lib/apiClient';

const SERVICE_KEY = 'neture';

type MediaStatus = 'draft' | 'pending' | 'active' | 'archived';

interface MediaDetail {
  id: string;
  name: string;
  mediaType: string;
  sourceType: string;
  sourceUrl?: string;
  status: MediaStatus;
  description?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

const statusConfig: Record<MediaStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-700', icon: FileEdit },
  pending: { label: '대기', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  active: { label: '활성', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  archived: { label: '아카이브', bg: 'bg-slate-100', text: 'text-slate-600', icon: Archive },
};

const statusTransitions: Record<MediaStatus, { label: string; target: MediaStatus; color: string }[]> = {
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

const sourceTypeLabels: Record<string, string> = {
  url: 'URL',
  upload: '업로드',
  embed: '임베드',
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HqMediaDetailPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadMedia = useCallback(async () => {
    if (!mediaId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${API_BASE_URL}/api/signage/${SERVICE_KEY}/media/${mediaId}`);
      setMedia(data.data || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '미디어를 불러오는데 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleStatusChange = async (newStatus: MediaStatus) => {
    if (!mediaId) return;
    setIsUpdating(true);
    try {
      const { data } = await api.patch(`${API_BASE_URL}/api/signage/${SERVICE_KEY}/hq/media/${mediaId}/status`, { status: newStatus });
      if (data.data) {
        setMedia(data.data);
      } else {
        await loadMedia();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '상태 변경에 실패했습니다.';
      alert(message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-3 text-slate-600">미디어 로딩 중...</span>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/workspace/operator/signage/hq-media')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="mt-4 text-red-600">{error || '미디어를 찾을 수 없습니다.'}</p>
          <button
            onClick={loadMedia}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = statusConfig[media.status];
  const transitions = statusTransitions[media.status] || [];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/workspace/operator/signage/hq-media')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
        <button
          onClick={loadMedia}
          className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* Title */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Film className="w-8 h-8 text-primary-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{media.name}</h1>
          {media.description && (
            <p className="text-slate-500 mt-1">{media.description}</p>
          )}
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${currentStatus.bg} ${currentStatus.text}`}>
          <StatusIcon className="w-4 h-4" />
          {currentStatus.label}
        </span>
      </div>

      {/* Info Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">미디어 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-500">미디어 타입</p>
            <p className="font-medium text-slate-800 mt-1">
              {mediaTypeLabels[media.mediaType] || media.mediaType}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">소스 타입</p>
            <p className="font-medium text-slate-800 mt-1">
              {sourceTypeLabels[media.sourceType] || media.sourceType}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">상태</p>
            <p className="font-medium text-slate-800 mt-1">{currentStatus.label}</p>
          </div>
          {media.duration != null && (
            <div>
              <p className="text-sm text-slate-500">재생 시간</p>
              <p className="font-medium text-slate-800 mt-1">{media.duration}초</p>
            </div>
          )}
          {media.width != null && media.height != null && (
            <div>
              <p className="text-sm text-slate-500">해상도</p>
              <p className="font-medium text-slate-800 mt-1">{media.width} x {media.height}</p>
            </div>
          )}
          {media.fileSize != null && (
            <div>
              <p className="text-sm text-slate-500">파일 크기</p>
              <p className="font-medium text-slate-800 mt-1">{formatFileSize(media.fileSize)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-slate-500">생성일</p>
            <p className="font-medium text-slate-800 mt-1">{formatDate(media.createdAt)}</p>
          </div>
          {media.updatedAt && (
            <div>
              <p className="text-sm text-slate-500">수정일</p>
              <p className="font-medium text-slate-800 mt-1">{formatDate(media.updatedAt)}</p>
            </div>
          )}
          {media.sourceUrl && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-sm text-slate-500">소스 URL</p>
              <a
                href={media.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700 mt-1 break-all"
              >
                {media.sourceUrl}
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
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

      {/* Preview */}
      {media.sourceUrl && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
          {media.mediaType === 'image' && (
            <div className="flex justify-center">
              <img
                src={media.sourceUrl}
                alt={media.name}
                className="max-w-full max-h-96 rounded-lg object-contain border border-slate-100"
              />
            </div>
          )}
          {media.mediaType === 'video' && (
            <div className="flex justify-center">
              <video
                src={media.sourceUrl}
                controls
                className="max-w-full max-h-96 rounded-lg"
              >
                브라우저가 동영상을 지원하지 않습니다.
              </video>
            </div>
          )}
          {(media.mediaType === 'html' || media.mediaType === 'text') && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <a
                href={media.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
              >
                <ExternalLink className="w-4 h-4" />
                외부에서 보기
              </a>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      {media.metadata && Object.keys(media.metadata).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">메타데이터</h2>
          <pre className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 overflow-x-auto">
            {JSON.stringify(media.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
