import { useState, useEffect, FC } from 'react';
import { motion } from 'motion/react';
import { 
  Plus,
  Edit,
  Edit3,
  Trash2,
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  Globe,
  FileText,
  Image as ImageIcon,
  Video,
  X,
  ExternalLink,
  Copy
} from 'lucide-react';
import { TiptapEditor } from '@o4o/ui/editor/TiptapEditor';
import { EnhancedTiptapEditor } from '@o4o/ui/editor/EnhancedTiptapEditor';
import { ContentCloneManager } from '@o4o/ui/editor/ContentCloneManager';
import SEOMetadataManager from '@o4o/ui/editor/SEOMetadataManager';
import ContentPreview from '@o4o/ui/editor/ContentPreview';
import { JSONContent } from '@tiptap/react';

// 컨텐츠 타입 정의
interface Content {
  id: string;
  title: string;
  type: 'page' | 'post' | 'product' | 'notice';
  status: 'draft' | 'published' | 'archived';
  content: JSONContent;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  author: string;
  category?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  views: number;
  seo?: {
    title: string;
    description: string;
    keywords: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
    noFollow?: boolean;
    customMeta?: Array<{
      name: string;
      content: string;
      type: 'name' | 'property' | 'httpEquiv';
    }>;
  };
}

// 초기 목업 데이터
const mockContents: Content[] = [
  {
    id: '1',
    title: '회사 소개 페이지',
    type: 'page',
    status: 'published',
    content: { type: 'doc', content: [] },
    slug: 'about',
    author: '관리자',
    tags: ['회사', '소개'],
    createdAt: '2025-01-15',
    updatedAt: '2025-01-15',
    publishedAt: '2025-01-15',
    views: 1234,
    seo: {
      title: '회사 소개 - 혁신적인 건강 솔루션의 리더',
      description: '우리는 혁신적인 건강 솔루션을 통해 더 나은 삶을 만들어갑니다. 회사의 비전, 미션, 그리고 팀을 만나보세요.',
      keywords: ['회사소개', '건강솔루션', '비전', '미션'],
      ogTitle: '회사 소개 - 혁신적인 건강 솔루션의 리더',
      ogDescription: '우리는 혁신적인 건강 솔루션을 통해 더 나은 삶을 만들어갑니다.',
      ogType: 'website',
      canonicalUrl: 'https://example.com/about'
    }
  },
  {
    id: '2',
    title: '2025년 신제품 출시 소식',
    type: 'post',
    status: 'published',
    content: { type: 'doc', content: [] },
    slug: '2025-new-product-launch',
    excerpt: '올해 새롭게 출시될 제품들을 소개합니다.',
    category: '뉴스',
    author: '마케팅팀',
    tags: ['신제품', '출시', '2025'],
    createdAt: '2025-01-10',
    updatedAt: '2025-01-12',
    publishedAt: '2025-01-12',
    views: 856,
    seo: {
      title: '2025년 신제품 출시 소식 - 혁신적인 건강 제품 라인업',
      description: '2025년 새롭게 출시되는 혁신적인 건강 제품들을 소개합니다. 최신 기술과 과학적 연구를 바탕으로 개발된 제품들을 만나보세요.',
      keywords: ['신제품', '2025', '건강제품', '출시', '혁신'],
      ogTitle: '2025년 신제품 출시 소식',
      ogDescription: '혁신적인 건강 제품 라인업을 소개합니다.',
      ogType: 'article',
      canonicalUrl: 'https://example.com/2025-new-product-launch'
    }
  },
  {
    id: '3',
    title: '서비스 이용약관',
    type: 'page',
    status: 'draft',
    content: { type: 'doc', content: [] },
    slug: 'terms-of-service',
    author: '법무팀',
    tags: ['약관', '법무'],
    createdAt: '2025-01-08',
    updatedAt: '2025-01-14',
    views: 0,
    seo: {
      title: '서비스 이용약관',
      description: '서비스 이용에 관한 약관과 조건을 확인하세요.',
      keywords: ['이용약관', '서비스약관', '이용조건'],
      ogType: 'website',
      noIndex: true // 약관 페이지는 검색 결과에서 제외
    }
  }
];

