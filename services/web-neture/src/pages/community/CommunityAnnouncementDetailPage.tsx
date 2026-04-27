/**
 * CommunityAnnouncementDetailPage - 공지사항 상세
 *
 * Work Order: WO-O4O-NETURE-COMMUNITY-PAGE-V1
 *
 * CMS notice 콘텐츠 상세 표시.
 * ContentDetailPage 패턴 참조, copy/asset 기능 제외.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bell, Calendar } from 'lucide-react';
import { cmsApi, type CmsContent } from '../../lib/api/content';

export default function CommunityAnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<CmsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommending, setRecommending] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Content ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    cmsApi
      .getContentById(id)
      .then((data) => {
        setContent(data);
        cmsApi.trackView(id).catch(() => {});
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRecommend = useCallback(async () => {
    if (!id || recommending) return;
    setRecommending(true);
    try {
      const result = await cmsApi.toggleRecommend(id);
      setContent((prev) =>
        prev
          ? { ...prev, recommendCount: result.recommendCount, isRecommendedByMe: result.isRecommendedByMe }
          : prev,
      );
    } catch {
      // silent
    } finally {
      setRecommending(false);
    }
  }, [id, recommending]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {error ? `오류: ${error}` : '공지사항을 찾을 수 없습니다'}
        </h1>
        <Link to="/notices" className="text-primary-600 hover:text-primary-700">
          공지사항 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const recommendCount = content.recommendCount || 0;
  const viewCount = content.viewCount || 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Back */}
      <Link
        to="/notices"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8 text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        공지사항 목록
      </Link>

      {/* Article */}
      <article className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 text-sm bg-amber-50 text-amber-700 rounded-full">
                공지사항
              </span>
              {content.isPinned && (
                <span className="inline-block ml-2 px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full">
                  중요
                </span>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h1>

          {content.summary && <p className="text-lg text-gray-600 mb-4">{content.summary}</p>}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(content.publishedAt || content.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span>조회 {viewCount}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          {content.imageUrl && (
            <img src={content.imageUrl} alt={content.title} className="w-full rounded-lg mb-8" />
          )}

          {content.body ? (
            <div className="prose prose-gray max-w-none">
              {content.body.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">{content.summary || '내용이 없습니다.'}</p>
          )}

          {content.linkUrl && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <a
                href={content.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                {content.linkText || '자세히 보기'}
              </a>
            </div>
          )}

          {/* Recommend */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center gap-3">
            <button
              onClick={handleRecommend}
              disabled={recommending}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                content.isRecommendedByMe
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{content.isRecommendedByMe ? '추천 취소' : '추천하기'}</span>
              {recommendCount > 0 && <span className="font-semibold">{recommendCount}</span>}
            </button>
          </div>
        </div>
      </article>

      {/* Navigation */}
      <div className="mt-6 text-center">
        <Link
          to="/notices"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm"
        >
          공지사항 전체 보기 →
        </Link>
      </div>
    </div>
  );
}
