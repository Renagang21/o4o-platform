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
  const url = (attributes?.url || data?.url || '') as string;
  const markdownContent = (attributes?.markdown || data?.markdownContent || '') as string;
  const filename = (attributes?.filename || data?.filename || '') as string;

  // Debug: Log block data (development only)
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[MarkdownReaderBlock] Block data:', {
      hasAttributes: !!attributes,
      hasData: !!data,
      url,
      markdownContentLength: markdownContent?.length || 0,
      filename,
      attributesKeys: attributes ? Object.keys(attributes) : [],
      dataKeys: data ? Object.keys(data) : []
    });
  }

  const [markdown, setMarkdown] = useState<string>(markdownContent);
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

  // Extract headings from markdown
  const headings = useMemo((): Heading[] => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const results: Heading[] = [];
    let match;

    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      // Generate ID similar to marked's headerIds
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      results.push({ id, level, text });
    }

    return results;
  }, [markdown]);

  // Show TOC if 1 or more headings
  const showTOC = headings.length >= 1;

  // Scroll to heading
  const scrollToHeading = useCallback((id: string) => {
    if (!previewRef.current) return;

    const element = previewRef.current.querySelector(`#${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden my-6 p-8">
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
      <div className="relative bg-red-50 border border-red-200 rounded-lg overflow-hidden my-6 p-4">
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
    <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden my-6">
      {/* Filename Header */}
      {filename && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{filename}</span>
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div className="flex">
        {/* Table of Contents Sidebar */}
        {showTOC && (
          <div className="w-56 flex-shrink-0 border-r border-gray-200 p-4 overflow-y-auto max-h-[600px] sticky top-0">
            <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              목차
            </h3>
            <nav className="space-y-1">
              {headings.map((heading) => (
                <button
                  key={heading.id}
                  onClick={() => scrollToHeading(heading.id)}
                  className={`block w-full text-left text-xs py-1.5 px-2 rounded transition-colors ${
                    heading.level === 1 ? 'font-semibold' : ''
                  } ${
                    heading.level === 2 ? 'font-medium' : ''
                  } ${
                    heading.level >= 3 ? 'font-normal text-gray-600' : ''
                  } ${
                    heading.level === 2 ? 'pl-2' : ''
                  } ${
                    heading.level === 3 ? 'pl-4' : ''
                  } ${
                    heading.level === 4 ? 'pl-6' : ''
                  } ${
                    heading.level >= 5 ? 'pl-8' : ''
                  } ${
                    activeHeadingId === heading.id
                      ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                      : 'hover:bg-gray-100 text-gray-700 border-l-2 border-transparent'
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
          className="prose prose-sm max-w-none p-4 flex-1 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
        />
      </div>
    </div>
  );
};
