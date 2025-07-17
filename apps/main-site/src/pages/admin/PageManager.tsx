import React, { useState, useEffect } from 'react';
import { Save, Eye, Settings, Layout, Home, DollarSign, Info, Mail, ArrowLeft, Plus, Edit3, Globe, Smartphone, Monitor } from 'lucide-react';
import DOMPurify from 'dompurify';
import { PageContent, PageSection, PageInfo, DefaultPageContents, BannerSection, FeaturesSection, ContentSection, ProgressSection } from '../../types/page-manager';

const PageManager = () => {
  const [currentPage, setCurrentPage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [pageContent, setPageContent] = useState<PageContent>({ title: '', sections: [] });
  const [previewMode, setPreviewMode] = useState('desktop');

  // 워드프레스 스타일 페이지 목록
  const pages: PageInfo[] = [
    { id: 'home', name: '홈페이지', icon: <Home className="w-4 h-4" />, url: '/' },
    { id: 'crowdfunding', name: '크라우드펀딩', icon: <DollarSign className="w-4 h-4" />, url: '/crowdfunding' },
    { id: 'about', name: '회사소개', icon: <Info className="w-4 h-4" />, url: '/about' },
    { id: 'contact', name: '연락처', icon: <Mail className="w-4 h-4" />, url: '/contact' },
    { id: 'products', name: '제품소개', icon: <Layout className="w-4 h-4" />, url: '/products' }
  ];

  // 현재 페이지 콘텐츠 로드
  useEffect(() => {
    const savedContent = localStorage.getItem(`page_${currentPage}`);
    if (savedContent) {
      setPageContent(JSON.parse(savedContent));
    } else {
      // 기본 페이지 콘텐츠
      setPageContent(getDefaultPageContent(currentPage));
    }
  }, [currentPage]);

  // 기본 페이지 콘텐츠 생성
  const getDefaultPageContent = (pageId: string): PageContent => {
    const defaults: DefaultPageContents = {
      home: {
        title: 'Welcome to Neture',
        hero: {
          title: '혁신적인 건강 솔루션',
          subtitle: '더 나은 삶을 위한 자연스러운 선택',
          ctaText: '자세히 알아보기',
          ctaLink: '/about',
          backgroundImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200'
        },
        sections: [
          {
            id: 'crowdfunding-banner',
            type: 'banner',
            title: '🚀 크라우드펀딩 진행 중!',
            description: '혁신적인 건강 제품 개발을 위한 크라우드펀딩에 참여하세요',
            ctaText: '펀딩 참여하기',
            ctaLink: '/crowdfunding',
            backgroundColor: '#3B82F6',
            textColor: '#FFFFFF'
          },
          {
            id: 'features',
            type: 'features',
            title: '주요 특징',
            items: [
              { title: '자연 성분', description: '100% 천연 원료 사용', icon: '🌿' },
              { title: '과학적 검증', description: '임상 시험을 통한 효과 입증', icon: '🔬' },
              { title: '안전성', description: 'FDA 승인 제조 시설', icon: '✅' }
            ]
          }
        ]
      },
      crowdfunding: {
        title: '크라우드펀딩',
        hero: {
          title: '혁신적인 건강 제품을 함께 만들어보세요',
          subtitle: '펀딩 목표: 1억원 | 현재 진행률: 67%',
          ctaText: '지금 펀딩하기',
          ctaLink: '#funding-form'
        },
        sections: [
          {
            id: 'funding-progress',
            type: 'progress',
            current: 67000000,
            target: 100000000,
            backers: 234,
            daysLeft: 15
          },
          {
            id: 'product-info',
            type: 'content',
            title: '제품 소개',
            content: '<p>혁신적인 건강 제품에 대한 상세한 설명...</p>'
          }
        ]
      }
    };
    return defaults[pageId] || { title: '새 페이지', sections: [] };
  };

  // 페이지 저장
  const savePage = () => {
    localStorage.setItem(`page_${currentPage}`, JSON.stringify(pageContent));
    alert('페이지가 저장되었습니다!');
  };

  // 섹션 추가
  const addSection = (type: string) => {
    const newSection = {
      id: `section_${Date.now()}`,
      type,
      title: '새 섹션',
      content: type === 'content' ? '<p>여기에 내용을 입력하세요.</p>' : {}
    };
    
    setPageContent((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), newSection]
    }));
  };

  // 섹션 업데이트
  const updateSection = (sectionId: string, updates: Partial<PageSection>) => {
    setPageContent((prev) => ({
      ...prev,
      sections: prev.sections?.map((section) => 
        section.id === sectionId ? { ...section, ...updates } : section
      ) || []
    }));
  };

  // 섹션 삭제
  const deleteSection = (sectionId: string) => {
    if (confirm('이 섹션을 삭제하시겠습니까?')) {
      setPageContent((prev) => ({
        ...prev,
        sections: prev.sections?.filter((section) => section.id !== sectionId) || []
      }));
    }
  };

  const currentPageInfo = pages.find(p => p.id === currentPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 워드프레스 스타일 상단 바 */}
      <div className="bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage('')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              페이지 목록
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-semibold text-gray-900">
              {currentPageInfo?.name || '페이지 편집기'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 반응형 미리보기 */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('tablet')}
                className={`p-2 rounded ${previewMode === 'tablet' ? 'bg-white shadow-sm' : ''}`}
              >
                <Layout className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isEditing 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              {isEditing ? '편집 완료' : '편집 모드'}
            </button>
            
            <button
              onClick={savePage}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Save className="w-4 h-4" />
              저장
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              <Eye className="w-4 h-4" />
              미리보기
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* 왼쪽 사이드바 - 페이지 목록 */}
        {!currentPage && (
          <div className="w-80 bg-white border-r h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">페이지 관리</h2>
              
              <button
                onClick={() => setCurrentPage('new')}
                className="w-full flex items-center gap-2 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4"
              >
                <Plus className="w-4 h-4" />
                새 페이지 추가
              </button>
              
              <div className="space-y-2">
                {pages.map(page => (
                  <div
                    key={page.id}
                    onClick={() => setCurrentPage(page.id)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border"
                  >
                    {page.icon}
                    <div className="flex-1">
                      <div className="font-medium">{page.name}</div>
                      <div className="text-sm text-gray-500">{page.url}</div>
                    </div>
                    <Globe className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 메인 편집 영역 */}
        {currentPage && (
          <div className="flex-1 flex">
            {/* 편집 패널 */}
            {isEditing && (
              <div className="w-80 bg-white border-r h-screen overflow-y-auto">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">페이지 설정</h3>
                  
                  {/* 페이지 제목 */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">페이지 제목</label>
                    <input
                      type="text"
                      value={pageContent.title || ''}
                      onChange={(e) => setPageContent((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  {/* Hero 섹션 설정 */}
                  {pageContent.hero && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3">Hero 섹션</h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Hero 제목"
                          value={pageContent.hero.title || ''}
                          onChange={(e) => setPageContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, title: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <textarea
                          placeholder="Hero 부제목"
                          value={pageContent.hero.subtitle || ''}
                          onChange={(e) => setPageContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, subtitle: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          rows={2}
                        />
                        <input
                          type="text"
                          placeholder="버튼 텍스트"
                          value={pageContent.hero.ctaText || ''}
                          onChange={(e) => setPageContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, ctaText: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* 섹션 추가 버튼들 */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">섹션 추가</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => addSection('banner')}
                        className="p-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        배너
                      </button>
                      <button
                        onClick={() => addSection('content')}
                        className="p-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
                      >
                        콘텐츠
                      </button>
                      <button
                        onClick={() => addSection('features')}
                        className="p-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
                      >
                        특징
                      </button>
                      <button
                        onClick={() => addSection('gallery')}
                        className="p-2 text-sm bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
                      >
                        갤러리
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 페이지 미리보기 */}
            <div className="flex-1 bg-gray-100 p-6">
              <div 
                className={`mx-auto bg-white shadow-lg transition-all duration-300 ${
                  previewMode === 'desktop' ? 'max-w-7xl' :
                  previewMode === 'tablet' ? 'max-w-3xl' : 'max-w-sm'
                }`}
              >
                {/* Hero 섹션 */}
                {pageContent.hero && (
                  <div 
                    className="relative h-96 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center"
                    style={{ 
                      backgroundImage: pageContent.hero.backgroundImage ? `url(${pageContent.hero.backgroundImage})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="text-center px-6">
                      <h1 className="text-4xl font-bold mb-4">{pageContent.hero.title}</h1>
                      <p className="text-xl mb-6">{pageContent.hero.subtitle}</p>
                      <button className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100">
                        {pageContent.hero.ctaText}
                      </button>
                    </div>
                  </div>
                )}

                {/* 동적 셉션들 */}
                {pageContent.sections?.map((section, index) => (
                  <div 
                    key={section.id} 
                    className={`relative ${isEditing ? 'border-2 border-dashed border-blue-300 hover:border-blue-500' : ''}`}
                  >
                    {isEditing && (
                      <div className="absolute top-2 right-2 flex gap-2 z-10">
                        <button
                          onClick={() => updateSection(section.id, { title: prompt('새 제목:', section.title) || section.title })}
                          className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
                        >
                          편집
                        </button>
                        <button
                          onClick={() => deleteSection(section.id)}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded"
                        >
                          삭제
                        </button>
                      </div>
                    )}

                    {/* 배너 섹션 */}
                    {section.type === 'banner' && (
                      <div 
                        className="p-8 text-center"
                        style={{ 
                          backgroundColor: section.backgroundColor || '#3B82F6',
                          color: section.textColor || '#FFFFFF'
                        }}
                      >
                        <h2 className="text-3xl font-bold mb-4">{section.title}</h2>
                        <p className="text-lg mb-6">{section.description}</p>
                        <button className="px-6 py-3 bg-white bg-opacity-20 rounded-lg font-semibold hover:bg-opacity-30">
                          {section.ctaText}
                        </button>
                      </div>
                    )}

                    {/* 특징 섹션 */}
                    {section.type === 'features' && (
                      <div className="p-8">
                        <h2 className="text-3xl font-bold text-center mb-12">{section.title}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {(section as FeaturesSection).items?.map((item, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-4xl mb-4">{item.icon}</div>
                              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                              <p className="text-gray-600">{item.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 콘텐츠 섹션 */}
                    {section.type === 'content' && (
                      <div className="p-8">
                        <h2 className="text-3xl font-bold mb-6">{section.title}</h2>
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.content || '<p>여기에 내용을 입력하세요.</p>') }} />
                      </div>
                    )}

                    {/* 진행률 섹션 (크라우드펀딩용) */}
                    {section.type === 'progress' && (
                      <div className="p-8 bg-gray-50">
                        <div className="max-w-2xl mx-auto">
                          <div className="bg-gray-200 rounded-full h-4 mb-6">
                            <div 
                              className="bg-blue-500 h-4 rounded-full"
                              style={{ width: `${(section.current / section.target) * 100}%` }}
                            ></div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold">{Math.round((section.current / section.target) * 100)}%</div>
                              <div className="text-gray-600">달성률</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">{section.backers}</div>
                              <div className="text-gray-600">후원자</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">{section.daysLeft}</div>
                              <div className="text-gray-600">남은 일수</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageManager;