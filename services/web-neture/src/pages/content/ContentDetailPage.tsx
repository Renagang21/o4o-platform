/**
 * ContentDetailPage - 콘텐츠 상세 페이지
 *
 * WO-NETURE-EXTENSION-P2
 *
 * 콘텐츠 활용 안내 (Content Utilization Visibility):
 * - 콘텐츠가 어디서 활용 가능한지 표시
 * - 외부 서비스 링크만 제공
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bell, FileText, Calendar } from 'lucide-react';
import { cmsApi, type CmsContent } from '../../lib/api';
import { ContentUtilizationGuide } from '../../components/ContentUtilizationGuide';

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<CmsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      if (!id) {
        setError('Content ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await cmsApi.getContentById(id);
        setContent(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading content...</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {error ? `Error: ${error}` : '콘텐츠를 찾을 수 없습니다'}
        </h1>
        <Link
          to="/content"
          className="text-primary-600 hover:text-primary-700 mt-4 inline-block"
        >
          콘텐츠 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'notice':
        return <Bell className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'notice':
        return '공지사항';
      case 'hero':
        return '메인 콘텐츠';
      case 'news':
        return '뉴스';
      default:
        return type;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link
        to="/content"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        콘텐츠 목록으로
      </Link>

      {/* Content Card */}
      <article className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
              {getTypeIcon(content.type)}
            </div>
            <div>
              <span className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
                {getTypeLabel(content.type)}
              </span>
              {content.isPinned && (
                <span className="inline-block ml-2 px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full">
                  중요
                </span>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h1>

          {content.summary && (
            <p className="text-lg text-gray-600 mb-4">{content.summary}</p>
          )}

          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-1" />
            <span>
              {content.publishedAt
                ? new Date(content.publishedAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : new Date(content.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          {content.imageUrl && (
            <img
              src={content.imageUrl}
              alt={content.title}
              className="w-full rounded-lg mb-8"
            />
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

          {/* Link Button */}
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
        </div>
      </article>

      {/* 콘텐츠 활용 안내 (WO-NETURE-EXTENSION-P2) */}
      <div className="mt-8">
        <ContentUtilizationGuide
          contentType="content"
          usageNote="이 콘텐츠는 Neture 플랫폼에서 관리되며, 제휴된 서비스에서 활용할 수 있습니다."
        />
      </div>

      {/* 다음 행동 안내 */}
      <div className="mt-6 p-6 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-gray-600 mb-3">관련 소식을 계속 확인하세요</p>
        <Link to="/content" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
          콘텐츠 더 보기 →
        </Link>
      </div>

      {/* Navigation */}
      <div className="mt-6 text-center">
        <Link
          to="/content"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          콘텐츠 전체 보기 →
        </Link>
      </div>
    </div>
  );
}
