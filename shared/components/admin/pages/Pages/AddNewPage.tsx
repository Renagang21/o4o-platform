import React, { useState } from 'react';
import { Save, Eye, Edit3, FileText } from 'lucide-react';

export function AddNewPage() {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'private'>('draft');
  const [parentPage, setParentPage] = useState('');
  const [pageTemplate, setPageTemplate] = useState('default');
  const [isCreating, setIsCreating] = useState(false);

  // 제목에서 슬러그 자동 생성
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  const handleCreatePage = async () => {
    if (!title.trim()) {
      alert('페이지 제목을 입력해주세요.');
      return;
    }

    setIsCreating(true);
    
    try {
      // 실제 페이지 생성 로직
      const pageData = {
        title: title.trim(),
        slug: slug || generateSlug(title),
        status,
        parentPage: parentPage || null,
        template: pageTemplate,
        content: '', // 초기 빈 콘텐츠
      };

      console.log('Creating page:', pageData);
      
      // 페이지 생성 후 에디터로 이동
      const newPageId = Date.now().toString(); // 임시 ID
      window.location.href = `/admin/pages/edit/${newPageId}`;
      
    } catch (error) {
      console.error('페이지 생성 오류:', error);
      alert('페이지 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickStart = () => {
    if (!title.trim()) {
      alert('페이지 제목을 입력해주세요.');
      return;
    }
    
    // 제목만으로 빠른 시작 - 바로 에디터로 이동
    const tempPageData = {
      title: title.trim(),
      slug: generateSlug(title),
      status: 'draft'
    };
    
    const newPageId = Date.now().toString();
    window.location.href = `/admin/pages/edit/${newPageId}?title=${encodeURIComponent(title)}`;
  };

  const parentPageOptions = [
    { value: '', label: '상위 페이지 없음' },
    { value: '1', label: '회사 소개' },
    { value: '2', label: '서비스' },
    { value: '3', label: '고객지원' }
  ];

  const templateOptions = [
    { value: 'default', label: '기본 템플릿' },
    { value: 'full-width', label: '전체 너비' },
    { value: 'landing', label: '랜딩 페이지' },
    { value: 'contact', label: '연락처 페이지' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">새 페이지 추가</h2>
        </div>
        <p className="text-gray-600">
          새로운 페이지의 기본 정보를 입력하고 Gutenberg 에디터에서 내용을 작성하세요.
        </p>
      </div>

      {/* Quick Start Option */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">
          🚀 빠른 시작
        </h3>
        <p className="text-blue-700 mb-4">
          제목만 입력하고 바로 에디터에서 작성을 시작하세요.
        </p>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="페이지 제목을 입력하세요"
            className="flex-1 px-4 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleQuickStart}
            disabled={!title.trim()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            편집 시작
          </button>
        </div>
      </div>

      {/* Detailed Page Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">상세 설정</h3>
          <p className="text-sm text-gray-500 mt-1">
            페이지의 상세 정보를 설정하고 싶다면 아래 옵션들을 구성하세요.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Page Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              페이지 제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="페이지 제목을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Page Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              페이지 슬러그
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                /
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="페이지 URL 슬러그"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              URL에 표시될 페이지 주소입니다. 제목에서 자동 생성됩니다.
            </p>
          </div>

          {/* Page Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              발행 상태
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">초안</option>
              <option value="published">발행됨</option>
              <option value="private">비공개</option>
            </select>
          </div>

          {/* Parent Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상위 페이지
            </label>
            <select
              value={parentPage}
              onChange={(e) => setParentPage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {parentPageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Page Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              페이지 템플릿
            </label>
            <select
              value={pageTemplate}
              onChange={(e) => setPageTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {templateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <a
              href="/admin/pages"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← 페이지 목록으로 돌아가기
            </a>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleCreatePage}
                disabled={!title.trim() || isCreating}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {isCreating ? '생성 중...' : '저장 후 편집'}
              </button>
              
              <button
                onClick={handleQuickStart}
                disabled={!title.trim()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                바로 편집 시작
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}