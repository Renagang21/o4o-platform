/**
 * Markdown Block Renderer
 * Handles markdown rendering with TOC sidebar (consistent with MarkdownBlock and MarkdownReaderBlock)
 */

import React from 'react';
import { marked } from 'marked';
import { Block } from '@/types/post.types';
import { FileText } from 'lucide-react';

// Heading structure for TOC
interface Heading {
  id: string;
  level: number;
  text: string;
}

// Configure marked options (consistent with MarkdownBlock and MarkdownReaderBlock)
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
});

// Extract headings from markdown content
const extractHeadings = (markdownContent: string): Heading[] => {
  if (!markdownContent) return [];

  try {
    // First render the markdown to HTML
    const html = marked.parse(markdownContent) as string;

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
};

export const renderMarkdown = (block: Block) => {
  const { content, attributes } = block;

  // Use marked library for proper markdown rendering (same as editor and frontend)
  const markdownContent = attributes?.markdown || content || '';
  const filename = attributes?.filename || '';

  if (!markdownContent) return null;

  // Extract headings from rendered HTML (to match marked's actual IDs)
  const headings = extractHeadings(markdownContent);

  // Show TOC if 1 or more headings
  const showTOC = headings.length >= 1;

  let markdownHTML = '';
  try {
    markdownHTML = marked.parse(markdownContent) as string;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    markdownHTML = `<pre>${markdownContent}</pre>`;
  }

  return (
    <div key={block.id} className="mb-6">
      {/* Filename Header */}
      {filename && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 rounded-t-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{filename}</span>
          </div>
        </div>
      )}

      <div className={`flex border border-gray-200 ${filename ? '' : 'rounded-lg'} ${filename ? 'rounded-b-lg' : ''} overflow-hidden`}>
        {/* Table of Contents Sidebar */}
        {showTOC && (
          <div className="w-56 flex-shrink-0 border-r border-gray-200 p-4 overflow-y-auto max-h-[600px] bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              목차
            </h3>
            <nav className="space-y-1">
              {headings.map((heading) => {
                const cn = [
                  'block w-full text-left text-xs py-1.5 px-2 rounded transition-colors',
                  heading.level === 1 && 'font-semibold',
                  heading.level === 2 && 'font-medium',
                  heading.level >= 3 && 'font-normal text-gray-600',
                  heading.level === 2 && 'pl-2',
                  heading.level === 3 && 'pl-4',
                  heading.level === 4 && 'pl-6',
                  heading.level >= 5 && 'pl-8',
                  'text-gray-700 border-l-2 border-transparent'
                ].filter(Boolean).join(' ');

                return (
                  <div key={heading.id} className={cn} title={heading.text}>
                    <span className="line-clamp-2">{heading.text}</span>
                  </div>
                );
              })}
            </nav>
          </div>
        )}

        {/* Markdown Content */}
        <div
          className="prose prose-sm max-w-none p-4 flex-1 overflow-y-auto bg-white"
          dangerouslySetInnerHTML={{ __html: markdownHTML }}
        />
      </div>
    </div>
  );
};
