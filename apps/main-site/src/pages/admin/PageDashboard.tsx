// 📚 페이지 관리 대시보드 (관리자용)

import { useState, useEffect, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Search,
  Calendar,
  FileText,
  Settings
} from 'lucide-react';
import { 
  getPageList, 
  PageListItem, 
  deletePage, 
  isValidSlug, 
  generateSlug,
  getPageViewUrl,
  getPageEditUrl
} from '../../utils/pageSystem';

const PageDashboard: FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = () => {
    try {
      const pageList = getPageList();
      setPages(pageList.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    } catch (error) {
      console.error('페이지 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = () => {
    if (!newPageTitle.trim()) {
      alert('페이지 제목을 입력하세요.');
      return;
    }

    const slug = newPageSlug.trim() || generateSlug(newPageTitle);
    
    if (!isValidSlug(slug)) {
      alert('유효하지 않은 슬러그입니다. 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.');
      return;
    }

    // 중복 확인
    if (pages.some(p => p.slug === slug)) {
      alert('이미 존재하는 슬러그입니다.');
      return;
    }

    // 새 페이지로 이동 (에디터에서 자동 생성됨)
    navigate(getPageEditUrl(slug));
    
    setShowCreateModal(false);
    setNewPageTitle('');
    setNewPageSlug('');
  };

  const handleDeletePage = (slug: string, title: string) => {
    if (confirm(`"${title}" 페이지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      try {
        deletePage(slug);
        loadPages();
        alert('페이지가 삭제되었습니다.');
      } catch (error) {
        alert('페이지 삭제 중 오류가 발생했습니다.');
        console.error('페이지 삭제 오류:', error);
      }
    }
  };

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">페이지 목록을 로드하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📚 페이지 관리</h1>
              <p className="text-gray-600 mt-1">Notion 스타일 블록 에디터로 페이지를 관리하세요</p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 페이지
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="페이지 제목 또는 슬러그로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-gray-500">
              총 {filteredPages.length}개 페이지
            </div>
          </div>
        </div>

        {/* 페이지 목록 */}
        {filteredPages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '페이지가 없습니다'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? '다른 검색어를 시도해보세요.' 
                : '첫 번째 페이지를 만들어보세요!'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 페이지 만들기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPages.map((page) => (
              <div key={page.slug} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {page.title}
                      </h3>
                      <div className="text-sm text-gray-500 mb-3">
                        /{page.slug}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          page.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {page.status === 'published' ? '게시됨' : '초안'}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(page.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(getPageViewUrl(page.slug))}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      보기
                    </button>
                    <button
                      onClick={() => navigate(getPageEditUrl(page.slug))}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      편집
                    </button>
                    <button
                      onClick={() => handleDeletePage(page.slug, page.title)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 새 페이지 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">새 페이지 만들기</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    페이지 제목 *
                  </label>
                  <input
                    type="text"
                    value={newPageTitle}
                    onChange={(e) => {
                      setNewPageTitle(e.target.value);
                      if (!newPageSlug) {
                        setNewPageSlug(generateSlug(e.target.value));
                      }
                    }}
                    placeholder="예: 회사 소개"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    슬러그 (URL)
                  </label>
                  <div className="flex items-center">
                    <span className="text-gray-500 text-sm">/page/</span>
                    <input
                      type="text"
                      value={newPageSlug}
                      onChange={(e) => setNewPageSlug(e.target.value.toLowerCase())}
                      placeholder="about-us"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ml-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    영문 소문자, 숫자, 하이픈만 사용 가능
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPageTitle('');
                    setNewPageSlug('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCreatePage}
                  disabled={!newPageTitle.trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  만들기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageDashboard;
