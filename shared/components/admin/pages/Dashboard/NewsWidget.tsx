import React from 'react';
import { Newspaper, ExternalLink, Calendar } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  link: string;
  type: 'news' | 'event' | 'update';
}

export function NewsWidget() {
  const newsItems: NewsItem[] = [
    {
      id: '1',
      title: 'WordPress 6.4 "Shirley" 출시',
      excerpt: '새로운 블록 테마와 개선된 편집 경험을 제공하는 WordPress 6.4가 출시되었습니다.',
      date: '2024년 6월 25일',
      link: 'https://wordpress.org/news/2024/06/shirley/',
      type: 'update'
    },
    {
      id: '2',
      title: 'WordCamp Asia 2024 온라인 개최',
      excerpt: '아시아 최대 WordPress 컨퍼런스가 온라인으로 개최됩니다. 등록은 무료입니다.',
      date: '2024년 6월 20일',
      link: 'https://asia.wordcamp.org/2024/',
      type: 'event'
    },
    {
      id: '3',
      title: '보안 업데이트: WordPress 6.3.2',
      excerpt: '중요한 보안 취약점을 수정하는 업데이트가 출시되었습니다. 즉시 업데이트하세요.',
      date: '2024년 6월 18일',
      link: 'https://wordpress.org/news/2024/06/security-update/',
      type: 'update'
    },
    {
      id: '4',
      title: '새로운 Gutenberg 플러그인 기능',
      excerpt: '블록 에디터의 새로운 기능들이 Gutenberg 플러그인을 통해 먼저 공개됩니다.',
      date: '2024년 6월 15일',
      link: 'https://wordpress.org/plugins/gutenberg/',
      type: 'news'
    }
  ];

  const getTypeColor = (type: NewsItem['type']) => {
    switch (type) {
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'event':
        return 'bg-green-100 text-green-800';
      case 'news':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: NewsItem['type']) => {
    switch (type) {
      case 'update':
        return '업데이트';
      case 'event':
        return '이벤트';
      case 'news':
        return '뉴스';
      default:
        return '일반';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Newspaper className="h-5 w-5 mr-2 text-purple-600" />
          WordPress 뉴스 & 이벤트
        </h3>
      </div>

      {/* Widget Content */}
      <div className="p-4">
        {newsItems.length > 0 ? (
          <div className="space-y-4">
            {newsItems.map((item) => (
              <article key={item.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
                {/* News Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                      {getTypeLabel(item.type)}
                    </span>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {item.date}
                    </div>
                  </div>
                </div>

                {/* News Content */}
                <h4 className="text-sm font-medium text-gray-900 mb-2 leading-5">
                  <a 
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors flex items-center"
                  >
                    {item.title}
                    <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                  </a>
                </h4>
                
                <p className="text-sm text-gray-600 leading-5">
                  {item.excerpt}
                </p>
              </article>
            ))}

            {/* WordPress.org Link */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <a 
                  href="https://wordpress.org/news/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                  WordPress.org 뉴스 더보기
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
                <a 
                  href="https://events.wordpress.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center"
                >
                  이벤트 찾기
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Newspaper className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">뉴스를 불러올 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}