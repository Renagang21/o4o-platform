/**
 * MarkdownBlock Component
 *
 * Enhanced markdown block with editing capabilities
 * - Loads markdown files from media library
 * - Preview: Renders HTML using marked library with automatic TOC
 * - Edit: Monaco editor with markdown syntax highlighting
 * - Save: Updates file content via API
 * - TOC Generation: Auto-generates table of contents
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import Editor from '@monaco-editor/react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import { FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileSelector, { FileItem } from './shared/FileSelector';
import toast from 'react-hot-toast';
import { ContentApi } from '@/api/contentApi';

// Tab type
type Tab = 'preview' | 'edit';

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
    mediaId?: string;
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
  const { markdown: initialMarkdown, filename: initialFilename, mediaId: initialMediaId } = attributes;
  const [localMarkdown, setLocalMarkdown] = useState(initialMarkdown || content || '');
  const [filename, setFilename] = useState(initialFilename || '');
  const [mediaId, setMediaId] = useState(initialMediaId || '');
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [isSaving, setIsSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Configure marked options with heading IDs
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
      mangle: false,
    });
  }, []);

  // Extract headings from markdown (reusable function)
  const extractHeadings = useCallback((markdown: string): Heading[] => {
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
  }, []);

  // Extract headings from rendered HTML (to match marked's actual IDs)
  const headings = useMemo((): Heading[] => {
    return extractHeadings(localMarkdown);
  }, [localMarkdown, extractHeadings]);

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

  // Sync filename and mediaId
  useEffect(() => {
    if (initialFilename !== undefined) {
      setFilename(initialFilename);
    }
  }, [initialFilename]);

  useEffect(() => {
    if (initialMediaId !== undefined) {
      setMediaId(initialMediaId);
    }
  }, [initialMediaId]);

  // Scroll to heading (with CSS.escape for special characters)
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
  }, [showTOC, localMarkdown]);

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
      setMediaId(selectedFile.id);

      // Save to attributes including mediaId
      onChange(text, { markdown: text, filename: selectedFile.title, mediaId: selectedFile.id });

      toast.success(`${selectedFile.title} 파일을 불러왔습니다.`);
      setShowFileSelector(false);
    } catch (error) {
      console.error('Failed to load markdown file:', error);
      toast.error('파일을 불러오는데 실패했습니다.');
    }
  };

  // Save file content
  const handleSave = async () => {
    if (!mediaId || !filename) {
      toast.error('저장할 파일 정보가 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      await ContentApi.updateMediaFileContent(mediaId, localMarkdown, filename);

      // Update attributes
      onChange(localMarkdown, { markdown: localMarkdown, filename, mediaId });

      toast.success('파일이 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save markdown file:', error);
      toast.error('파일 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate TOC
  const generateTOC = () => {
    const headings = extractHeadings(localMarkdown);
    if (headings.length === 0) {
      toast.error('헤딩이 없어서 목차를 생성할 수 없습니다');
      return;
    }

    const toc = `## 목차\n\n${headings.map(h =>
      `${'  '.repeat(h.level - 1)}- [${h.text}](#${h.id})`
    ).join('\n')}\n\n---\n\n`;

    setLocalMarkdown(toc + localMarkdown);
    toast.success('목차가 생성되었습니다');
  };

  // Handle Enter key - end block and add new paragraph
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddBlock?.('after', 'o4o/paragraph');
    }
  }, [onAddBlock]);

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
            {/* File Load Button */}
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

            {/* Tab Buttons */}
            {localMarkdown && (
              <>
                <div className="h-5 w-px bg-gray-300" />
                <div className="flex gap-1">
                  <Button
                    variant={activeTab === 'preview' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setActiveTab('preview')}
                  >
                    미리보기
                  </Button>
                  <Button
                    variant={activeTab === 'edit' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setActiveTab('edit')}
                  >
                    편집
                  </Button>
                </div>
              </>
            )}

            {/* Edit Tab Actions */}
            {activeTab === 'edit' && localMarkdown && (
              <>
                <div className="h-5 w-px bg-gray-300" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={generateTOC}
                  title="목차 생성"
                >
                  목차 생성
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={handleSave}
                  disabled={isSaving || !mediaId}
                  title="저장"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </>
            )}
          </div>
        ) : null
      }
    >
      <div
        className="relative bg-white border border-gray-200 rounded-lg overflow-hidden outline-none focus:ring-2 focus:ring-blue-500"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Filename Header */}
        {filename && (
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span className="font-medium">{filename}</span>
              {activeTab === 'preview' && (
                <span className="text-xs text-gray-400">(읽기 전용)</span>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        {localMarkdown ? (
          <>
            {/* Preview Tab */}
            {activeTab === 'preview' && (
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
            )}

            {/* Edit Tab */}
            {activeTab === 'edit' && (
              <div className="w-full">
                <Editor
                  height="500px"
                  defaultLanguage="markdown"
                  value={localMarkdown}
                  onChange={(value) => setLocalMarkdown(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                  theme="vs-light"
                />
              </div>
            )}
          </>
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
        <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg overflow-auto">
          <div className="flex pointer-events-none">
            {/* Table of Contents Sidebar (read-only) - clickable */}
            {showTOC && (
              <div className="w-56 flex-shrink-0 border-r border-gray-200 p-4 overflow-y-auto max-h-[600px] pointer-events-auto">
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
                        'hover:bg-gray-100 text-gray-700 border-l-2 border-transparent'
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
