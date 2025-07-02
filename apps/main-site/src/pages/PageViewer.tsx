// 📄 페이지 뷰어 컴포넌트 (사용자용)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, ArrowLeft } from 'lucide-react';
import { loadPageContent, PageContent } from '../utils/pageSystem';

// 사용자 권한 확인
const isAdmin = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === 'admin';
  } catch {
    return false;
  }
};

const PageViewer: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('페이지 슬러그가 필요합니다.');
      setLoading(false);
      return;
    }

    try {
      const content = loadPageContent(slug);
      setPageContent(content);
      
      // 페이지 제목 설정
      document.title = content.title;
      
      // SEO 메타 태그 설정
      if (content.seo?.metaDescription) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', content.seo.metaDescription);
        }
      }
    } catch (err) {
      console.error('페이지 로드 오류:', err);
      setError('페이지를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const handleEdit = () => {
    if (slug) {
      navigate(`/editor/${slug}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">페이지를 로드하는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !pageContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600 mb-6">{error || '페이지를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 관리자용 편집 바 */}
      {isAdmin() && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-sm text-yellow-800 font-medium">관리자 모드</span>
              <span className="text-sm text-yellow-600">이 페이지를 편집할 수 있습니다</span>
            </div>
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              이 페이지 편집
            </button>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* 페이지 헤더 */}
          <div className="border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {pageContent.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>업데이트: {new Date(pageContent.updatedAt).toLocaleDateString()}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pageContent.status === 'published' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {pageContent.status === 'published' ? '게시됨' : '초안'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                홈으로
              </button>
            </div>
          </div>

          {/* 페이지 콘텐츠 */}
          <div className="px-8 py-8">
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: pageContent.content }}
            />
          </div>

          {/* 페이지 푸터 */}
          <div className="border-t border-gray-200 px-8 py-4 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                작성자: {pageContent.author} | 생성일: {new Date(pageContent.createdAt).toLocaleDateString()}
              </div>
              {isAdmin() && (
                <button
                  onClick={handleEdit}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  편집하기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 플로팅 편집 버튼 (모바일용) */}
      {isAdmin() && (
        <button
          onClick={handleEdit}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center lg:hidden"
          title="이 페이지 편집"
        >
          <Edit3 className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default PageViewer;
