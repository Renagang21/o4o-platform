import React, { useState, useEffect } from 'react';
import { FullScreenEditor } from '../../../editor/fullscreen';
import { ArrowLeft, Save, Eye } from 'lucide-react';

interface PageEditorProps {
  pageId?: string;
  initialTitle?: string;
  onBack?: () => void;
}

interface PageData {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'private';
  slug: string;
  lastSaved?: string;
}

export function PageEditor({ pageId, initialTitle, onBack }: PageEditorProps) {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 페이지 데이터 로드
  useEffect(() => {
    const loadPageData = async () => {
      try {
        if (pageId && pageId !== 'new') {
          // 기존 페이지 데이터 로드
          const mockData: PageData = {
            id: pageId,
            title: initialTitle || '페이지 제목',
            content: '<p>페이지 내용을 입력하세요...</p>',
            status: 'draft',
            slug: 'page-slug',
            lastSaved: new Date().toISOString()
          };
          setPageData(mockData);
        } else {
          // 새 페이지 생성
          const newPageData: PageData = {
            id: 'new',
            title: initialTitle || '새 페이지',
            content: '',
            status: 'draft',
            slug: '',
            lastSaved: undefined
          };
          setPageData(newPageData);
        }
      } catch (error) {
        console.error('페이지 데이터 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [pageId, initialTitle]);

  // 페이지 저장
  const handleSave = async (content: string) => {
    if (!pageData) return;

    try {
      const updatedPageData = {
        ...pageData,
        content,
        lastSaved: new Date().toISOString()
      };

      console.log('페이지 저장:', updatedPageData);
      
      // 실제 저장 로직 (API 호출)
      await new Promise(resolve => setTimeout(resolve, 1000)); // 저장 시뮬레이션
      
      setPageData(updatedPageData);
      setHasUnsavedChanges(false);
      
      // 저장 성공 알림
      alert('페이지가 저장되었습니다!');
      
    } catch (error) {
      console.error('페이지 저장 오류:', error);
      alert('페이지 저장 중 오류가 발생했습니다.');
    }
  };

  // 미리보기
  const handlePreview = () => {
    if (!pageData) return;
    
    // 새 창에서 미리보기 열기
    const previewUrl = pageData.slug 
      ? `/${pageData.slug}?preview=true`
      : `/preview/${pageData.id}`;
    
    window.open(previewUrl, '_blank');
  };

  // 뒤로 가기 (관리자 환경으로 복귀)
  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?'
      );
      if (!confirmLeave) return;
    }

    if (onBack) {
      onBack();
    } else {
      window.location.href = '/admin/pages';
    }
  };

  // 페이지 나가기 전 확인
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">페이지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">페이지를 불러올 수 없습니다.</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            페이지 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Admin Context Bar - WordPress 스타일의 상단 바 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white px-4 py-2 text-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>관리자로 돌아가기</span>
          </button>
          
          <div className="border-l border-gray-600 pl-4">
            <span className="text-gray-300">편집 중:</span>
            <span className="ml-2 font-medium">{pageData.title}</span>
          </div>
          
          {pageData.lastSaved && (
            <div className="text-gray-400">
              마지막 저장: {new Date(pageData.lastSaved).toLocaleString('ko-KR')}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <span className="text-yellow-400 text-xs">● 저장되지 않은 변경사항</span>
          )}
          
          <button
            onClick={handlePreview}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>미리보기</span>
          </button>
        </div>
      </div>

      {/* WordPress Gutenberg Fullscreen Editor */}
      <div className="pt-10"> {/* Admin bar height offset */}
        <FullScreenEditor
          pageId={pageData.id}
          initialContent={pageData.content}
          onSave={handleSave}
          onPreview={handlePreview}
        />
      </div>

      {/* Exit Confirmation Modal */}
      {/* 실제 구현에서는 모달 컴포넌트 사용 */}
    </div>
  );
}