const ContentManagement: FC = () => {
  const [contents, setContents] = useState(mockContents);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeEditTab, setActiveEditTab] = useState<'content' | 'seo'>('content');
  const [showPreview, setShowPreview] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 필터링된 컨텐츠
  const filteredContents = contents.filter((content: any) => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.tags.some((tag: any) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || content.type === filterType;
    const matchesStatus = filterStatus === 'all' || content.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // SEO 점수 계산 (간단한 버전)
  const calculateSEOScore = (content: Content): number => {
    if (!content.seo) return 0;
    
    let score = 0;
    const seo = content.seo;
    
    // 제목 (25점)
    if (seo.title && seo.title.length >= 30 && seo.title.length <= 60) score += 25;
    else if (seo.title && seo.title.length > 0) score += 15;
    
    // 설명 (25점)
    if (seo.description && seo.description.length >= 120 && seo.description.length <= 160) score += 25;
    else if (seo.description && seo.description.length > 0) score += 15;
    
    // 키워드 (15점)
    if (seo.keywords && seo.keywords.length > 0 && seo.keywords.length <= 10) score += 15;
    else if (seo.keywords && seo.keywords.length > 0) score += 10;
    
    // OG 이미지 (15점)
    if (seo.ogImage) score += 15;
    
    // 정규 URL (10점)
    if (seo.canonicalUrl) score += 10;
    
    // OG 제목/설명 (10점)
    if (seo.ogTitle && seo.ogDescription) score += 10;
    
    return score;
  };

  // SEO 점수 색상
  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 타입별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'page': return <Globe className="w-4 h-4" />;
      case 'post': return <FileText className="w-4 h-4" />;
      case 'product': return <ImageIcon className="w-4 h-4" />;
      case 'notice': return <Video className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // 새 컨텐츠 생성
  const handleCreateNew = (type: 'page' | 'post' | 'product' | 'notice') => {
    const newContent: Content = {
      id: Date.now().toString(),
      title: '새 ' + (type === 'page' ? '페이지' : type === 'post' ? '포스트' : type === 'product' ? '제품' : '공지사항'),
      type,
      status: 'draft',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '여기에 내용을 작성하세요...'
              }
            ]
          }
        ]
      },
      slug: `new-${type}-${Date.now()}`,
      author: '관리자',
      tags: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      views: 0,
      seo: {
        title: '',
        description: '',
        keywords: [],
        ogType: type === 'page' ? 'website' : 'article',
        noIndex: false,
        noFollow: false,
        customMeta: []
      }
    };
    
    setSelectedContent(newContent);
    setIsCreating(true);
    setIsEditing(true);
    setActiveEditTab('content');
  };

  // 컨텐츠 편집
  const handleEdit = (content: Content) => {
    setSelectedContent(content);
    setIsEditing(true);
    setIsCreating(false);
    setActiveEditTab('content');
  };

  // 컨텐츠 저장
  const handleSave = () => {
    if (!selectedContent) return;

    if (isCreating) {
      setContents((prev: any) => [...prev, selectedContent]);
    } else {
      setContents((prev: any) => prev.map((c: any) => 
        c.id === selectedContent.id ? { ...selectedContent, updatedAt: new Date().toISOString().split('T')[0] } : c
      ));
    }
    
    setIsEditing(false);
    setIsCreating(false);
    setSelectedContent(null);
  };

  // 컨텐츠 삭제
  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setContents((prev: any) => prev.filter((c: any) => c.id !== id));
    }
  };

  // 상태 변경
  const handleStatusChange = (id: string, newStatus: 'draft' | 'published' | 'archived') => {
    setContents((prev: any) => prev.map((c: any) => 
      c.id === id ? { 
        ...c, 
        status: newStatus, 
        publishedAt: newStatus === 'published' ? new Date().toISOString().split('T')[0] : c.publishedAt 
      } : c
    ));
  };

  // 컨텐츠 복제
  const handleClone = (originalId: string, newContentData: Partial<Content>) => {
    const newId = `content_${Date.now()}`;
    const now = new Date().toISOString();
    
    const newContent: Content = {
      id: newId,
      title: newContentData.title || '',
      type: newContentData.type || 'post',
      status: newContentData.status || 'draft',
      content: newContentData.content || { type: 'doc', content: [] },
      slug: newContentData.slug || '',
      excerpt: newContentData.excerpt || '',
      featuredImage: newContentData.featuredImage,
      author: newContentData.author || 'Admin',
      category: newContentData.category,
      tags: newContentData.tags || [],
      createdAt: now,
      updatedAt: now,
      publishedAt: newContentData.status === 'published' ? now : undefined,
      views: 0,
      seo: newContentData.seo
    };

    setContents((prev: any) => [newContent, ...prev]);
    setShowCloneModal(false);
    
    // 복제된 컨텐츠를 편집 모드로 열기
    setSelectedContent(newContent);
    setIsEditing(true);
  };

  // 복제 모달 열기
  const handleOpenCloneModal = (content?: Content) => {
    if (content) {
      setSelectedContent(content);
    }
    setShowCloneModal(true);
  };

  // 자동 저장 함수 (자동 저장에서도 사용)
  const handleAutoSave = async () => {
    if (!selectedContent) return;
    
    setIsLoading(true);
    try {
      // 실제 구현에서는 API 호출
      const updatedContent = {
        ...selectedContent,
        updatedAt: new Date().toISOString()
      };
      
      setContents((prev: any) => prev.map((c: any) => 
        c.id === selectedContent.id ? updatedContent : c
      ));
      
      // console.log('저장 완료:', selectedContent.id);
    } catch (error: any) {
    // Error logging - use proper error handler
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing && selectedContent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isCreating ? '새 컨텐츠 작성' : '컨텐츠 편집'}
              </h1>
              <p className="text-gray-600">{selectedContent.title}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? '미리보기 숨기기' : '미리보기'}
              </button>
              <button
                onClick={() => setShowFullPreview(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <ExternalLink className="w-4 h-4" />
                전체 미리보기
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setIsCreating(false);
                  setSelectedContent(null);
                  setShowPreview(false);
                  setShowFullPreview(false);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className={`mx-auto transition-all duration-300 ${showPreview ? 'max-w-none' : 'max-w-4xl'}`}>
            {/* 컨텐츠 메타 정보 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제목
                  </label>
                  <input
                    type="text"
                    value={selectedContent.title}
                    onChange={(e: any) => setSelectedContent((prev: any) => prev ? { ...prev, title: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    슬러그 (URL)
                  </label>
                  <input
                    type="text"
                    value={selectedContent.slug}
                    onChange={(e: any) => setSelectedContent((prev: any) => prev ? { ...prev, slug: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상태
                  </label>
                  <select
                    value={selectedContent.status}
                    onChange={(e: any) => setSelectedContent((prev: any) => prev ? { 
                      ...prev, 
                      status: e.target.value as 'draft' | 'published' | 'archived' 
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">초안</option>
                    <option value="published">공개</option>
                    <option value="archived">보관</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리
                  </label>
                  <input
                    type="text"
                    value={selectedContent.category || ''}
                    onChange={(e: any) => setSelectedContent((prev: any) => prev ? { ...prev, category: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="카테고리를 입력하세요"
                  />
                </div>
              </div>
              
              {selectedContent.type === 'post' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    요약
                  </label>
                  <textarea
                    value={selectedContent.excerpt || ''}
                    onChange={(e: any) => setSelectedContent((prev: any) => prev ? { ...prev, excerpt: e.target.value } : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="포스트 요약을 입력하세요"
                  />
                </div>
              )}
            </div>

            {/* 편집 탭 네비게이션 */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                {[
                  { id: 'content', name: '컨텐츠 편집', icon: Edit3 },
                  { id: 'seo', name: 'SEO 설정', icon: Search }
                ].map((tab: any) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveEditTab(tab.id as 'content' | 'seo')}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeEditTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* 편집 영역 */}
            <div className={`grid gap-6 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                {/* 탭 컨텐츠 */}
                {activeEditTab === 'content' && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <EnhancedTiptapEditor
                      content={selectedContent.content}
                      onChange={(content: any) => setSelectedContent((prev: any) => prev ? { ...prev, content } : null)}
                      onSave={handleSave}
                      isLoading={isLoading}
                      page={selectedContent.id}
                      placeholder={`${selectedContent.type === 'page' ? '페이지' : selectedContent.type === 'post' ? '포스트' : selectedContent.type === 'product' ? '제품' : '공지사항'} 내용을 작성하세요...`}
                      autoSave={{
                        enabled: true,
                        interval: 30000, // 30초
                        onAutoSave: async (content: any) => {
                          try {
                            // 자동 저장 로직 (임시로 localStorage 사용)
                            const updatedContent = { ...selectedContent, content, updatedAt: new Date().toISOString() };
                            localStorage.setItem(`content_${selectedContent.id}`, JSON.stringify(updatedContent));
                            
                            // 실제 구현에서는 API 호출
                            // console.log('자동 저장됨:', selectedContent.id);
                            return true;
                          } catch (error: any) {
    // Error logging - use proper error handler
                            return false;
                          }
                        }
                      }}
                    />
                  </div>
                )}

                {activeEditTab === 'seo' && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <SEOMetadataManager
                      metadata={selectedContent.seo || {
                        title: '',
                        description: '',
                        keywords: [],
                        ogType: 'article',
                        noIndex: false,
                        noFollow: false,
                        customMeta: []
                      }}
                      onChange={(seo: any) => setSelectedContent((prev: any) => prev ? { ...prev, seo } : null)}
                      contentType={selectedContent.type}
                      slug={selectedContent.slug}
                    />
                  </div>
                )}
              </div>

              {/* 미리보기 영역 */}
              {showPreview && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">실시간 미리보기</h3>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    {/* 간단한 미리보기 렌더링 */}
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-2">
                          {selectedContent.type === 'page' ? '페이지' : 
                           selectedContent.type === 'post' ? '포스트' : 
                           selectedContent.type === 'product' ? '제품' : '공지사항'} 미리보기
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                          {selectedContent.title}
                        </h1>
                        {selectedContent.excerpt && (
                          <p className="text-gray-600 mb-4">
                            {selectedContent.excerpt}
                          </p>
                        )}
                        {selectedContent.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedContent.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 border-t pt-4">
                          ✨ 실제 미리보기는 "미리보기" 버튼을 클릭하여 전체 화면으로 확인할 수 있습니다.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">컨텐츠 관리</h1>
              <p className="text-gray-600">페이지, 포스트, 제품 등 모든 컨텐츠를 관리하세요.</p>
            </div>
            
            {/* 새 컨텐츠 작성 버튼들 */}
            <div className="flex gap-2">
              <button
                onClick={() => handleCreateNew('page')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                새 페이지
              </button>
              <button
                onClick={() => handleCreateNew('post')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                새 포스트
              </button>
              <button
                onClick={() => handleCreateNew('notice')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                새 공지사항
              </button>
            </div>
          </div>

          {/* 검색 및 필터 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="제목, 작성자, 태그로 검색..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e: any) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">모든 타입</option>
                <option value="page">페이지</option>
                <option value="post">포스트</option>
                <option value="product">제품</option>
                <option value="notice">공지사항</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e: any) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">모든 상태</option>
                <option value="published">공개</option>
                <option value="draft">초안</option>
                <option value="archived">보관</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* 컨텐츠 목록 */}
        <motion.div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    컨텐츠
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    타입
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조회수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SEO 점수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수정일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContents.map((content: any) => (
                  <tr key={content.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{content.title}</div>
                        <div className="text-sm text-gray-500">/{content.slug}</div>
                        {content.excerpt && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                            {content.excerpt}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(content.type)}
                        <span className="text-sm text-gray-700 capitalize">{content.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={content.status}
                        onChange={(e: any) => handleStatusChange(content.id, e.target.value as 'draft' | 'published' | 'archived')}
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(content.status)}`}
                      >
                        <option value="draft">초안</option>
                        <option value="published">공개</option>
                        <option value="archived">보관</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{content.author}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{content.views.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const score = calculateSEOScore(content);
                        return (
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSEOScoreColor(score)}`}>
                            {score}/100
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{content.updatedAt}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(content)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="편집"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenCloneModal(content)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                          title="복제"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/${content.slug}`, '_blank')}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="미리보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredContents.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">컨텐츠가 없습니다</h3>
              <p className="text-gray-500">새로운 컨텐츠를 만들어보세요.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* 전체 화면 미리보기 */}
      {showFullPreview && selectedContent && (
        <ContentPreview
          content={selectedContent}
          isVisible={showFullPreview}
          onToggle={() => setShowFullPreview(!showFullPreview)}
          onClose={() => setShowFullPreview(false)}
        />
      )}
    </div>
  );
};

export default ContentManagement;