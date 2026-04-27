/**
 * CommunityAnnouncementsPage - 공지사항 목록
 *
 * Work Order: WO-O4O-NETURE-COMMUNITY-PAGE-V1
 *
 * CMS notice 타입 콘텐츠를 목록으로 표시한다.
 * 공개 접근 (인증 불필요)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cmsApi, type CmsContent } from '../../lib/api/content';

const PAGE_SIZE = 10;

export default function CommunityAnnouncementsPage() {
  const [notices, setNotices] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    cmsApi
      .getContents({ type: 'notice', sort: 'latest', page: currentPage, limit: PAGE_SIZE })
      .then((result) => {
        setNotices(result.data);
        setTotalPages(result.pagination.totalPages);
      })
      .finally(() => setLoading(false));
  }, [currentPage]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Back nav */}
      <Link
        to="/"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8 text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Home
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Announcements</h1>
      <p className="text-gray-600 mb-8">플랫폼 공지와 업데이트 안내</p>

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-24 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">등록된 공지사항이 없습니다</p>
        </div>
      ) : (
        /* Notice list */
        <div className="space-y-4">
          {notices.map((notice) => (
            <Link
              key={notice.id}
              to={`/notices/${notice.id}`}
              className="flex items-start gap-4 bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {notice.isPinned && (
                    <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded font-medium">
                      중요
                    </span>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{notice.title}</h2>
                </div>
                {notice.summary && (
                  <p className="text-sm text-gray-600 line-clamp-2">{notice.summary}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(notice.publishedAt || notice.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-2" />
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 px-4">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
