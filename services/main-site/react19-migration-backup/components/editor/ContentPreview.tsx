import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { JSONContent } from '@tiptap/react';
import {
  Eye,
  EyeOff,
  Monitor,
  Tablet,
  Smartphone,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  Share,
  ExternalLink
} from 'lucide-react';

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
  seo?: {
    title: string;
    description: string;
    keywords: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
}

interface ContentPreviewProps {
  content: Content;
  isVisible: boolean;
  onToggle: () => void;
  onClose: () => void;
}

// JSON Content를 HTML로 변환하는 함수 (간단한 렌더러)
const renderContent = (content: JSONContent): string => {
  if (!content || !content.content) return '';

  const renderNode = (node: any): string => {
    switch (node.type) {
      case 'paragraph':
        const pContent = node.content?.map(renderNode).join('') || '';
        return `<p class="mb-4 text-gray-800 leading-relaxed">${pContent}</p>`;
      
      case 'heading':
        const hContent = node.content?.map(renderNode).join('') || '';
        const level = node.attrs?.level || 1;
        const headingClasses = {
          1: 'text-4xl font-bold text-gray-900 mb-6 mt-8',
          2: 'text-3xl font-bold text-gray-900 mb-5 mt-7',
          3: 'text-2xl font-bold text-gray-900 mb-4 mt-6',
          4: 'text-xl font-bold text-gray-900 mb-3 mt-5',
          5: 'text-lg font-bold text-gray-900 mb-3 mt-4',
          6: 'text-base font-bold text-gray-900 mb-2 mt-3'
        };
        return `<h${level} class="${headingClasses[level as keyof typeof headingClasses]}">${hContent}</h${level}>`;
      
      case 'text':
        let text = node.text || '';
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'bold':
                text = `<strong class="font-bold">${text}</strong>`;
                break;
              case 'italic':
                text = `<em class="italic">${text}</em>`;
                break;
              case 'strike':
                text = `<s class="line-through">${text}</s>`;
                break;
              case 'code':
                text = `<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">${text}</code>`;
                break;
              case 'link':
                text = `<a href="${mark.attrs?.href || '#'}" class="text-blue-600 hover:text-blue-800 underline" target="_blank">${text}</a>`;
                break;
            }
          });
        }
        return text;
      
      case 'bulletList':
        const listItems = node.content?.map(renderNode).join('') || '';
        return `<ul class="list-disc list-inside mb-4 space-y-1 ml-4">${listItems}</ul>`;
      
      case 'orderedList':
        const orderedItems = node.content?.map(renderNode).join('') || '';
        return `<ol class="list-decimal list-inside mb-4 space-y-1 ml-4">${orderedItems}</ol>`;
      
      case 'listItem':
        const itemContent = node.content?.map(renderNode).join('') || '';
        return `<li class="text-gray-800">${itemContent}</li>`;
      
      case 'blockquote':
        const quoteContent = node.content?.map(renderNode).join('') || '';
        return `<blockquote class="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-blue-50 italic text-gray-700">${quoteContent}</blockquote>`;
      
      case 'codeBlock':
        const codeContent = node.content?.map(renderNode).join('') || '';
        return `<pre class="bg-gray-900 text-green-400 p-4 rounded-lg mb-4 overflow-x-auto"><code>${codeContent}</code></pre>`;
      
      case 'hardBreak':
        return '<br>';
      
      case 'image':
        return `<img src="${node.attrs?.src || ''}" alt="${node.attrs?.alt || ''}" class="max-w-full h-auto rounded-lg shadow-md mb-4" />`;
      
      case 'youTubeEmbed':
        const videoId = node.attrs?.url?.split('v=')[1]?.split('&')[0] || node.attrs?.url?.split('/').pop();
        return `<div class="mb-4"><iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen class="rounded-lg"></iframe></div>`;
      
      case 'productBlock':
        return `
          <div class="border rounded-lg p-4 mb-4 bg-white shadow-sm">
            <div class="flex items-center gap-4">
              <img src="${node.attrs?.imageUrl || ''}" alt="${node.attrs?.name || ''}" class="w-20 h-20 object-cover rounded" />
              <div class="flex-1">
                <h3 class="font-bold text-lg text-gray-900">${node.attrs?.name || ''}</h3>
                <p class="text-gray-600 mb-2">${node.attrs?.description || ''}</p>
                <p class="text-xl font-bold text-blue-600">₩${(node.attrs?.price || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        `;
      
      default:
        return node.content?.map(renderNode).join('') || '';
    }
  };

  return content.content.map(renderNode).join('');
};

