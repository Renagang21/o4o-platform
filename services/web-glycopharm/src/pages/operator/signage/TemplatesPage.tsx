/**
 * Signage Templates Page — Signage Console
 * WO-O4O-SIGNAGE-CONSOLE-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../../lib/apiClient';
import { LayoutTemplate, RefreshCw, ChevronRight } from 'lucide-react';

const SERVICE_KEY = 'glycopharm';

interface TemplateItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  isPublic: boolean;
  isSystem: boolean;
  thumbnailUrl: string | null;
  createdAt: string;
}

export default function TemplatesPage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiFetch = useCallback(async (path: string) => {
    const url = path.startsWith('/api/v1') ? path.replace(/^\/api\/v1/, '') : `${API_BASE_URL}${path}`;
    const response = await api.get(url);
    return response.data;
  }, []);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${SERVICE_KEY}/templates`);
      setTemplates(data.data || data.templates || []);
    } catch (err: any) {
      setError(err?.message || '템플릿을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return '-'; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6" /> 사이니지 템플릿
          </h1>
          <p className="text-slate-500 text-sm mt-1">디스플레이 레이아웃 템플릿</p>
        </div>
        <button onClick={fetchTemplates} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 새로고침
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {isLoading && templates.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">이름</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">카테고리</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">공개</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">시스템</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">상태</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">생성일</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">템플릿이 없습니다</td></tr>
              ) : templates.map(t => (
                <tr key={t.id} onClick={() => navigate(`/operator/signage/templates/${t.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 text-sm">{t.name}</p>
                    {t.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t.category || '-'}</td>
                  <td className="px-4 py-3 text-center text-sm">{t.isPublic ? '✓' : '-'}</td>
                  <td className="px-4 py-3 text-center text-sm">{t.isSystem ? '✓' : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {t.status === 'active' ? '활성' : t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
