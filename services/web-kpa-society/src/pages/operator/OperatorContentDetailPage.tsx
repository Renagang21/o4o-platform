/**
 * OperatorContentDetailPage — 콘텐츠 상세/편집
 *
 * WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1
 * WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1: BlockRenderer 패키지 통합
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Tag, FileText, Loader2, AlertCircle,
  Sparkles, Copy, CheckCircle2, ExternalLink,
} from 'lucide-react';
import { BlockRenderer } from '@o4o/block-renderer';
import { getAccessToken } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { kpaBlocksToRendererBlocks, type KpaBlock } from '../../utils/kpa-block-adapter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentDetail {
  id: string;
  title: string;
  summary: string | null;
  blocks: KpaBlock[];
  tags: string[];
  category: string | null;
  thumbnail_url: string | null;
  source_type: string;
  source_url: string | null;
  source_file_name: string | null;
  status: 'draft' | 'ready';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || body?.error || `API error ${res.status}`);
  return body;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OperatorContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState<'summarize' | 'extract' | 'tag' | null>(null);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    apiFetch<{ success: boolean; data: ContentDetail }>(`/api/v1/kpa/contents/${id}`)
      .then(res => { if (res.success) setContent(res.data); })
      .catch(e => setError(e?.message || '콘텐츠를 불러올 수 없습니다'))
      .finally(() => setIsLoading(false));
  }, [id]);

  // ─── AI actions ───────────────────────────────────────────────────────────
  const handleAISummarize = async () => {
    if (!id || !content) return;
    setAiLoading('summarize');
    try {
      const res = await apiFetch<{ success: boolean; data: { summary: string } }>(
        `/api/v1/kpa/contents/${id}/ai/summarize`, { method: 'POST', body: '{}' }
      );
      setContent(c => c ? { ...c, summary: res.data.summary } : c);
      toast.success('요약이 생성되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '요약 생성에 실패했습니다');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAIExtract = async () => {
    if (!id || !content) return;
    setAiLoading('extract');
    try {
      const res = await apiFetch<{ success: boolean; data: { keyPoints: string[] } }>(
        `/api/v1/kpa/contents/${id}/ai/extract`, { method: 'POST', body: '{}' }
      );
      setKeyPoints(res.data.keyPoints);
      toast.success('핵심 내용이 추출되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '핵심 추출에 실패했습니다');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAITag = async () => {
    if (!id || !content) return;
    setAiLoading('tag');
    try {
      const res = await apiFetch<{ success: boolean; data: { suggestedTags: string[] } }>(
        `/api/v1/kpa/contents/${id}/ai/tag`, { method: 'POST', body: '{}' }
      );
      setSuggestedTags(res.data.suggestedTags);
      toast.success('태그가 추천되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '태그 추천에 실패했습니다');
    } finally {
      setAiLoading(null);
    }
  };

  // ─── Copy to Store ────────────────────────────────────────────────────────
  const handleCopyToStore = async () => {
    if (!id) return;
    setIsCopying(true);
    try {
      await apiFetch(`/api/v1/kpa/contents/${id}/copy-to-store`, { method: 'POST', body: '{}' });
      toast.success('내 공간에 복사되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '복사에 실패했습니다');
    } finally {
      setIsCopying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm">{error || '콘텐츠를 찾을 수 없습니다'}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-blue-500 underline">돌아가기</button>
      </div>
    );
  }

  const STATUS_CLS: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700',
    ready: 'bg-green-100 text-green-700',
  };
  const STATUS_LABEL: Record<string, string> = { draft: '초안', ready: '완료' };
  const SOURCE_LABEL: Record<string, string> = { upload: '파일', external: '링크', manual: '직접 입력' };

  return (
    <div className="space-y-6 max-w-4xl">

      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/operator/docs')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{content.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[content.status] || STATUS_CLS.draft}`}>
              {STATUS_LABEL[content.status] || content.status}
            </span>
            <span className="text-xs text-slate-400">{SOURCE_LABEL[content.source_type] || content.source_type}</span>
            {content.category && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{content.category}</span>
            )}
          </div>
        </div>
        {/* 내 공간에 복사 */}
        <button
          onClick={handleCopyToStore}
          disabled={isCopying}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {isCopying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          내 공간에 복사
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* 메인 콘텐츠 */}
        <div className="col-span-2 space-y-5">

          {/* 요약 */}
          {content.summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-medium text-blue-600 mb-1">요약</p>
              <p className="text-sm text-blue-800 leading-relaxed">{content.summary}</p>
            </div>
          )}

          {/* 핵심 추출 결과 */}
          {keyPoints.length > 0 && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <p className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />핵심 내용
              </p>
              <ul className="space-y-1">
                {keyPoints.map((pt, i) => (
                  <li key={i} className="text-sm text-purple-800 flex items-start gap-2">
                    <span className="text-purple-400 font-medium">{i + 1}.</span>{pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 블록 콘텐츠 */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-medium text-slate-600">콘텐츠</h2>
            </div>
            {content.blocks && content.blocks.length > 0 ? (
              <BlockRenderer
                blocks={kpaBlocksToRendererBlocks(content.blocks)}
                className="space-y-4"
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">
                등록된 콘텐츠 블록이 없습니다.
              </p>
            )}
          </div>

          {/* 원본 */}
          {(content.source_url || content.source_file_name) && (
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-medium text-slate-500 mb-2">원본</p>
              {content.source_url && (
                <a
                  href={content.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-500 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {content.source_file_name || content.source_url}
                </a>
              )}
              {content.source_file_name && !content.source_url && (
                <p className="text-sm text-slate-600">{content.source_file_name}</p>
              )}
            </div>
          )}
        </div>

        {/* 사이드 패널 */}
        <div className="space-y-4">

          {/* 태그 */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />태그
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(content.tags || []).length > 0 ? (
                content.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">{t}</span>
                ))
              ) : (
                <p className="text-xs text-slate-400">태그 없음</p>
              )}
            </div>
            {suggestedTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-purple-500 mb-1">AI 추천 태그</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600 border border-purple-200">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI 도구 */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />AI 도구
            </p>
            <div className="space-y-2">
              <button
                onClick={handleAISummarize}
                disabled={aiLoading !== null}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-slate-600 disabled:opacity-50"
              >
                <span>요약 생성</span>
                {aiLoading === 'summarize' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-slate-300" />}
              </button>
              <button
                onClick={handleAIExtract}
                disabled={aiLoading !== null}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-slate-600 disabled:opacity-50"
              >
                <span>핵심 추출</span>
                {aiLoading === 'extract' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-slate-300" />}
              </button>
              <button
                onClick={handleAITag}
                disabled={aiLoading !== null}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-slate-600 disabled:opacity-50"
              >
                <span>태그 추천</span>
                {aiLoading === 'tag' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-slate-300" />}
              </button>
            </div>
          </div>

          {/* 메타 정보 */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 text-xs text-slate-400 space-y-1">
            <p>등록: {new Date(content.created_at).toLocaleDateString('ko-KR')}</p>
            <p>수정: {new Date(content.updated_at).toLocaleDateString('ko-KR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
