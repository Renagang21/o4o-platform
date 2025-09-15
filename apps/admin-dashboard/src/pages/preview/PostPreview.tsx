/**
 * PostPreview Component
 * Renders a preview of the post content from the Gutenberg editor
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Block } from '@/types/post.types';
import { ArrowLeft, ExternalLink, Eye, Monitor, Tablet, Smartphone } from 'lucide-react';
import { postApi } from '@/services/api/postApi';
import './preview-styles.css';

interface PreviewContent {
  title: string;
  blocks: Block[];
  postId?: string;
  status?: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

const PostPreview: React.FC = () => {
  const [content, setContent] = useState<PreviewContent | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const loadContent = async () => {
      try {
        if (id) {
          // Load content from API using URL parameter
          const response = await postApi.get(id);
          const post = response.data;
          
          // Parse content string back to blocks array
          let blocks: Block[] = [];
          if (post.content) {
            try {
              blocks = JSON.parse(post.content);
              // Handle case where content is wrapped in { blocks: [...] } structure
              if (blocks && typeof blocks === 'object' && 'blocks' in blocks) {
                blocks = (blocks as any).blocks;
              }
            } catch (error) {
              console.error('Failed to parse post content:', error);
              blocks = [];
            }
          }
          
          const previewContent: PreviewContent = {
            title: post.title || 'Untitled Post',
            blocks: blocks,
            postId: post.id,
            status: post.status
          };
          
          setContent(previewContent);
        } else {
          // Fallback to sessionStorage for editor preview
          const storedContent = sessionStorage.getItem('previewContent');
          if (storedContent) {
            try {
              const parsed = JSON.parse(storedContent);
              setContent(parsed);
            } catch (error) {
              if (import.meta.env.DEV) {
                console.error('Failed to parse preview content', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load post for preview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [id]);

  const renderBlock = (block: Block) => {
    const { type, content, attributes } = block;
    const blockContent = typeof content === 'string' ? content : content?.text || '';

    switch (type) {
      case 'core/paragraph':
      case 'paragraph':
        return (
          <p 
            key={block.id} 
            className="mb-4 text-gray-700 leading-relaxed"
            style={{
              textAlign: attributes?.align || 'left',
              fontSize: attributes?.fontSize || '16px',
              color: attributes?.textColor || '#374151',
            }}
          >
            {blockContent}
          </p>
        );

      case 'core/heading':
      case 'heading':
        const HeadingTag = `h${content?.level || 2}` as keyof JSX.IntrinsicElements;
        const headingClasses = {
          h1: 'text-4xl font-bold mb-6 text-gray-900',
          h2: 'text-3xl font-semibold mb-5 text-gray-800',
          h3: 'text-2xl font-semibold mb-4 text-gray-800',
          h4: 'text-xl font-medium mb-3 text-gray-700',
          h5: 'text-lg font-medium mb-2 text-gray-700',
          h6: 'text-base font-medium mb-2 text-gray-600',
        };
        return (
          <HeadingTag 
            key={block.id} 
            className={headingClasses[HeadingTag]}
            style={{
              textAlign: attributes?.align || 'left',
              color: attributes?.textColor,
            }}
          >
            {blockContent}
          </HeadingTag>
        );

      case 'core/list':
      case 'list':
        const ListTag = attributes?.ordered ? 'ol' : 'ul';
        const listItems = content?.items || [blockContent];
        return (
          <ListTag 
            key={block.id} 
            className={`mb-4 ${attributes?.ordered ? 'list-decimal' : 'list-disc'} list-inside text-gray-700`}
          >
            {listItems.map((item: string, index: number) => (
              <li key={index} className="mb-1">{item}</li>
            ))}
          </ListTag>
        );

      case 'core/quote':
      case 'quote':
        return (
          <blockquote 
            key={block.id} 
            className="border-l-4 border-gray-300 pl-4 py-2 mb-4 italic text-gray-600"
          >
            <p>{blockContent}</p>
            {content?.citation && (
              <cite className="block mt-2 text-sm text-gray-500 not-italic">
                — {content.citation}
              </cite>
            )}
          </blockquote>
        );

      case 'core/code':
      case 'code':
        return (
          <pre 
            key={block.id} 
            className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto"
          >
            <code className="text-sm font-mono">{blockContent}</code>
          </pre>
        );

      case 'core/image':
      case 'image':
        return (
          <figure key={block.id} className="mb-6">
            <img 
              src={content?.url || attributes?.url || ''} 
              alt={content?.alt || attributes?.alt || ''}
              className="w-full h-auto rounded-lg"
              style={{
                maxWidth: attributes?.width || '100%',
                height: attributes?.height || 'auto',
              }}
            />
            {(content?.caption || attributes?.caption) && (
              <figcaption className="mt-2 text-sm text-gray-600 text-center">
                {content?.caption || attributes?.caption}
              </figcaption>
            )}
          </figure>
        );

      case 'core/button':
      case 'button':
        return (
          <div key={block.id} className="mb-4">
            <button 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              style={{
                backgroundColor: attributes?.backgroundColor || '#2563eb',
                color: attributes?.textColor || '#ffffff',
                borderRadius: attributes?.borderRadius || '8px',
              }}
            >
              {blockContent || 'Click here'}
            </button>
          </div>
        );

      case 'core/separator':
      case 'separator':
        return (
          <hr key={block.id} className="my-8 border-t border-gray-300" />
        );

      case 'core/spacer':
      case 'spacer':
        return (
          <div 
            key={block.id} 
            style={{ height: attributes?.height || '50px' }}
          />
        );

      case 'core/columns':
      case 'columns':
        return (
          <div key={block.id} className="grid grid-cols-2 gap-4 mb-4">
            {content?.columns?.map((column: any, index: number) => (
              <div key={index} className="p-4">
                {column.blocks?.map((innerBlock: Block) => renderBlock(innerBlock))}
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div key={block.id} className="p-4 mb-4 bg-gray-100 rounded">
            <p className="text-sm text-gray-500">
              Unsupported block type: {type}
            </p>
          </div>
        );
    }
  };

  const getDeviceClasses = () => {
    switch (deviceType) {
      case 'tablet':
        return 'max-w-3xl';
      case 'mobile':
        return 'max-w-sm';
      default:
        return 'max-w-5xl';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Preview Available</h2>
          <p className="text-gray-500 mb-4">No content to preview. Please go back to the editor.</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close Preview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.close()}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                title="Close preview"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Back to Editor</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Preview Mode</span>
                {content.status && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                    {content.status}
                  </span>
                )}
              </div>
            </div>

            {/* Center Section - Device Selector */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDeviceType('desktop')}
                className={`p-2 rounded ${deviceType === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Desktop view"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeviceType('tablet')}
                className={`p-2 rounded ${deviceType === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Tablet view"
              >
                <Tablet className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeviceType('mobile')}
                className={`p-2 rounded ${deviceType === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Mobile view"
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-sm">New Tab</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex justify-center px-4 py-8">
        <div className={`w-full ${getDeviceClasses()} transition-all duration-300`}>
          <article className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            {/* Post Title */}
            <header className="mb-8 pb-6 border-b border-gray-200">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                {content.title || 'Untitled Post'}
              </h1>
            </header>

            {/* Post Content */}
            <div className="prose prose-lg max-w-none">
              {content.blocks.map((block) => renderBlock(block))}
            </div>

            {/* Empty State */}
            {content.blocks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No content blocks to display</p>
              </div>
            )}
          </article>
        </div>
      </div>

      {/* Device Frame Overlay for mobile/tablet */}
      {deviceType !== 'desktop' && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="flex items-center justify-center h-full">
            <div 
              className={`border-8 border-gray-800 rounded-3xl ${
                deviceType === 'tablet' ? 'w-3/4 h-3/4' : 'w-96 h-[680px]'
              }`}
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PostPreview;