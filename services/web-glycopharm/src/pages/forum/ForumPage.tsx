import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  Plus,
  MessageSquare,
  ThumbsUp,
  Eye,
  Tag,
  TrendingUp,
  MessageSquarePlus,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { LoadingState, EmptyState } from '@/components/common';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  isHot: boolean;
}

const categories = ['전체', 'CGM', '혈당측정기', '상담', '영양', '의약품', '기타'];

const popularTags = ['CGM', '당뇨관리', '식단', '인슐린', '혈당측정', '상담팁', '신제품'];

export default function ForumPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  // API 상태
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 게시글 로드
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<ForumPost[]>('/api/v1/glycopharm/forum/posts');
        if (response.data) {
          setPosts(response.data);
        }
      } catch {
        // API가 없거나 에러 시 빈 배열 유지
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const hotPosts = posts.filter((p) => p.isHot);

  if (isLoading) {
    return <LoadingState message="게시글을 불러오는 중..." />;
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">포럼</h1>
          <p className="text-slate-500">약사들의 지식과 경험을 나눠보세요</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25">
          <Plus className="w-5 h-5" />
          글쓰기
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search & Filter */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어를 입력하세요..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Author Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold">{post.author.charAt(0)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-800">{post.author}</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                        {post.authorRole}
                      </span>
                      <span className="text-xs text-slate-400">{post.createdAt}</span>
                      {post.isHot && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          HOT
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-slate-800 mb-2 line-clamp-1">
                      {post.title}
                    </h3>

                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                      {post.content}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded-lg"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="bg-white rounded-2xl">
              <EmptyState
                icon={MessageSquare}
                title="게시글이 없습니다"
                description={searchQuery ? "검색 조건에 맞는 게시글이 없습니다." : "아직 작성된 게시글이 없습니다. 첫 번째 글을 작성해보세요!"}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Popular Tags */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary-600" />
              인기 태그
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  className="text-sm px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-primary-100 hover:text-primary-700 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Hot Posts */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-500" />
              인기글
            </h3>
            <div className="space-y-3">
              {hotPosts.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">인기글이 없습니다</p>
              )}
              {hotPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                >
                  <span className="text-lg font-bold text-primary-600">{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">
                      {post.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      조회 {post.views} · 좋아요 {post.likes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Forum Request */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-primary-600" />
              포럼 신청
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              원하는 포럼이 없나요? 새 포럼을 신청해보세요!
            </p>
            <div className="space-y-2">
              <NavLink
                to="/forum/request-category"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" />
                새 포럼 신청
              </NavLink>
              <NavLink
                to="/forum/my-requests"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                내 신청 내역
              </NavLink>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-primary-50 rounded-2xl p-5">
            <h3 className="font-semibold text-primary-800 mb-2">커뮤니티 가이드</h3>
            <ul className="text-sm text-primary-700 space-y-1">
              <li>• 서로를 존중해주세요</li>
              <li>• 정확한 정보를 공유해주세요</li>
              <li>• 광고성 글은 삼가해주세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
