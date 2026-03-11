/**
 * HQ Media Page — Signage HQ Media Console
 *
 * Cookie-based auth (K-Cosmetics)
 * API: GET /api/signage/k-cosmetics/media?source=hq
 * API: POST /api/signage/k-cosmetics/hq/media
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
const SERVICE_KEY = 'k-cosmetics';

// ─── Types ───────────────────────────────────────────────────

interface MediaItem {
  id: string;
  name: string;
  mediaType: string;
  sourceType: string;
  sourceUrl: string | null;
  status: string;
  createdAt: string;
}

interface StatsData {
  total: number;
  active: number;
  pending: number;
  draft: number;
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

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Component ───────────────────────────────────────────────

export default function HqMediaPage() {
  const navigate = useNavigate();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<StatsData>({ total: 0, active: 0, pending: 0, draft: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMediaType, setFormMediaType] = useState('video');
  const [formSourceType, setFormSourceType] = useState('upload');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        success: boolean;
        data: MediaItem[];
        stats?: StatsData;
      }>(`/api/signage/${SERVICE_KEY}/media?source=hq`);

      if (data.success) {
        setMediaList(data.data || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Failed to fetch HQ media:', err);
      setError(err?.message || 'HQ 미디어 데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          mediaType: formMediaType,
          sourceType: formSourceType,
          sourceUrl: formSourceUrl.trim() || undefined,
        }),
      });
      setFormName('');
      setFormSourceUrl('');
      setShowForm(false);
      await fetchMedia();
    } catch (err: any) {
      console.error('Failed to create HQ media:', err);
      setError(err?.message || 'HQ 미디어 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">HQ 미디어</h1>
          <p className="text-slate-500 text-sm mt-1">본사 사이니지 미디어 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMedia}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            미디어 추가
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500">전체 미디어</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-slate-500">활성</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-slate-500">대기</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-500">{stats.draft}</p>
          <p className="text-xs text-slate-500">초안</p>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">새 HQ 미디어</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">이름 *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="미디어 이름"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">미디어 타입</label>
              <select
                value={formMediaType}
                onChange={(e) => setFormMediaType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              >
                {Object.entries(MEDIA_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">소스 타입</label>
              <select
                value={formSourceType}
                onChange={(e) => setFormSourceType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              >
                {Object.entries(SOURCE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">소스 URL</label>
              <input
                type="text"
                value={formSourceUrl}
                onChange={(e) => setFormSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !formName.trim()}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isCreating ? '생성 중...' : '생성'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {/* Loading */}
        {isLoading && mediaList.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">HQ 미디어 로딩 중...</p>
            </div>
          </div>
        )}

        {(!isLoading || mediaList.length > 0) && (
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
              {mediaList.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    HQ 미디어가 없습니다
                  </td>
                </tr>
              ) : (
                mediaList.map((m) => {
                  const statusCfg = STATUS_CONFIG[m.status] || { label: m.status, cls: 'bg-slate-100 text-slate-600' };
                  return (
                    <tr
                      key={m.id}
                      onClick={() => navigate(`/operator/signage/hq-media/${m.id}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 text-sm">{m.name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {MEDIA_TYPE_LABELS[m.mediaType] || m.mediaType}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {SOURCE_TYPE_LABELS[m.sourceType] || m.sourceType}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
