/**
 * MarkdownBlock Component
 *
 * Read-only markdown preview block with automatic TOC
 * - Loads markdown files from media library
 * - Renders HTML using marked library
 * - Auto-generates table of contents for 3+ headings
 * - Displays filename with read-only indicator
 * - No editing to maintain file sync integrity
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileSelector, { FileItem } from './shared/FileSelector';
import toast from 'react-hot-toast';

// Heading structure for TOC
interface Heading {
  id: string;
  level: number;
  text: string;
}

interface MarkdownBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    markdown?: string;
    filename?: string;
  };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
}

const MarkdownBlock: React.FC<MarkdownBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType,
}) => {
  const { markdown: initialMarkdown, filename: initialFilename } = attributes;
  const [localMarkdown, setLocalMarkdown] = useState(initialMarkdown || content || '');
  const [filename, setFilename] = useState(initialFilename || '');
  const [showFileSelector, setShowFileSelector] = useState(false);
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

    while ((match = headingRegex.exec(localMarkdown)) !== null) {
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
  }, [localMarkdown]);

  // Show TOC if 1 or more headings
  const showTOC = headings.length >= 1;

  // Sync with external content changes
  useEffect(() => {
    if (initialMarkdown !== undefined) {
      setLocalMarkdown(initialMarkdown);
    } else if (content !== localMarkdown) {
      setLocalMarkdown(content);
    }
  }, [content, initialMarkdown]);

  // Sync filename
  useEffect(() => {
    if (initialFilename !== undefined) {
      setFilename(initialFilename);
    }
  }, [initialFilename]);

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
  }, [showTOC, localMarkdown]);

  // Render markdown as HTML
  const renderMarkdown = () => {
    try {
      return marked.parse(localMarkdown);
    } catch (error) {
      return '<p>Error rendering markdown</p>';
    }
  };

  // Handle file selection and load content
  const handleFileSelect = async (file: FileItem | FileItem[]) => {
    const selectedFile = Array.isArray(file) ? file[0] : file;

    if (!selectedFile) return;

    try {
      // Fetch the file content from URL
      const response = await fetch(selectedFile.url);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const text = await response.text();
      setLocalMarkdown(text);
      setFilename(selectedFile.title);

      // Save to attributes
      onChange(text, { markdown: text, filename: selectedFile.title });

      toast.success(`${selectedFile.title} 파일을 불러왔습니다.`);
      setShowFileSelector(false);
    } catch (error) {
      console.error('Failed to load markdown file:', error);
      toast.error('파일을 불러오는데 실패했습니다.');
    }
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="markdown"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      isDragging={isDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopy={onCopy}
      onPaste={onPaste}
      onChangeType={onChangeType}
      currentType="o4o/markdown"
      customToolbarContent={
        isSelected ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setShowFileSelector(true)}
              title="마크다운 파일 불러오기"
            >
              <FileText className="h-3 w-3 mr-1" />
              파일 불러오기
            </Button>
          </div>
        ) : null
      }
    >
      <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Filename Header */}
        {filename && (
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span className="font-medium">{filename}</span>
              <span className="text-xs text-gray-400">(읽기 전용)</span>
            </div>
          </div>
        )}

        {/* Preview Content */}
        {localMarkdown ? (
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
                      className={cn(
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
        ) : (
          <div className="flex items-center justify-center p-12 text-gray-400">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">마크다운 파일을 불러와주세요</p>
              <p className="text-xs mt-1">상단의 "파일 불러오기" 버튼을 클릭하세요</p>
            </div>
          </div>
        )}
      </div>

      {/* Read-only preview when not selected */}
      {!isSelected && localMarkdown && (
        <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg overflow-auto pointer-events-none">
          <div className="flex">
            {/* Table of Contents Sidebar (read-only) */}
            {showTOC && (
              <div className="w-56 flex-shrink-0 border-r border-gray-200 p-4 overflow-y-auto max-h-[600px]">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                  목차
                </h3>
                <nav className="space-y-1">
                  {headings.map((heading) => (
                    <div
                      key={heading.id}
                      className={cn(
                        'block w-full text-left text-xs py-1.5 px-2 rounded',
                        heading.level === 1 && 'font-semibold',
                        heading.level === 2 && 'font-medium',
                        heading.level >= 3 && 'font-normal text-gray-600',
                        heading.level === 2 && 'pl-2',
                        heading.level === 3 && 'pl-4',
                        heading.level === 4 && 'pl-6',
                        heading.level >= 5 && 'pl-8',
                        'text-gray-700 border-l-2 border-transparent'
                      )}
                      title={heading.text}
                    >
                      <span className="line-clamp-2">{heading.text}</span>
                    </div>
                  ))}
                </nav>
              </div>
            )}

            {/* Markdown Content */}
            <div
              className="prose prose-sm max-w-none p-4 flex-1"
              dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
            />
          </div>
        </div>
      )}

      {/* File Selector Modal */}
      <FileSelector
        isOpen={showFileSelector}
        onClose={() => setShowFileSelector(false)}
        onSelect={handleFileSelect}
        multiple={false}
        acceptedTypes={['document']}
        acceptedMimeTypes={['text/markdown', 'text/plain']}
        acceptedExtensions={['.md', '.markdown', '.txt']}
        title="마크다운 파일 선택"
      />
    </EnhancedBlockWrapper>
  );
};

export default MarkdownBlock;
