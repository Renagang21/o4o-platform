/**
 * TemplatesPage - 사이니지 템플릿 목록
 * 템플릿 목록 조회 (읽기 전용)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  RefreshCw,
  ChevronRight,
  Loader2,
  AlertCircle,
  Search,
  Monitor,
} from 'lucide-react';
import { api, API_BASE_URL } from '../../../lib/apiClient';

const SERVICE_KEY = 'neture';

interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  width?: number;
  height?: number;
  orientation?: string;
  zoneCount?: number;
  status?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function TemplatesPage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${API_BASE_URL}/api/signage/${SERVICE_KEY}/templates`);
      setTemplates(data.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '템플릿 목록을 불러오는데 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = templates.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-3 text-slate-600">템플릿 목록 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <button
          onClick={loadTemplates}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutTemplate className="w-7 h-7 text-primary-600" />
            사이니지 템플릿
          </h1>
          <p className="text-slate-500 mt-1">등록된 사이니지 레이아웃 템플릿을 확인합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTemplates}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
        <div className="p-2 bg-primary-100 rounded-lg">
          <LayoutTemplate className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="text-sm text-slate-500">등록된 템플릿</p>
          <p className="text-xl font-bold text-slate-800">{templates.length}개</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="템플릿 이름으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/operator/signage/templates/${item.id}`)}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-primary-200 hover:shadow-sm cursor-pointer transition-all group"
          >
            {/* Thumbnail or Placeholder */}
            <div className="aspect-video bg-slate-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Monitor className="w-12 h-12 text-slate-300" />
              )}
            </div>

            {/* Info */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 truncate">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 flex-shrink-0 mt-0.5 transition-colors" />
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              {item.width != null && item.height != null && (
                <span>{item.width} x {item.height}</span>
              )}
              {item.orientation && (
                <span>{item.orientation === 'landscape' ? '가로' : item.orientation === 'portrait' ? '세로' : item.orientation}</span>
              )}
              {item.zoneCount != null && (
                <span>영역 {item.zoneCount}개</span>
              )}
              {item.status && (
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{item.status}</span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-2">{formatDate(item.createdAt)}</p>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <LayoutTemplate className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-slate-800">템플릿이 없습니다</h3>
          <p className="mt-2 text-slate-500">
            {searchQuery ? '검색 결과가 없습니다' : '등록된 템플릿이 없습니다'}
          </p>
        </div>
      )}
    </div>
  );
}
