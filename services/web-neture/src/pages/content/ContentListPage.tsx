/**
 * ContentListPage - 콘텐츠 목록 페이지
 *
 * WO-NETURE-SMOKE-STABILIZATION-V1
 * - CMS API에서 serviceKey=neture 콘텐츠 조회
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Bell } from 'lucide-react';
import { cmsApi, type CmsContent } from '../../lib/api';

export default function ContentListPage() {
  const [contents, setContents] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContents = async () => {
      try {
        setLoading(true);
        const data = await cmsApi.getContents();
        setContents(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
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
    switch (type) {
      case 'notice':
        return '공지';
      case 'hero':
        return '메인';
      case 'news':
        return '뉴스';
      default:
        return type;
    }
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
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {getTypeLabel(content.type)}
                    </span>
                    {content.isPinned && (
                      <span className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded">
                        중요
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {content.title}
                  </h2>
                  {content.summary && (
                    <p className="text-sm text-gray-600 line-clamp-2">{content.summary}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {content.publishedAt
                        ? new Date(content.publishedAt).toLocaleDateString('ko-KR')
                        : new Date(content.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                    <span className="inline-flex items-center text-primary-600 text-sm font-medium">
                      자세히 보기
                      <ArrowRight className="ml-1 w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
