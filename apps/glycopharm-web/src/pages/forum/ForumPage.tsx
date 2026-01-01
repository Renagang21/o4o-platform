import { useState } from 'react';
import {
  Search,
  Plus,
  MessageSquare,
  ThumbsUp,
  Eye,
  Clock,
  Tag,
  TrendingUp,
} from 'lucide-react';

// Mock forum posts
const mockPosts = [
  {
    id: '1',
    title: 'CGM 센서 부착 위치에 대한 팁 공유',
    content: '환자분들께 CGM 센서 부착 시 위치 선정에 대해 여러 가지 팁을 공유드립니다...',
    author: '김약사',
    authorRole: '약사',
    category: 'CGM',
    tags: ['CGM', '센서', '팁'],
    views: 1250,
    likes: 45,
    comments: 23,
    createdAt: '2024-01-15',
    isHot: true,
  },
  {
    id: '2',
    title: '혈당 관리 상담 시 자주 받는 질문들',
    content: '환자분들이 혈당 관리에 대해 자주 물어보시는 질문들을 정리해봤습니다...',
    author: '이약사',
    authorRole: '약사',
    category: '상담',
    tags: ['상담', 'FAQ'],
    views: 890,
    likes: 32,
    comments: 18,
    createdAt: '2024-01-14',
    isHot: false,
  },
  {
    id: '3',
    title: '당뇨 환자 식단 가이드 - 실전편',
    content: '당뇨 환자분들의 실제 식단 관리에 도움이 될 만한 내용들을 공유합니다...',
    author: '박약사',
    authorRole: '약사',
    category: '영양',
    tags: ['식단', '영양', '당뇨관리'],
    views: 2100,
    likes: 78,
    comments: 45,
    createdAt: '2024-01-13',
    isHot: true,
  },
  {
    id: '4',
    title: '인슐린 보관 및 사용 시 주의사항',
    content: '인슐린 보관과 사용에 있어서 주의해야 할 사항들을 정리했습니다...',
    author: '최약사',
    authorRole: '약사',
    category: '의약품',
    tags: ['인슐린', '보관', '주의사항'],
    views: 560,
    likes: 21,
    comments: 8,
    createdAt: '2024-01-12',
    isHot: false,
  },
];

const categories = ['전체', 'CGM', '혈당측정기', '상담', '영양', '의약품', '기타'];

const popularTags = ['CGM', '당뇨관리', '식단', '인슐린', '혈당측정', '상담팁', '신제품'];

export default function ForumPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  const filteredPosts = mockPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
            <div className="text-center py-12 bg-white rounded-2xl">
              <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">게시글이 없습니다</h3>
              <p className="text-slate-500">첫 번째 글을 작성해보세요!</p>
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
              {mockPosts
                .filter((p) => p.isHot)
                .map((post, index) => (
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
