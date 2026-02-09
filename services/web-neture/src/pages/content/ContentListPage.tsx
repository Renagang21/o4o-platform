/**
 * ContentListPage - 콘텐츠 목록 페이지
 *
 * APP-CONTENT Phase 2: @o4o/types/content 공유 상수, 정렬 토글, 출처 배지
 * Phase 3A: 서버사이드 pagination, 추천/조회수, ContentMetaBar
 * WO-APP-DATA-HUB-TO-DASHBOARD-PHASE3-V1: "이미 사용 중" 표시
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Bell } from 'lucide-react';
import { cmsApi, contentAssetApi, type CmsContent } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_SOURCE_COLORS,
  CONTENT_SOURCE_LABELS,
} from '@o4o/types/content';
import type { ContentSortType, ContentSourceType } from '@o4o/types/content';
import { ContentPagination, ContentCardActions, ContentMetaBar, ContentSortButtons } from '@o4o/ui';

const PAGE_SIZE = 12;

export default function ContentListPage() {
  const { user } = useAuth();
  const [contents, setContents] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<ContentSortType>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  // Phase 3: 이미 복사한 콘텐츠 ID 로드
  useEffect(() => {
    if (!user?.id) return;
    contentAssetApi.getCopiedSourceIds(user.id)
      .then(res => setCopiedIds(new Set(res.sourceIds || [])))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const fetchContents = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await cmsApi.getContents({ sort, page: currentPage, limit: PAGE_SIZE });
        setContents(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalItems(result.pagination.total);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [sort, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSort: ContentSortType) => {
    setSort(newSort);
    setCurrentPage(1);
  };

  // Phase 3A: 추천 토글 핸들러
  const handleRecommend = useCallback(async (e: React.MouseEvent, contentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await cmsApi.toggleRecommend(contentId);
      setContents(prev => prev.map(c =>
        c.id === contentId
          ? { ...c, recommendCount: result.recommendCount, isRecommendedByMe: result.isRecommendedByMe }
          : c
      ));
    } catch (err) {
      console.warn('Recommend failed:', err);
    }
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading contents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600">Error loading contents: {error}</p>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'notice':
        return <Bell className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] || type;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">콘텐츠</h1>
        <p className="text-lg text-gray-600">
          네뚜레 플랫폼의 공지사항과 가이드를 확인하세요
        </p>
      </div>

      {/* 정렬 토글 (Phase 3A: ContentSortButtons 컴포넌트 사용) */}
      <div className="mb-6">
        <ContentSortButtons
          value={sort}
          onChange={handleSortChange as (sort: 'latest' | 'featured' | 'views') => void}
          options={['latest', 'featured', 'views'] as ('latest' | 'featured' | 'views')[]}
        />
      </div>

      {/* Content List */}
      {contents.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">등록된 콘텐츠가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contents.map((content) => (
            <Link
              key={content.id}
              to={`/content/${content.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-primary-300 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                  {getTypeIcon(content.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {getTypeLabel(content.type)}
                    </span>
                    {content.isPinned && (
                      <span className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded">
                        중요
                      </span>
                    )}
                    {/* 출처 배지 */}
                    {content.metadata?.creatorType && CONTENT_SOURCE_LABELS[content.metadata.creatorType as ContentSourceType] && (
                      <span
                        className="inline-block px-2 py-1 text-xs text-white rounded font-medium"
                        style={{ backgroundColor: CONTENT_SOURCE_COLORS[content.metadata.creatorType as ContentSourceType] }}
                      >
                        {CONTENT_SOURCE_LABELS[content.metadata.creatorType as ContentSourceType]}
                      </span>
                    )}
                    {content.metadata?.category && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-50 text-gray-500 rounded">
                        {content.metadata.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {content.title}
                  </h2>
                  {content.summary && (
                    <p className="text-sm text-gray-600 line-clamp-2">{content.summary}</p>
                  )}
                  {/* Phase 3A: 메타 정보 + 추천 + 액션 */}
                  <div className="mt-3 flex items-center justify-between">
                    <ContentMetaBar
                      viewCount={content.viewCount || 0}
                      likeCount={content.recommendCount || 0}
                      date={content.publishedAt || content.createdAt}
                      isRecommended={content.isRecommendedByMe}
                      onRecommendedClick={(e: any) => handleRecommend(e, content.id)}
                      size="sm"
                    />
                    <div className="flex items-center gap-2">
                      {copiedIds.has(content.id) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 rounded-md text-xs font-medium">
                          &#10003; 사용 중
                        </span>
                      ) : (
                        <ContentCardActions showCopy isOwner={false} />
                      )}
                      <span className="inline-flex items-center text-primary-600 text-sm font-medium">
                        자세히 보기
                        <ArrowRight className="ml-1 w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination (Phase 3A: 서버사이드) */}
      {totalPages > 1 && (
        <div className="mt-8">
          <ContentPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            showItemRange
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}
    </div>
  );
}
