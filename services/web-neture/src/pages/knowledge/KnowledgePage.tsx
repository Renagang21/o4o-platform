/**
 * KnowledgePage - Knowledge 자료실 목록
 *
 * WO-O4O-KNOWLEDGE-LIBRARY-V1
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Paperclip } from 'lucide-react';
import { cmsApi, type CmsContent } from '../../lib/api';

const PAGE_SIZE = 12;

export default function KnowledgePage() {
  const [contents, setContents] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        setLoading(true);
        const result = await cmsApi.getContents({
          type: 'knowledge',
          sort: 'latest',
          page: currentPage,
          limit: PAGE_SIZE,
        });
        setContents(result.data);
        setTotalPages(result.pagination.totalPages);
      } catch (err) {
        console.error('Failed to fetch knowledge:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchKnowledge();
  }, [currentPage]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAttachmentCount = (content: CmsContent) => {
    if (!content.attachments || !Array.isArray(content.attachments)) return 0;
    return content.attachments.length;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge</h1>
        </div>
        <p className="text-gray-600">
          제품 설명, 마케팅 자료, 매뉴얼, 교육 자료, 가이드 문서
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">아직 등록된 자료가 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contents.map((content) => (
              <Link
                key={content.id}
                to={`/knowledge/${content.id}`}
                className="bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all overflow-hidden group"
              >
                {content.imageUrl && (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <img
                      src={content.imageUrl}
                      alt={content.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                    {content.title}
                  </h3>
                  {content.summary && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{content.summary}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatDate(content.publishedAt || content.createdAt)}</span>
                    {getAttachmentCount(content) > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {getAttachmentCount(content)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-sm rounded-md ${
                    currentPage === page
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
