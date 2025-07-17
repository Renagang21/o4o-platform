// ✏️ 페이지 에디터 (관리자용)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NotionEditor from '@o4o/ui/editor/NotionEditor';
import { loadPageContent, savePageContent, PageContent, getPageViewUrl } from '../utils/pageSystem';

const PageEditor: React.FC = () => {
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
      document.title = `편집 중: ${content.title}`;
    } catch (err) {
      console.error('페이지 로드 오류:', err);
      setError('페이지를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const handleSave = async (html: string, json: Record<string, unknown>) => {
    if (!pageContent || !slug) return;

    try {
      const updatedContent: PageContent = {
        ...pageContent,
        content: html,
        json: json,
        updatedAt: new Date().toISOString(),
      };

      savePageContent(updatedContent);
      setPageContent(updatedContent);
      
      console.log('페이지 저장 완료:', updatedContent);
    } catch (error) {
      console.error('페이지 저장 실패:', error);
      throw error;
    }
  };

  const handleBack = () => {
    const shouldLeave = confirm(
      '편집을 종료하시겠습니까? 저장되지 않은 변경사항이 있을 수 있습니다.'
    );
    
    if (shouldLeave) {
      if (slug) {
        navigate(getPageViewUrl(slug));
      } else {
        navigate('/');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">에디터를 로드하는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !pageContent || !slug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">오류</h1>
          <p className="text-gray-600 mb-6">{error || '페이지를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <NotionEditor
      pageSlug={slug}
      initialContent={pageContent.content}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
};

export default PageEditor;
