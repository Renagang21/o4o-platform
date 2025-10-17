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

  // Get markdown from attributes (new format) or data (old format)
  const markdown = (attributes?.markdown || data?.markdownContent || '') as string;
  const filename = (attributes?.filename || data?.filename || '') as string;

  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);

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

  // Show TOC if 3 or more headings
  const showTOC = headings.length >= 3;

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
