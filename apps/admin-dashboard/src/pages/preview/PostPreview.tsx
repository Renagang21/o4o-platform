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

  const renderBlock = (block: Block) => {
    const { type, content, attributes } = block;
    const blockContent = typeof content === 'string' ? content : content?.text || '';

    switch (type) {
      case 'o4o/paragraph':
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

      case 'o4o/heading':
      case 'heading':
        const HeadingTag = `h${content?.level || 2}` as 'h1'|'h2'|'h3'|'h4'|'h5'|'h6';
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

      case 'o4o/list':
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

      case 'o4o/quote':
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

      case 'o4o/code':
      case 'code':
        return (
          <pre 
            key={block.id} 
            className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto"
          >
            <code className="text-sm font-mono">{blockContent}</code>
          </pre>
        );

      case 'o4o/image':
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

      case 'o4o/button':
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

      case 'o4o/separator':
      case 'separator':
        return (
          <hr key={block.id} className="my-8 border-t border-gray-300" />
        );

      case 'o4o/spacer':
      case 'spacer':
        return (
          <div 
            key={block.id} 
            style={{ height: attributes?.height || '50px' }}
          />
        );

      case 'o4o/columns':
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

      case 'o4o/table':
        const tableContent = content?.tableData || attributes?.tableData || [];
        return (
          <div key={block.id} className="mb-6 overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <tbody>
                {tableContent.map((row: any[], rowIndex: number) => (
                  <tr key={rowIndex} className={rowIndex === 0 && attributes?.hasHeader ? 'bg-gray-100' : ''}>
                    {row.map((cell: any, cellIndex: number) => {
                      const CellTag = rowIndex === 0 && attributes?.hasHeader ? 'th' : 'td';
                      return (
                        <CellTag
                          key={cellIndex}
                          className="border border-gray-300 px-4 py-2 text-left"
                        >
                          {cell}
                        </CellTag>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'o4o/cover':
        const coverUrl = attributes?.url || content?.url || '';
        const coverOverlayColor = attributes?.overlayColor || 'rgba(0,0,0,0.3)';
        return (
          <div
            key={block.id}
            className="relative mb-6 min-h-[400px] flex items-center justify-center rounded-lg overflow-hidden"
            style={{
              backgroundImage: coverUrl ? `url(${coverUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundColor: coverOverlayColor }}
            />
            <div className="relative z-10 text-white text-center p-8">
              {blockContent && <h2 className="text-4xl font-bold">{blockContent}</h2>}
            </div>
          </div>
        );

      case 'o4o/gallery':
        const galleryImages = attributes?.images || [];
        return (
          <div key={block.id} className="mb-6">
            <div className={`grid gap-4 grid-cols-${attributes?.columns || 3}`}>
              {galleryImages.map((img: any, index: number) => (
                <figure key={index} className="overflow-hidden rounded-lg">
                  <img
                    src={img.url || img.src}
                    alt={img.alt || ''}
                    className="w-full h-auto object-cover"
                  />
                  {img.caption && (
                    <figcaption className="mt-2 text-sm text-gray-600 text-center">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        );

      case 'o4o/slide':
        const slides = attributes?.slides || [];
        return (
          <div key={block.id} className="mb-6 bg-gray-100 rounded-lg p-8">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">Slide Block ({slides.length} slides)</p>
              {slides.length > 0 && (
                <div className="bg-white p-6 rounded shadow">
                  <h3 className="text-xl font-semibold mb-2">{slides[0].title || 'Slide 1'}</h3>
                  <p className="text-gray-700">{slides[0].content || ''}</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'o4o/video':
        const videoUrl = attributes?.src || attributes?.url || content?.url || '';
        const videoPoster = attributes?.poster || '';
        return (
          <div key={block.id} className="mb-6">
            <video
              controls
              className="w-full rounded-lg"
              poster={videoPoster}
              style={{ maxWidth: '100%' }}
            >
              <source src={videoUrl} />
              Your browser does not support the video tag.
            </video>
            {attributes?.caption && (
              <p className="mt-2 text-sm text-gray-600 text-center">{attributes.caption}</p>
            )}
          </div>
        );

      case 'core/social-links':
        const socialLinks = attributes?.links || [];
        return (
          <div key={block.id} className="mb-6 flex gap-4 justify-center">
            {socialLinks.map((link: any, index: number) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
                title={link.service}
              >
                {link.service || 'Social'}
              </a>
            ))}
          </div>
        );

      case 'o4o/shortcode':
        const shortcode = attributes?.shortcode || blockContent || '';
        return (
          <div key={block.id} className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
            <code className="text-sm text-gray-700">{shortcode}</code>
          </div>
        );

      case 'o4o/youtube':
        const youtubeUrl = attributes?.url || content?.url || '';
        const youtubeVideoId = attributes?.videoId || '';
        const embedUrl = youtubeVideoId
          ? `https://www.youtube.com/embed/${youtubeVideoId}`
          : youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be')
            ? youtubeUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
            : '';

        return (
          <div key={block.id} className="mb-6">
            {embedUrl ? (
              <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={embedUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="p-6 bg-gray-100 rounded-lg text-center text-gray-500">
                YouTube video URL not provided
              </div>
            )}
          </div>
        );

      case 'o4o/file':
        const fileUrl = attributes?.url || content?.url || '';
        const fileFileName = attributes?.fileName || content?.fileName || 'Download File';
        const fileSize = attributes?.fileSize || content?.fileSize || 0;
        const formatBytes = (bytes: number) => {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        };

        return (
          <div key={block.id} className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{fileFileName}</p>
                {fileSize > 0 && (
                  <p className="text-sm text-gray-500">{formatBytes(fileSize)}</p>
                )}
              </div>
              {fileUrl && (
                <a
                  href={fileUrl}
                  download
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Download
                </a>
              )}
            </div>
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
