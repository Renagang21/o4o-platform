/**
 * Template Library Page
 *
 * WO-O4O-STORE-CONTENT-UI
 *
 * 템플릿 라이브러리 — 매장 콘텐츠 복사용 템플릿 목록
 * - 카테고리/태그 필터
 * - 검색
 * - 템플릿 선택 → 매장 복사
 */

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutTemplate, ArrowLeft, Search, RefreshCw, AlertCircle,
  Copy, Tag, FolderOpen, CheckCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  storeContentApi,
  TemplateListItem,
  TemplateTag,
  TemplateCategory,
} from '@/api/store-content.api';

const DEFAULT_STORE_ID = 'default';

export default function TemplateLibraryPage() {
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Data
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tags, setTags] = useState<TemplateTag[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy state
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await storeContentApi.listLibraryTemplates({
        search: search || undefined,
        category: selectedCategory || undefined,
        tag: selectedTag || undefined,
        limit: 50,
      });
      setTemplates(result.items);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || '템플릿을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedTag]);

  const fetchFilters = useCallback(async () => {
    const [tagResult, catResult] = await Promise.all([
      storeContentApi.listTags(),
      storeContentApi.listCategories(),
    ]);
    setTags(tagResult);
    setCategories(catResult);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleCopy = async (templateId: string) => {
    setCopyingId(templateId);
    setCopySuccess(null);
    try {
      const result = await storeContentApi.copyTemplate(templateId, DEFAULT_STORE_ID);
      if (result) {
        setCopySuccess(result.id);
        // Navigate to the new store content after brief delay
        setTimeout(() => {
          navigate(`/store-content/${result.id}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || '템플릿 복사에 실패했습니다.');
    } finally {
      setCopyingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/store-content"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          매장 콘텐츠
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="w-8 h-8 text-gray-400" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">템플릿 라이브러리</h1>
            <p className="text-gray-500 text-sm">매장 콘텐츠로 사용할 템플릿을 선택하세요</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="템플릿 검색..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
            >
              <option value="">전체 카테고리</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tag Filter */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
            >
              <option value="">전체 태그</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={fetchTemplates}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <span className="text-sm text-gray-400 ml-auto">
          {loading ? '로딩중...' : `${templates.length} / ${total} templates`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-sm text-red-600 hover:text-red-700 underline"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Template Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">사용 가능한 템플릿이 없습니다</p>
          <p className="text-sm mt-1">
            {search || selectedCategory || selectedTag
              ? '필터를 변경해 보세요'
              : '관리자가 템플릿을 게시하면 여기에 표시됩니다'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const isCopying = copyingId === template.id;
            const isCopied = copySuccess === template.id;

            return (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                {/* Title */}
                <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                  {template.title}
                </h3>

                {/* Description */}
                {template.description && (
                  <p className="text-xs text-gray-500 line-clamp-3 mb-3">{template.description}</p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <span>{formatDate(template.updatedAt)}</span>
                  {template.category && (
                    <span className="inline-flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" />
                      {template.category}
                    </span>
                  )}
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(template.id)}
                  disabled={isCopying || !!copySuccess}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    isCopied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  } disabled:opacity-50`}
                >
                  {isCopied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      복사 완료
                    </>
                  ) : isCopying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      복사 중...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      매장에 복사
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
