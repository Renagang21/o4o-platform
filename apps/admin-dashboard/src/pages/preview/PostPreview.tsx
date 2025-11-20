/**
 * PostPreview Component
 * Renders a preview of the post content from the Gutenberg editor
 *
 * Unified architecture:
 * - Uses @o4o/block-renderer package shared across main-site and admin-dashboard
 * - No massive switch-case - clean and maintainable
 * - Single source of truth for all block rendering
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Block } from '@/types/post.types';
import { ArrowLeft, ExternalLink, Eye, Monitor, Tablet, Smartphone } from 'lucide-react';
import { postApi } from '@/services/api/postApi';
import { BlockRenderer } from '@o4o/block-renderer';
import { GlobalStyleInjector } from '@/components/GlobalStyleInjector';
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
          
          // Check if response is successful
          if (!response.success) {
            setContent({
              title: 'Error Loading Content',
              blocks: [],
              postId: id
            });
            return;
          }
          
          const post = response.data as any;
          if (!post) {
            setContent({ title: 'Not Found', blocks: [], postId: id });
            return;
          }
          let blocks: Block[] = [];

          // Extract title and content from WordPress-compatible format
          const title = post.title?.rendered || post.title || 'Untitled Post';
          const contentData = post.content?.rendered || post.content || '';

          if (contentData) {
            try {
              const parsed = JSON.parse(contentData);

              // Handle different possible formats
              if (Array.isArray(parsed)) {
                blocks = parsed;
              } else if (parsed && typeof parsed === 'object' && 'blocks' in parsed) {
                blocks = parsed.blocks || [];
              } else if (parsed && typeof parsed === 'object') {
                blocks = [parsed];
              }

              // Ensure all blocks have required properties
              blocks = blocks.filter(block => block && typeof block === 'object' && block.type);

            } catch (error) {
              blocks = [];
            }
          }

          setContent({
            title: title,
            blocks: blocks,
            postId: post.id,
            status: post.status
          });
        } else {
          // Fallback to sessionStorage for editor preview
          const storedContent = sessionStorage.getItem('previewContent');
          if (storedContent) {
            try {
              const parsed = JSON.parse(storedContent);
              setContent(parsed);
            } catch (error) {
              // Silent failure for preview content parsing
            }
          }
        }
      } catch (error) {
        // Silent failure for post loading
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [id]);

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
      {/* Inject appearance system styles and custom CSS */}
      <GlobalStyleInjector />

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
              <BlockRenderer blocks={content.blocks} />
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
