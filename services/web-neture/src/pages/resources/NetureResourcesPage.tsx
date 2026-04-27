/**
 * NetureResourcesPage — Neture 자료실
 *
 * Route: /resources
 * API: GET /api/v1/neture/content?type=resource
 *
 * CMS type='resource' 콘텐츠를 목록으로 표시한다.
 * 공개 접근 (인증 불필요)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Paperclip, ExternalLink, ArrowRight } from 'lucide-react';
import { PageContainer } from '@o4o/ui';
import { cmsApi, type CmsContent } from '../../lib/api/content';

const PAGE_SIZE = 12;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR');
}

export default function NetureResourcesPage() {
  const [items, setItems] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    cmsApi
      .getContents({ type: 'resource', sort: 'latest', page, limit: PAGE_SIZE })
      .then((res) => {
        setItems(res.data);
        setTotalPages(res.pagination.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-12">
        <PageContainer>
          <Link
            to="/"
            className="inline-flex items-center text-white/70 hover:text-white text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Home
          </Link>
          <h1 className="text-2xl font-bold mb-2">자료실</h1>
          <p className="text-white/80 text-sm">공급자·파트너를 위한 공유 자료 모음입니다.</p>
        </PageContainer>
      </section>

      {/* List */}
      <section className="py-10">
        <PageContainer>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-24 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">등록된 자료가 없습니다.</p>
              <p className="text-gray-400 text-sm mt-1">준비 중인 자료가 곧 업로드됩니다.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                        {item.summary && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          {item.attachments && item.attachments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {item.attachments.length}개 첨부
                            </span>
                          )}
                          <span>{item.publishedAt ? formatDate(item.publishedAt) : ''}</span>
                        </div>
                      </div>
                      {item.linkUrl && (
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {item.linkText || '열기'}
                        </a>
                      )}
                    </div>
                    {/* Attachments */}
                    {item.attachments && item.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                        {item.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-primary-50 rounded-lg text-xs text-gray-700 hover:text-primary-700 border border-gray-200 hover:border-primary-200 transition-colors"
                          >
                            <Paperclip className="w-3 h-3" />
                            {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <span className="text-sm text-gray-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </PageContainer>
      </section>

      {/* Back to Home */}
      <section className="py-8">
        <PageContainer>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Home으로 돌아가기
          </Link>
        </PageContainer>
      </section>
    </div>
  );
}
