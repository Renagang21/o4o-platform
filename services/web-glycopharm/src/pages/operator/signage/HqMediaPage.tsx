/**
 * HQ Media Management Page — Signage Console
 * WO-O4O-SIGNAGE-CONSOLE-V1
 *
 * Operator creates & manages HQ signage media.
 * API: /api/signage/glycopharm/hq/*
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '@/contexts/AuthContext';
import { Film, RefreshCw, Plus, ChevronRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
const SERVICE_KEY = 'glycopharm';

interface MediaItem {
  id: string;
  name: string;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  status: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

const mediaTypeLabel: Record<string, string> = {
  video: '동영상', image: '이미지', html: 'HTML', text: '텍스트', rich_text: '리치 텍스트', link: '링크',
};

const sourceTypeLabel: Record<string, string> = {
  upload: '업로드', youtube: 'YouTube', vimeo: 'Vimeo', url: 'URL', cms: 'CMS',
};

const statusConfig: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { text: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

export default function HqMediaPage() {
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Create form
  const [formName, setFormName] = useState('');
  const [formMediaType, setFormMediaType] = useState('video');
  const [formSourceType, setFormSourceType] = useState('youtube');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
  }, []);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${SERVICE_KEY}/media?source=hq`);
      setMedia(data.data || data.media || []);
    } catch (err: any) {
      setError(err?.message || 'HQ 미디어를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleCreate = async () => {
    if (!formName.trim() || !formSourceUrl.trim()) return;
    setIsCreating(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          mediaType: formMediaType,
          sourceType: formSourceType,
          sourceUrl: formSourceUrl.trim(),
        }),
      });
      setFormName(''); setFormSourceUrl(''); setShowForm(false);
      fetchMedia();
    } catch (err: any) {
      setError(err?.message || '미디어 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return '-'; }
  };

  const stats = {
    total: media.length,
    active: media.filter(m => m.status === 'active').length,
    pending: media.filter(m => m.status === 'pending').length,
    draft: media.filter(m => m.status === 'draft').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Film className="w-6 h-6" /> HQ 미디어 관리
          </h1>
          <p className="text-slate-500 text-sm mt-1">운영자 제공 사이니지 미디어 콘텐츠</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> 새 미디어
          </button>
          <button onClick={fetchMedia} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체', value: stats.total, color: 'text-slate-800' },
          { label: '활성', value: stats.active, color: 'text-green-600' },
          { label: '대기', value: stats.pending, color: 'text-amber-600' },
          { label: '초안', value: stats.draft, color: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-slate-100">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">새 HQ 미디어</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">제목 *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="미디어 제목" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">미디어 타입</label>
              <select value={formMediaType} onChange={e => setFormMediaType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {Object.entries(mediaTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">소스 타입</label>
              <select value={formSourceType} onChange={e => setFormSourceType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {Object.entries(sourceTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">소스 URL *</label>
              <input type="text" value={formSourceUrl} onChange={e => setFormSourceUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">취소</button>
            <button onClick={handleCreate} disabled={isCreating || !formName.trim() || !formSourceUrl.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">{isCreating ? '생성 중...' : '생성'}</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {isLoading && media.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">로딩 중...</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">이름</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">타입</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">소스</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">상태</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">생성일</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {media.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">HQ 미디어가 없습니다</td></tr>
              ) : media.map(m => {
                const sc = statusConfig[m.status] || { text: m.status, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <tr key={m.id} onClick={() => navigate(`/operator/signage/hq-media/${m.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm">{m.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{mediaTypeLabel[m.mediaType] || m.mediaType}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{sourceTypeLabel[m.sourceType] || m.sourceType}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
