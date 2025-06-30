import React, { ReactNode, useState } from 'react';
import { Calendar, Heart, MessageCircle, Share, Eye, ZoomIn } from 'lucide-react';

interface PhotoPost {
  id: string;
  title: string;
  description: string;
  images: {
    thumbnail: string;
    full: string;
    alt: string;
  }[];
  author: string;
  publishedAt: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[];
}

interface PhotoBlogLayoutProps {
  posts: PhotoPost[];
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const PhotoBlogLayout: React.FC<PhotoBlogLayoutProps> = ({
  posts,
  header,
  footer,
  className = ''
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className={`photo-blog-layout ${className}`}>
      {/* Header */}
      {header && (
        <header className="bg-secondary border-b border-theme sticky top-0 z-10">
          {header}
        </header>
      )}

      {/* Main Content - Masonry Grid */}
      <main className="container mx-auto px-4 py-8">
        {/* Blog Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            포토 갤러리
          </h1>
          <p className="text-secondary text-lg max-w-2xl mx-auto">
            순간의 아름다움을 담아낸 이야기들
          </p>
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {posts.map((post) => (
            <div 
              key={post.id}
              className="break-inside-avoid card rounded-lg shadow-theme overflow-hidden bg-secondary hover:shadow-lg transition-all duration-300"
            >
              {/* Main Image */}
              {post.images.length > 0 && (
                <div className="relative group cursor-pointer">
                  <img
                    src={post.images[0].thumbnail}
                    alt={post.images[0].alt}
                    className="w-full h-auto object-cover"
                    onClick={() => setSelectedImage(post.images[0].full)}
                  />
                  
                  {/* Image Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Multiple Images Indicator */}
                  {post.images.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      +{post.images.length - 1}
                    </div>
                  )}
                </div>
              )}

              {/* Post Content */}
              <div className="p-4">
                {/* Title */}
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                  {post.title}
                </h3>

                {/* Description */}
                <p className="text-secondary text-sm mb-3 line-clamp-3">
                  {post.description}
                </p>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-secondary mb-3">
                  <div className="flex items-center gap-2">
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{formatDate(post.publishedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{formatNumber(post.views)}</span>
                  </div>
                </div>

                {/* Interactions */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-sm text-secondary hover:text-accent-primary transition-colors">
                      <Heart className="w-4 h-4" />
                      <span>{formatNumber(post.likes)}</span>
                    </button>
                    <button className="flex items-center gap-1 text-sm text-secondary hover:text-accent-primary transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      <span>{formatNumber(post.comments)}</span>
                    </button>
                  </div>
                  <button className="text-secondary hover:text-accent-primary transition-colors">
                    <Share className="w-4 h-4" />
                  </button>
                </div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span 
                        key={tag}
                        className="px-2 py-1 text-xs bg-accent-primary/10 text-accent-primary rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs text-secondary">
                        +{post.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <button className="btn-theme-primary px-8 py-3 rounded-full transition-colors">
            더 많은 사진 보기
          </button>
        </div>
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt="확대된 이미지"
              className="max-w-full max-h-full object-contain"
            />
            <button
              className="absolute top-4 right-4 text-white text-2xl"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      {footer && (
        <footer className="bg-secondary border-t border-theme mt-16">
          {footer}
        </footer>
      )}
    </div>
  );
};

// Photo Blog Header
export const PhotoBlogHeader: React.FC = () => (
  <div className="container mx-auto px-4 py-4 flex justify-between items-center">
    <div className="flex items-center gap-4">
      <h1 className="text-xl font-bold">📸 PhotoBlog</h1>
    </div>
    <nav className="flex gap-6">
      <a href="#" className="text-secondary hover:text-primary transition-colors">갤러리</a>
      <a href="#" className="text-secondary hover:text-primary transition-colors">컬렉션</a>
      <a href="#" className="text-secondary hover:text-primary transition-colors">소개</a>
    </nav>
  </div>
);

// Photo Blog Footer
export const PhotoBlogFooter: React.FC = () => (
  <div className="container mx-auto px-4 py-8 text-center">
    <p className="text-secondary text-sm">
      © 2024 PhotoBlog. 모든 사진의 저작권은 작가에게 있습니다.
    </p>
  </div>
);