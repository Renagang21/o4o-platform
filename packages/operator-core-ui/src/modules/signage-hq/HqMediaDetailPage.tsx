/**
 * HqMediaDetailPage — 운영자 사이니지 HQ 미디어 상세 (공통 콘솔)
 *
 * WO-O4O-SIGNAGE-CONSOLE-V1 (원본)
 * WO-KPA-SIGNAGE-FULLSCREEN-PLAYER-V1: YouTube/Vimeo embed 미리보기 + 전체화면 재생 링크
 * WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1: 사용처 선조회 삭제 게이트
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   KPA/K-Cosmetics 중복을 단일 콘솔로 수렴.
 *
 * API: GET   /api/signage/:serviceKey/media/:mediaId
 *      PATCH /api/signage/:serviceKey/hq/media/:id/status
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Film, ExternalLink, Trash2, Maximize } from 'lucide-react';
import { MediaDeleteDialog } from './MediaDeleteDialog';
import {
  SIGNAGE_STATUS_CONFIG,
  SIGNAGE_MEDIA_TYPE_LABEL,
  SIGNAGE_SOURCE_TYPE_LABEL,
  type SignageMediaDetail,
  type SignageHqDetailPageProps,
} from './types';

const statusOptions = [
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '대기' },
  { value: 'active', label: '활성' },
  { value: 'archived', label: '아카이브' },
];

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

export function HqMediaDetailPage({ id: mediaId, apiFetch, config, navigate }: SignageHqDetailPageProps) {
  const { serviceKey, accent, routeBase } = config;
  const listPath = `${routeBase}/hq-media`;

  const [media, setMedia] = useState<SignageMediaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchMedia = useCallback(async () => {
    if (!mediaId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${serviceKey}/media/${mediaId}`);
      setMedia(data.data || data.media || data);
    } catch (err: any) {
      setError(err?.message || '미디어를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [mediaId, apiFetch, serviceKey]);

  useEffect(() => { void fetchMedia(); }, [fetchMedia]);

  const handleStatusChange = async (newStatus: string) => {
    if (!media || media.status === newStatus) return;
    setIsUpdating(true);
    try {
      await apiFetch(`/api/signage/${serviceKey}/hq/media/${media.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setMedia((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: any) {
      setError(err?.message || '상태 변경에 실패했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('ko-KR'); } catch { return '-'; }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className={`w-8 h-8 border-2 ${accent.spinnerBorder} border-t-transparent rounded-full animate-spin`} />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(listPath)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> HQ 미디어 목록
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '미디어를 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  const sc = SIGNAGE_STATUS_CONFIG[media.status] || { text: media.status, cls: 'bg-slate-100 text-slate-600' };
  const src = media.sourceUrl || '';

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate(listPath)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> HQ 미디어 목록
      </button>

      {/* Title */}
      <div className="flex items-center gap-3">
        <Film className={`w-6 h-6 ${accent.icon}`} />
        <h1 className="text-2xl font-bold text-slate-800">{media.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
        <div className="ml-auto">
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" /> 완전 삭제
          </button>
        </div>
      </div>

      {/* Status Control */}
      <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">상태 관리</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              disabled={isUpdating || media.status === opt.value}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                media.status === opt.value
                  ? `${accent.primaryButton} text-white`
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
      <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">미디어 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <InfoRow label="이름" value={media.name} />
          <InfoRow label="미디어 타입" value={SIGNAGE_MEDIA_TYPE_LABEL[media.mediaType] || media.mediaType} />
          <InfoRow label="소스 타입" value={SIGNAGE_SOURCE_TYPE_LABEL[media.sourceType] || media.sourceType} />
          <InfoRow label="상태" value={sc.text} />
          <InfoRow label="공개 여부" value={media.isPublic ? '공개' : '비공개'} />
          <InfoRow label="Scope" value={media.scope || '-'} />
          <InfoRow label="생성일" value={formatDate(media.createdAt)} />
          <InfoRow label="수정일" value={formatDate(media.updatedAt)} />
        </div>
        {src && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">소스 URL</p>
            <a
              href={src} target="_blank" rel="noopener noreferrer"
              className={`text-sm ${accent.linkText} hover:underline flex items-center gap-1`}
            >
              {src.substring(0, 80)}{src.length > 80 ? '...' : ''} <ExternalLink className="w-3 h-3" />
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
      {media.mediaType === 'image' && src && (
        <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
          <img src={src} alt={media.name} className="max-w-md rounded-lg border border-slate-200" />
        </div>
      )}
      {media.mediaType === 'video' && src && (
        <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
          <video src={src} controls className="max-w-md rounded-lg border border-slate-200" />
        </div>
      )}
      {(media.sourceType === 'youtube' || src.includes('youtu')) && (() => {
        const ytMatch = src.match(/(?:youtu\.be\/|v=)([\w-]+)/);
        return ytMatch ? (
          <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
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
      {(media.sourceType === 'vimeo' || src.includes('vimeo')) && (() => {
        const vmMatch = src.match(/vimeo\.com\/(\d+)/);
        return vmMatch ? (
          <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
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
      {media.thumbnailUrl && media.mediaType !== 'image' && media.mediaType !== 'video'
        && !src.includes('youtu') && !src.includes('vimeo') && (
        <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">썸네일</h2>
          <img src={media.thumbnailUrl} alt={media.name} className="max-w-md rounded-lg border border-slate-200" />
        </div>
      )}

      {/* 전체화면 재생 링크 (별도 탭 — 공개 플레이어 route) */}
      <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
        <a
          href={`/signage/play/media/${media.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-4 py-2 ${accent.primaryButton} text-white rounded-lg transition-colors text-sm font-medium`}
        >
          <Maximize className="w-4 h-4" /> 전체화면 재생 (새 탭)
        </a>
      </div>

      {showDeleteDialog && (
        <MediaDeleteDialog
          media={{ id: media.id, name: media.name }}
          apiFetch={apiFetch}
          serviceKey={serviceKey}
          routeBase={routeBase}
          linkTextClass={accent.linkText}
          onClose={() => setShowDeleteDialog(false)}
          onDeleted={() => { setShowDeleteDialog(false); navigate(listPath); }}
        />
      )}
    </div>
  );
}
