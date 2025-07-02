import React, { ReactNode } from 'react';
import { Calendar, Clock, User, Tag, TrendingUp, MessageCircle, Search, ArrowRight } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
  category: string;
  featuredImage?: string;
  views: number;
  comments: number;
  isFeatured?: boolean;
}

interface SidebarWidget {
  id: string;
  title: string;
  type: 'recent-posts' | 'popular-posts' | 'categories' | 'tags' | 'newsletter' | 'social';
  data?: any;
}

interface ComplexBlogLayoutProps {
  posts: BlogPost[];
  sidebarWidgets: SidebarWidget[];
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const ComplexBlogLayout: React.FC<ComplexBlogLayoutProps> = ({
  posts,
  sidebarWidgets,
  header,
  footer,
  className = ''
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const featuredPosts = posts.filter(post => post.isFeatured).slice(0, 3);
  const regularPosts = posts.filter(post => !post.isFeatured);

  const renderSidebarWidget = (widget: SidebarWidget) => {
    switch (widget.type) {
      case 'recent-posts':
        return (
          <div key={widget.id} className="card p-6 rounded-lg shadow-theme">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent-primary" />
              {widget.title}
            </h3>
            <div className="space-y-4">
              {posts.slice(0, 5).map((post) => (
                <div key={post.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-16 h-16 bg-accent-primary/10 rounded overflow-hidden">
                    {post.featuredImage ? (
                      <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent-primary">
                        <Tag className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium line-clamp-2 hover:text-accent-primary cursor-pointer">
                      {post.title}
                    </h4>
                    <p className="text-xs text-secondary mt-1">{formatDate(post.publishedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'popular-posts':
        return (
          <div key={widget.id} className="card p-6 rounded-lg shadow-theme">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-primary" />
              {widget.title}
            </h3>
            <div className="space-y-4">
              {posts.sort((a, b) => b.views - a.views).slice(0, 5).map((post, index) => (
                <div key={post.id} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-accent-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium line-clamp-2 hover:text-accent-primary cursor-pointer">
                      {post.title}
                    </h4>
                    <p className="text-xs text-secondary mt-1">{formatNumber(post.views)} 조회</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'categories':
        return (
          <div key={widget.id} className="card p-6 rounded-lg shadow-theme">
            <h3 className="text-lg font-semibold mb-4">{widget.title}</h3>
            <div className="space-y-2">
              {['비즈니스', '기술', '마케팅', '라이프스타일', '트렌드'].map((category) => (
                <a key={category} href="#" className="flex justify-between items-center py-2 text-sm hover:text-accent-primary transition-colors">
                  <span>{category}</span>
                  <span className="text-xs text-secondary">(12)</span>
                </a>
              ))}
            </div>
          </div>
        );

      case 'newsletter':
        return (
          <div key={widget.id} className="card p-6 rounded-lg shadow-theme bg-accent-primary/5">
            <h3 className="text-lg font-semibold mb-4">{widget.title}</h3>
            <p className="text-sm text-secondary mb-4">
              최신 글과 업데이트를 이메일로 받아보세요.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="이메일 주소"
                className="w-full px-3 py-2 text-sm border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
              <button className="w-full btn-theme-primary py-2 text-sm rounded-md transition-colors">
                구독하기
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`complex-blog-layout ${className}`}>
      {/* Header */}
      {header && (
        <header className="bg-secondary border-b border-theme sticky top-0 z-10">
          {header}
        </header>
      )}

      {/* Featured Posts Section */}
      {featuredPosts.length > 0 && (
        <section className="bg-accent-primary/5 py-12">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8 text-center">주요 포스트</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <article key={post.id} className="card rounded-lg shadow-theme overflow-hidden hover:shadow-lg transition-all duration-300">
                  {post.featuredImage && (
                    <div className="h-48 overflow-hidden">
                      <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="text-xs text-accent-primary font-medium mb-2">{post.category}</div>
                    <h3 className="text-xl font-bold mb-3 line-clamp-2 hover:text-accent-primary cursor-pointer">
                      {post.title}
                    </h3>
                    <p className="text-secondary text-sm line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-secondary">
                      <span>{formatDate(post.publishedAt)}</span>
                      <span>{post.readTime}분 읽기</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Posts */}
          <main className="lg:col-span-2">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">최신 글</h2>
              <div className="flex items-center gap-4">
                <select className="px-3 py-2 text-sm border border-theme rounded-md">
                  <option>최신순</option>
                  <option>인기순</option>
                  <option>조회순</option>
                </select>
              </div>
            </div>

            <div className="space-y-8">
              {regularPosts.map((post) => (
                <article key={post.id} className="card p-6 rounded-lg shadow-theme hover:shadow-lg transition-all duration-300">
                  <div className="flex gap-6">
                    {/* Post Image */}
                    {post.featuredImage && (
                      <div className="flex-shrink-0 w-48 h-32 rounded-lg overflow-hidden">
                        <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Post Content */}
                    <div className="flex-1 min-w-0">
                      {/* Category */}
                      <div className="text-xs text-accent-primary font-medium mb-2">{post.category}</div>

                      {/* Title */}
                      <h3 className="text-xl font-bold mb-3 hover:text-accent-primary cursor-pointer">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-secondary mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-sm text-secondary mb-4">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(post.publishedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{post.readTime}분</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.comments}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-1 text-xs bg-accent-primary/10 text-accent-primary rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <button className="flex items-center gap-1 text-sm text-accent-primary hover:text-accent-secondary transition-colors">
                          <span>더 읽기</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-12">
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm border border-theme rounded-md hover:bg-accent-primary hover:text-white transition-colors">이전</button>
                <button className="px-4 py-2 text-sm bg-accent-primary text-white rounded-md">1</button>
                <button className="px-4 py-2 text-sm border border-theme rounded-md hover:bg-accent-primary hover:text-white transition-colors">2</button>
                <button className="px-4 py-2 text-sm border border-theme rounded-md hover:bg-accent-primary hover:text-white transition-colors">3</button>
                <button className="px-4 py-2 text-sm border border-theme rounded-md hover:bg-accent-primary hover:text-white transition-colors">다음</button>
              </div>
            </div>
          </main>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Search Widget */}
            <div className="card p-6 rounded-lg shadow-theme">
              <h3 className="text-lg font-semibold mb-4">검색</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="검색어를 입력하세요..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
              </div>
            </div>

            {/* Dynamic Sidebar Widgets */}
            {sidebarWidgets.map(renderSidebarWidget)}
          </aside>
        </div>
      </div>

      {/* Footer */}
      {footer && (
        <footer className="bg-secondary border-t border-theme">
          {footer}
        </footer>
      )}
    </div>
  );
};

// Complex Blog Header
export const ComplexBlogHeader: React.FC = () => (
  <div className="container mx-auto px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-bold">🏢 Business Blog</h1>
        <nav className="hidden md:flex gap-6">
          <a href="#" className="text-secondary hover:text-primary transition-colors">홈</a>
          <a href="#" className="text-secondary hover:text-primary transition-colors">비즈니스</a>
          <a href="#" className="text-secondary hover:text-primary transition-colors">기술</a>
          <a href="#" className="text-secondary hover:text-primary transition-colors">마케팅</a>
          <a href="#" className="text-secondary hover:text-primary transition-colors">회사소개</a>
        </nav>
      </div>
      <button className="btn-theme-primary px-4 py-2 rounded-md transition-colors">
        구독하기
      </button>
    </div>
  </div>
);

// Complex Blog Footer
export const ComplexBlogFooter: React.FC = () => (
  <div className="container mx-auto px-6 py-12">
    <div className="grid md:grid-cols-4 gap-8 mb-8">
      <div>
        <h3 className="font-bold mb-4">Business Blog</h3>
        <p className="text-secondary text-sm">
          비즈니스 인사이트와 전문 지식을 공유하는 플랫폼입니다.
        </p>
      </div>
      <div>
        <h4 className="font-semibold mb-4">카테고리</h4>
        <ul className="space-y-2 text-sm text-secondary">
          <li><a href="#" className="hover:text-primary">비즈니스</a></li>
          <li><a href="#" className="hover:text-primary">기술</a></li>
          <li><a href="#" className="hover:text-primary">마케팅</a></li>
          <li><a href="#" className="hover:text-primary">트렌드</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4">회사</h4>
        <ul className="space-y-2 text-sm text-secondary">
          <li><a href="#" className="hover:text-primary">소개</a></li>
          <li><a href="#" className="hover:text-primary">팀</a></li>
          <li><a href="#" className="hover:text-primary">채용</a></li>
          <li><a href="#" className="hover:text-primary">연락처</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4">소셜 미디어</h4>
        <div className="flex gap-3">
          <a href="#" className="w-8 h-8 bg-accent-primary text-white rounded-full flex items-center justify-center text-sm">f</a>
          <a href="#" className="w-8 h-8 bg-accent-primary text-white rounded-full flex items-center justify-center text-sm">t</a>
          <a href="#" className="w-8 h-8 bg-accent-primary text-white rounded-full flex items-center justify-center text-sm">in</a>
        </div>
      </div>
    </div>
    <div className="border-t border-theme pt-8 text-center text-sm text-secondary">
      © 2024 Business Blog. 모든 권리 보유.
    </div>
  </div>
);