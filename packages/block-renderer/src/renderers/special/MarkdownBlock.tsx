/**
 * Markdown Block Renderer with TOC
 */

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

// Heading structure for TOC
interface Heading {
  id: string;
  level: number;
  text: string;
}

// Helper function to generate heading ID from text
const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Configure marked with custom renderer to add IDs to headings
const renderer = new marked.Renderer();
const originalHeading = renderer.heading.bind(renderer);

renderer.heading = function (text: any, level: any, raw: any) {
  const id = generateHeadingId(typeof text === 'string' ? text : text.text || '');
  return `<h${level} id="${id}">${text}</h${level}>`;
};

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer: renderer,
});

export const MarkdownBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Get markdown content from various possible locations
  const markdown =
    getBlockData(block, 'markdown') ||
    getBlockData(block, 'markdownContent') ||
    getBlockData(block, 'content') ||
    '';

  if (!markdown) return null;

  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  const fontSize = getBlockData(block, 'fontSize', 16);
  const theme = getBlockData(block, 'theme', 'github');
  const className = getBlockData(block, 'className', '');

  // Extract headings from markdown
  const headings = useMemo((): Heading[] => {
    if (!markdown) return [];

    try {
      const html = marked.parse(markdown) as string;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

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
      console.error('[MarkdownBlock] Error extracting headings:', error);
      return [];
    }
  }, [markdown]);

  const showTOC = headings.length >= 1;

  // Scroll to heading
  const scrollToHeading = (id: string) => {
    if (!contentRef.current) return;

    const escapedId = CSS.escape(id);
    const element = contentRef.current.querySelector(`#${escapedId}`);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  // Track active heading on scroll (Intersection Observer)
  useEffect(() => {
    if (!contentRef.current || !showTOC) return;

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

    const headingElements = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [showTOC, markdown]);

  // Parse markdown to HTML
  let html = '';
  try {
    html = marked.parse(markdown) as string;
  } catch (error) {
    console.error('[MarkdownBlock] Failed to parse markdown:', error);
    return (
      <div className="block-markdown-error text-red-600 p-4 border border-red-300 rounded">
        Failed to parse markdown content
      </div>
    );
  }

  return (
    <div className={clsx('block-markdown mb-4', className)}>
      <div className="flex gap-4">
        {/* Table of Contents - Sticky Sidebar */}
        {showTOC && (
          <div className="w-56 flex-shrink-0 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                목차
              </h3>
              <nav className="space-y-1">
                {headings.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={() => scrollToHeading(heading.id)}
                    className={clsx(
                      'block w-full text-left text-xs py-1.5 px-2 rounded transition-colors',
                      heading.level === 1 && 'font-semibold',
                      heading.level === 2 && 'font-medium',
                      heading.level >= 3 && 'font-normal text-gray-600',
                      heading.level === 2 && 'pl-2',
                      heading.level === 3 && 'pl-4',
                      heading.level === 4 && 'pl-6',
                      heading.level >= 5 && 'pl-8',
                      activeHeadingId === heading.id
                        ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                        : 'hover:bg-gray-100 text-gray-700 border-l-2 border-transparent'
                    )}
                  >
                    <span className="line-clamp-2">{heading.text}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Markdown Content */}
        <div
          ref={contentRef}
          className={clsx(
            'prose prose-sm max-w-none flex-1',
            `theme-${theme}`
          )}
          style={{ fontSize: `${fontSize}px` }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
        />
      </div>
    </div>
  );
};

export default MarkdownBlock;
