import { FC, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { marked } from 'marked';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { FileText } from 'lucide-react';

interface MarkdownReaderBlockProps {
  block: MainSiteBlock;
}

// Heading structure for TOC
interface Heading {
  id: string;
  level: number;
  text: string;
}

/**
 * Markdown Reader Block Component
 * Renders markdown content with automatic table of contents
 */
export const MarkdownReaderBlock: FC<MarkdownReaderBlockProps> = ({ block }) => {
  const { data, attributes } = block;

  // Get markdown URL or content
  // Check both data and attributes for maximum compatibility
  // Also check content.text and data.text (Gutenberg block format)
  const url = (attributes?.url || data?.url || '') as string;
  const markdownContent = (
    attributes?.markdown ||
    data?.markdown ||
    data?.markdownContent ||
    data?.text ||
    (data?.content as any)?.text ||
    ''
  ) as string;
  const filename = (attributes?.filename || data?.filename || '') as string;

  const [markdown, setMarkdown] = useState<string>(markdownContent);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!!url && !markdownContent);
  const [error, setError] = useState<string>('');
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);

  // Fetch markdown from URL if provided
  useEffect(() => {
    if (!url || markdownContent) return;

    const fetchMarkdown = async () => {
      try {
        setLoading(true);
        setError('');

        // Construct full URL - if url starts with /, prepend API base URL
        const fullUrl = url.startsWith('http')
          ? url
          : `${import.meta.env.VITE_API_URL || 'https://api.neture.co.kr'}${url}`;

        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch markdown: ${response.statusText}`);
        }

        const text = await response.text();
        setMarkdown(text);
      } catch (err) {
        console.error('Error fetching markdown:', err);
        setError(err instanceof Error ? err.message : 'Failed to load markdown');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkdown();
  }, [url, markdownContent]);

  // Configure marked options with heading IDs
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false,
    });
  }, []);

  // Extract headings from rendered HTML (to match marked's actual IDs)
  const headings = useMemo((): Heading[] => {
    if (!markdown) return [];

    try {
      // First render the markdown to HTML
      const html = marked.parse(markdown) as string;

      // Create a temporary DOM element to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Extract all heading elements with their actual IDs
      const headingElements = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const results: Heading[] = [];

      headingElements.forEach((el) => {
        const tagName = el.tagName.toLowerCase();
        const level = parseInt(tagName.charAt(1), 10);
        const text = el.textContent || '';
        const id = el.id || '';

        if (id) {
          results.push({ id, level, text });
        }
      });

      return results;
    } catch (error) {
      console.error('Error extracting headings:', error);
      return [];
    }
  }, [markdown]);

  // Show TOC if 1 or more headings
  const showTOC = headings.length >= 1;

  // Scroll to heading
  const scrollToHeading = useCallback((id: string) => {
    if (!previewRef.current) return;

    // Use CSS.escape to safely handle IDs with special characters
    const escapedId = CSS.escape(id);
    const element = previewRef.current.querySelector(`#${escapedId}`);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Update URL hash without triggering navigation
      window.history.replaceState(null, '', `#${id}`);
    } else {
      console.warn(`Element with id "${id}" not found`);
    }
  }, []);

  // Track active heading on scroll (Intersection Observer)
  useEffect(() => {
    if (!previewRef.current || !showTOC) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id) {
              setActiveHeadingId(id);
            }
          }
        });
      },
      {
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0,
      }
    );

    // Observe all heading elements
    const headingElements = previewRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [showTOC, markdown]);

  // Handle internal anchor link clicks in markdown content
  useEffect(() => {
    if (!previewRef.current) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.hash && link.origin === window.location.origin) {
        e.preventDefault();
        const id = link.hash.slice(1); // Remove '#'
        scrollToHeading(id);
      }
    };

    const previewElement = previewRef.current;
    previewElement.addEventListener('click', handleLinkClick);

    return () => {
      previewElement.removeEventListener('click', handleLinkClick);
    };
  }, [scrollToHeading]);

  // Render markdown as HTML
  const renderMarkdown = () => {
    try {
      return marked.parse(markdown);
    } catch (error) {
      return '<p>Error rendering markdown</p>';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="relative bg-white p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">마크다운 파일 로딩 중...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative bg-red-50 border border-red-200 rounded-lg overflow-hidden p-4">
        <div className="flex items-center gap-2 text-red-700">
          <FileText className="h-5 w-5" />
          <span className="font-medium">마크다운 로딩 실패: {error}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!markdown) {
    return null;
  }

  return (
    <div className="relative bg-white overflow-hidden">
      {/* Debug Panel (dev only) */}
      {import.meta.env.DEV && (
        <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-yellow-800 font-mono hover:underline"
          >
            🐛 Debug Block Data {showDebug ? '▼' : '▶'}
          </button>
          {showDebug && (
            <pre className="mt-2 text-xs text-left overflow-auto max-h-60 bg-white p-2 rounded border border-yellow-300">
              {JSON.stringify({
                hasAttributes: !!attributes,
                hasData: !!data,
                url,
                markdownContentLength: markdownContent?.length || 0,
                filename,
                attributesKeys: attributes ? Object.keys(attributes) : [],
                dataKeys: data ? Object.keys(data) : [],
                attributes,
                data
              }, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Filename Header */}
      {filename && (
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{filename}</span>
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div className="flex min-h-screen">
        {/* Table of Contents Sidebar */}
        {showTOC && (
          <div className="w-64 flex-shrink-0 bg-gray-50 p-6 overflow-y-auto sticky top-0 h-screen border-r border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
              목차
            </h3>
            <nav className="space-y-2">
              {headings.map((heading) => (
                <button
                  key={heading.id}
                  onClick={() => scrollToHeading(heading.id)}
                  className={`block w-full text-left text-sm py-2 px-3 rounded transition-colors ${
                    heading.level === 1 ? 'font-bold' : ''
                  } ${
                    heading.level === 2 ? 'font-semibold' : ''
                  } ${
                    heading.level >= 3 ? 'font-normal text-gray-600' : ''
                  } ${
                    heading.level === 2 ? 'pl-3' : ''
                  } ${
                    heading.level === 3 ? 'pl-6' : ''
                  } ${
                    heading.level === 4 ? 'pl-9' : ''
                  } ${
                    heading.level >= 5 ? 'pl-12' : ''
                  } ${
                    activeHeadingId === heading.id
                      ? 'bg-blue-100 text-blue-800 border-l-3 border-blue-600'
                      : 'hover:bg-gray-200 text-gray-800 border-l-3 border-transparent'
                  }`}
                  title={heading.text}
                >
                  <span className="line-clamp-2">{heading.text}</span>
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Markdown Content */}
        <div
          ref={previewRef}
          className="prose prose-lg max-w-none p-8 flex-1 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
        />
      </div>
    </div>
  );
};
