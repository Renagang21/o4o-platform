import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, TrendingUp, Clock, MessageCircle, 
  ThumbsUp, ThumbsDown, Search, Filter, Star, Pin
} from 'lucide-react';
import { Navbar } from '@o4o/ui';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    level: number;
    badge?: string;
  };
  category: string;
  tags: string[];
  votes: {
    up: number;
    down: number;
    userVote?: 'up' | 'down' | null;
  };
  comments: number;
  views: number;
  createdAt: string;
  updatedAt?: string;
  isPinned: boolean;
  isHot: boolean;
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  postCount: number;
  color: string;
  icon: string;
}

const ForumDashboard: React.FC = () => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [searchTerm, setSearchTerm] = useState('');

  // 모의 데이터 로드
  useEffect(() => {
    const mockCategories: ForumCategory[] = [
      {
        id: 'all',
        name: '전체',
        description: '모든 게시글',
        postCount: 156,
        color: 'bg-gray-100 text-gray-800',
        icon: '📋'
      },
      {
        id: 'pharmacy',
        name: '약품 정보',
        description: '의약품 관련 정보 및 질문',
        postCount: 42,
        color: 'bg-blue-100 text-blue-800',
        icon: '💊'
      },
      {
        id: 'supplements',
        name: '건강식품',
        description: '건강기능식품 리뷰 및 정보',
        postCount: 38,
        color: 'bg-green-100 text-green-800',
        icon: '🌿'
      },
      {
        id: 'medical',
        name: '의료기기',
        description: '의료기기 사용법 및 Q&A',
        postCount: 24,
        color: 'bg-purple-100 text-purple-800',
        icon: '🏥'
      },
      {
        id: 'business',
        name: '비즈니스',
        description: '업계 정보 및 사업 관련',
        postCount: 52,
        color: 'bg-orange-100 text-orange-800',
        icon: '💼'
      }
    ];

    const mockPosts: ForumPost[] = [
      {
        id: '1',
        title: '[공지] 포럼 이용 규칙 및 가이드라인',
        content: '안전하고 건전한 포럼 문화를 위한 기본 규칙을 안내드립니다...',
        author: {
          id: 'admin',
          name: '관리자',
          avatar: '/avatars/admin.jpg',
          level: 99,
          badge: '관리자'
        },
        category: 'business',
        tags: ['공지', '규칙'],
        votes: { up: 45, down: 2, userVote: null },
        comments: 12,
        views: 1250,
        createdAt: '2025-01-20T09:00:00Z',
        isPinned: true,
        isHot: false
      },
      {
        id: '2',
        title: '혈압약 복용 중 주의해야 할 건강식품이 있을까요?',
        content: '고혈압으로 약을 복용하고 있는데, 같이 먹으면 안 되는 건강식품이나 영양제가 있는지 궁금합니다...',
        author: {
          id: 'user123',
          name: '건강지킴이',
          avatar: '/avatars/user1.jpg',
          level: 15,
          badge: '활성 회원'
        },
        category: 'pharmacy',
        tags: ['혈압약', '건강식품', '상호작용'],
        votes: { up: 28, down: 3, userVote: null },
        comments: 15,
        views: 342,
        createdAt: '2025-01-20T14:30:00Z',
        isPinned: false,
        isHot: true
      },
      {
        id: '3',
        title: '오메가3 제품 비교 후기 (6개월 복용 경험)',
        content: '여러 브랜드의 오메가3을 비교해본 솔직한 후기를 공유드립니다...',
        author: {
          id: 'reviewer',
          name: '리뷰어',
          avatar: '/avatars/user2.jpg',
          level: 22,
          badge: '리뷰 전문가'
        },
        category: 'supplements',
        tags: ['오메가3', '후기', '비교'],
        votes: { up: 67, down: 8, userVote: 'up' },
        comments: 32,
        views: 1150,
        createdAt: '2025-01-19T16:45:00Z',
        isPinned: false,
        isHot: true
      }
    ];

    setCategories(mockCategories);
    setPosts(mockPosts);
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                메인으로
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">💬 전문가 포럼</h1>
            </div>
            
            <Link
              to="/forum/write"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              글쓰기
            </Link>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* 사이드바 - 카테고리 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="font-semibold text-gray-900 mb-4">카테고리</h2>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{category.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{category.name}</div>
                          <div className="text-sm text-gray-500">{category.description}</div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-400">{category.postCount}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* 인기 태그 */}
              <div className="mt-8">
                <h3 className="font-semibold text-gray-900 mb-4">인기 태그</h3>
                <div className="flex flex-wrap gap-2">
                  {['혈압약', '오메가3', '프로바이오틱스', '비타민D', '마그네슘', '코큐텐'].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 cursor-pointer transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* 메인 콘텐츠 영역 */}
          <div className="lg:col-span-3">
            {/* 검색 및 정렬 */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="게시글 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'hot' | 'new' | 'top')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="hot">인기순</option>
                    <option value="new">최신순</option>
                    <option value="top">추천순</option>
                  </select>
                  
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Filter className="w-4 h-4" />
                    필터
                  </button>
                </div>
              </div>
            </div>
            
            {/* 게시글 목록 */}
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* 게시글 헤더 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {post.isPinned && (
                            <Pin className="w-4 h-4 text-red-500" />
                          )}
                          {post.isHot && (
                            <TrendingUp className="w-4 h-4 text-orange-500" />
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            categories.find(c => c.id === post.category)?.color || 'bg-gray-100 text-gray-800'
                          }`}>
                            {categories.find(c => c.id === post.category)?.name}
                          </span>
                        </div>
                        
                        <Link
                          to={`/forum/post/${post.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                        >
                          {post.title}
                        </Link>
                        
                        <p className="text-gray-600 mt-2 line-clamp-2">{post.content}</p>
                        
                        {/* 태그 */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 cursor-pointer transition-colors"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* 게시글 하단 정보 */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        {/* 작성자 정보 */}
                        <div className="flex items-center gap-3">
                          <img
                            src={post.author.avatar}
                            alt={post.author.name}
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/api/placeholder/32/32';
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{post.author.name}</span>
                              {post.author.badge && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                  {post.author.badge}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">Lv.{post.author.level}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString('ko-KR')} {' '}
                              {new Date(post.createdAt).toLocaleTimeString('ko-KR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 통계 및 액션 */}
                      <div className="flex items-center gap-4">
                        {/* 투표 */}
                        <div className="flex items-center gap-1">
                          <button 
                            className={`p-1 rounded transition-colors ${
                              post.votes.userVote === 'up' 
                                ? 'text-green-600 bg-green-50' 
                                : 'text-gray-400 hover:text-green-600'
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-700">
                            {post.votes.up - post.votes.down}
                          </span>
                          <button 
                            className={`p-1 rounded transition-colors ${
                              post.votes.userVote === 'down' 
                                ? 'text-red-600 bg-red-50' 
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* 댓글 */}
                        <div className="flex items-center gap-1 text-gray-500">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm">{post.comments}</span>
                        </div>
                        
                        {/* 조회수 */}
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{post.views}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 빈 상태 */}
              {filteredPosts.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">게시글이 없습니다</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm ? '검색 조건에 맞는 게시글이 없습니다.' : '첫 번째 게시글을 작성해보세요!'}
                  </p>
                  <Link
                    to="/forum/write"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    글쓰기
                  </Link>
                </div>
              )}
              
              {/* 페이지네이션 */}
              {filteredPosts.length > 0 && (
                <div className="flex justify-center mt-8">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      이전
                    </button>
                    {[1, 2, 3, 4, 5].map((page) => (
                      <button
                        key={page}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          page === 1 
                            ? 'bg-blue-600 text-white' 
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      다음
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumDashboard;
