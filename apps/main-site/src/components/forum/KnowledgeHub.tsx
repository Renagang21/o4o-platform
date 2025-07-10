
import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, TrendingUp, BookOpen, Users } from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  viewCount: number;
  responseCount: number;
  expertVerified: boolean;
  trustScore: number;
  tags: string[];
  createdAt: string;
  author: {
    name: string;
    avatar: string;
    isExpert: boolean;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string;
  topicCount: number;
  subcategories: {
    id: string;
    name: string;
    count: number;
  }[];
}

const KnowledgeHub: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'expert'>('popular');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // 초기 데이터 로드
  useEffect(() => {
    // API 호출로 대체될 예정
    setCategories([
      {
        id: 'health',
        name: '의료/건강',
        icon: '🏥',
        topicCount: 1245,
        subcategories: [
          { id: 'internal', name: '내과 질환', count: 432 },
          { id: 'nutrition', name: '영양/보충제', count: 298 },
          { id: 'fitness', name: '운동/피트니스', count: 187 },
          { id: 'mental', name: '정신건강', count: 128 }
        ]
      },
      {
        id: 'beauty',
        name: '뷰티/화장품',
        icon: '💄',
        topicCount: 892,
        subcategories: [
          { id: 'skincare', name: '스킨케어', count: 341 },
          { id: 'makeup', name: '메이크업', count: 267 },
          { id: 'haircare', name: '헤어케어', count: 198 },
          { id: 'bodycare', name: '향수/바디케어', count: 86 }
        ]
      },
      {
        id: 'science',
        name: '과학/기술',
        icon: '🔬',
        topicCount: 567,
        subcategories: [
          { id: 'biology', name: '생명과학', count: 234 },
          { id: 'chemistry', name: '화학/성분', count: 189 },
          { id: 'innovation', name: '기술혁신', count: 144 }
        ]
      }
    ]);

    // 샘플 토픽 데이터
    setTopics([
      {
        id: '1',
        title: '프로바이오틱스 언제 먹는게 좋나요?',
        category: 'health',
        subcategory: 'nutrition',
        viewCount: 1247,
        responseCount: 8,
        expertVerified: true,
        trustScore: 94,
        tags: ['프로바이오틱스', '복용법', '영양제'],
        createdAt: '2024-06-14T09:30:00Z',
        author: {
          name: '건강러버',
          avatar: '/avatars/user1.jpg',
          isExpert: false
        }
      },
      {
        id: '2',
        title: '비타민D 부족 증상과 해결법',
        category: 'health',
        subcategory: 'nutrition',
        viewCount: 2156,
        responseCount: 12,
        expertVerified: true,
        trustScore: 96,
        tags: ['비타민D', '영양부족', '건강관리'],
        createdAt: '2024-06-13T14:15:00Z',
        author: {
          name: '김영양사',
          avatar: '/avatars/expert1.jpg',
          isExpert: true
        }
      }
    ]);
  }, []);

  const filteredTopics = topics.filter(topic => {
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const sortedTopics = [...filteredTopics].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.viewCount - a.viewCount;
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'expert':
        return (b.expertVerified ? 1 : 0) - (a.expertVerified ? 1 : 0);
      default:
        return 0;
    }
  });

  const TrustScore: React.FC<{ score: number }> = ({ score }) => (
    <div className="flex items-center space-x-1">
      <div className="text-xs font-medium text-gray-600">신뢰도</div>
      <div className={`text-xs font-bold ${
        score >= 90 ? 'text-green-600' : 
        score >= 70 ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {score}점
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">지식 허브</h1>
        <p className="text-gray-600">정보가 지식이 되고, 지식이 신뢰가 되는 공간</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 카테고리 사이드바 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">카테고리</h3>
            
            <div 
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer mb-2 ${
                selectedCategory === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedCategory('all')}
            >
              <span className="text-lg">📚</span>
              <div>
                <div className="font-medium">전체</div>
                <div className="text-sm text-gray-500">
                  {categories.reduce((sum, cat) => sum + cat.topicCount, 0)}개 토픽
                </div>
              </div>
            </div>

            {categories.map(category => (
              <div key={category.id} className="mb-4">
                <div 
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer ${
                    selectedCategory === category.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="text-lg">{category.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-gray-500">{category.topicCount}개 토픽</div>
                  </div>
                </div>
                
                {selectedCategory === category.id && (
                  <div className="ml-8 mt-2 space-y-1">
                    {category.subcategories.map(sub => (
                      <div key={sub.id} className="flex justify-between items-center p-2 text-sm hover:bg-gray-50 rounded">
                        <span>{sub.name}</span>
                        <span className="text-gray-500">{sub.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="lg:col-span-3">
          {/* 검색 및 필터 */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="궁금한 내용을 검색해보세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-2">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="popular">인기순</option>
                  <option value="recent">최신순</option>
                  <option value="expert">전문가순</option>
                </select>
                
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  <span>필터</span>
                </button>
              </div>
            </div>
          </div>

          {/* 추천 토픽 */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-semibold">인기 토픽</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedTopics.slice(0, 4).map(topic => (
                <div key={topic.id} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 line-clamp-2">{topic.title}</h3>
                    {topic.expertVerified && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-xs font-medium">검증됨</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-3">
                      <span>👀 {topic.viewCount.toLocaleString()}</span>
                      <span>💬 {topic.responseCount}</span>
                    </div>
                    <TrustScore score={topic.trustScore} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 토픽 리스트 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">전체 토픽</h2>
              <span className="text-gray-500">{sortedTopics.length}개의 토픽</span>
            </div>

            {sortedTopics.map(topic => (
              <div key={topic.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 cursor-pointer">
                        {topic.title}
                      </h3>
                      {topic.expertVerified && (
                        <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                          <Star className="w-3 h-3 fill-current" />
                          <span>전문가 검증</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {topic.tags.map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <TrustScore score={topic.trustScore} />
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <img 
                        src={topic.author.avatar} 
                        alt={topic.author.name}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/24/24';
                        }}
                      />
                      <span className={topic.author.isExpert ? 'text-blue-600 font-medium' : ''}>
                        {topic.author.name}
                        {topic.author.isExpert && ' ⚕️'}
                      </span>
                    </div>
                    <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{topic.viewCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{topic.responseCount}개 답변</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 더보기 버튼 */}
          <div className="text-center mt-8">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              더 많은 토픽 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeHub;