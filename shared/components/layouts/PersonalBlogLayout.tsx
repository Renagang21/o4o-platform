import React, { ReactNode } from 'react';
import { Calendar, Clock, User, Tag } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
  featuredImage?: string;
}

interface PersonalBlogLayoutProps {
  posts: BlogPost[];
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const PersonalBlogLayout: React.FC<PersonalBlogLayoutProps> = ({
  posts,
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

  return (
    <div className={`personal-blog-layout ${className}`}>
      {/* Header */}
      {header && (
        <header className="bg-secondary border-b border-theme">
          {header}
        </header>
      )}

      {/* Main Content - Single Column */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Blog Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            개인 블로그
          </h1>
          <p className="text-secondary text-lg max-w-2xl mx-auto">
            일상의 작은 이야기들과 생각들을 담아내는 공간입니다.
          </p>
        </div>

        {/* Posts List */}
        <div className="space-y-16">
          {posts.map((post) => (
            <article 
              key={post.id}
              className="card p-8 rounded-lg shadow-theme hover-bg transition-all duration-300"
            >
              {/* Featured Image */}
              {post.featuredImage && (
                <div className="mb-6 -mx-8 -mt-8">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-64 object-cover rounded-t-lg"
                  />
                </div>
              )}

              {/* Post Meta */}
              <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-secondary">
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
                  <span>{post.readTime}분 읽기</span>
                </div>
              </div>

              {/* Post Title */}
              <h2 className="text-2xl md:text-3xl font-bold mb-4 hover:text-accent-primary transition-colors cursor-pointer">
                {post.title}
              </h2>

              {/* Post Excerpt */}
              <p className="text-secondary text-lg leading-relaxed mb-6">
                {post.excerpt}
              </p>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-accent-primary/10 text-accent-primary rounded-full"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Read More */}
              <button className="btn-theme-primary px-6 py-2 rounded-md transition-colors">
                전체 읽기
              </button>
            </article>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-16">
          <button className="btn-theme-secondary px-8 py-3 rounded-md transition-colors">
            더 많은 글 보기
          </button>
        </div>
      </main>

      {/* Footer */}
      {footer && (
        <footer className="bg-secondary border-t border-theme mt-16">
          {footer}
        </footer>
      )}
    </div>
  );
};

// Simple Blog Header Component
export const PersonalBlogHeader: React.FC = () => (
  <div className="max-w-4xl mx-auto px-6 py-6 flex justify-between items-center">
    <div>
      <h1 className="text-xl font-bold">My Blog</h1>
    </div>
    <nav className="flex gap-6">
      <a href="#" className="text-secondary hover:text-primary transition-colors">홈</a>
      <a href="#" className="text-secondary hover:text-primary transition-colors">글</a>
      <a href="#" className="text-secondary hover:text-primary transition-colors">소개</a>
      <a href="#" className="text-secondary hover:text-primary transition-colors">연락</a>
    </nav>
  </div>
);

// Simple Blog Footer Component
export const PersonalBlogFooter: React.FC = () => (
  <div className="max-w-4xl mx-auto px-6 py-8 text-center">
    <p className="text-secondary text-sm">
      © 2024 개인 블로그. 모든 권리 보유.
    </p>
  </div>
);