const ContentPreview: React.FC<ContentPreviewProps> = ({
  content,
  isVisible,
  onToggle,
  onClose
}) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 뷰포트 크기
  const viewportSizes = {
    desktop: { width: '100%', maxWidth: '1200px' },
    tablet: { width: '768px', maxWidth: '768px' },
    mobile: { width: '375px', maxWidth: '375px' }
  };

  // 새로고침
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // 공유 URL 생성
  const generateShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/preview/${content.id}`;
  };

  // 공유하기
  const handleShare = async () => {
    const shareUrl = generateShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('미리보기 URL이 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('URL 복사 실패:', err);
    }
  };

  if (!isVisible) return null;

  const htmlContent = renderContent(content.content);

  return (
    <div className={`fixed inset-0 bg-white z-50 transition-all duration-300 ${
      isFullscreen ? '' : 'top-0 right-0 w-1/2'
    }`}>
      <div className="h-full flex flex-col">
        {/* 헤더 */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold">미리보기</h3>
            <div className="text-sm text-gray-300">
              {content.title} ({content.type})
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 디바이스 선택 */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('desktop')}
                className={`p-2 rounded ${viewMode === 'desktop' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                title="데스크톱"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('tablet')}
                className={`p-2 rounded ${viewMode === 'tablet' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                title="태블릿"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`p-2 rounded ${viewMode === 'mobile' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                title="모바일"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* 액션 버튼 */}
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-700 rounded"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-700 rounded"
              title="공유"
            >
              <Share className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-700 rounded"
              title={isFullscreen ? "창 모드" : "전체화면"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-700 rounded"
              title="미리보기 숨기기"
            >
              <EyeOff className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 미리보기 콘텐츠 */}
        <div className="flex-1 bg-gray-100 p-4 overflow-auto">
          <div 
            className="mx-auto bg-white shadow-lg transition-all duration-300"
            style={viewportSizes[viewMode]}
          >
            {/* SEO 미리보기 */}
            {content.seo && (
              <div className="border-b bg-blue-50 p-4">
                <div className="text-xs text-gray-500 mb-2">검색 결과 미리보기</div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                    {content.seo.title || content.title}
                  </div>
                  <div className="text-green-700 text-sm">
                    {window.location.origin}/{content.slug}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {content.seo.description || content.excerpt || ''}
                  </div>
                </div>
              </div>
            )}

            {/* 페이지 헤더 */}
            <div className="p-8 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              {content.featuredImage && (
                <img
                  src={content.featuredImage}
                  alt={content.title}
                  className="w-full h-48 object-cover rounded-lg mb-6"
                />
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {content.type === 'page' ? '페이지' : 
                   content.type === 'post' ? '포스트' : 
                   content.type === 'product' ? '제품' : '공지사항'}
                </span>
                {content.category && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                    {content.category}
                  </span>
                )}
                <span>{content.author}</span>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {content.title}
              </h1>
              
              {content.excerpt && (
                <p className="text-xl text-gray-600 leading-relaxed">
                  {content.excerpt}
                </p>
              )}

              {content.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {content.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white text-gray-700 rounded-full text-sm border"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 컨텐츠 본문 */}
            <div className="p-8">
              <div 
                key={refreshKey}
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>

            {/* 페이지 푸터 */}
            <div className="border-t bg-gray-50 p-8">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  마지막 수정: {new Date().toLocaleDateString('ko-KR')}
                </div>
                <div className="flex gap-4">
                  <button className="text-blue-600 hover:text-blue-800">
                    공유하기
                  </button>
                  <button className="text-blue-600 hover:text-blue-800">
                    인쇄하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 상태 바 */}
        <div className="bg-gray-800 text-white p-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>현재 뷰: {viewMode}</span>
            <span>상태: {content.status === 'published' ? '공개' : content.status === 'draft' ? '초안' : '보관'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>실시간 미리보기</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;