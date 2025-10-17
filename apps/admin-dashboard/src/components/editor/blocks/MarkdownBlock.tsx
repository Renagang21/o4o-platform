/**
 * MarkdownBlock Component
 *
 * Gutenberg-style Markdown block with Edit/Preview tabs
 * - Edit mode: Markdown source editor (textarea)
 * - Preview mode: Rendered HTML using marked library
 * - Toolbar: Edit/Preview toggle, markdown helpers
 * - Follows Gutenberg UI patterns
 */

import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import { Eye, Code2, Bold, Italic, Link2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileSelector, { FileItem } from './shared/FileSelector';
import toast from 'react-hot-toast';

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
  const { markdown: initialMarkdown } = attributes;
  const [localMarkdown, setLocalMarkdown] = useState(initialMarkdown || content || '');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [showFileSelector, setShowFileSelector] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Configure marked options
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

  // Sync with external content changes
  useEffect(() => {
    if (initialMarkdown !== undefined) {
      setLocalMarkdown(initialMarkdown);
    } else if (content !== localMarkdown) {
      setLocalMarkdown(content);
    }
  }, [content, initialMarkdown]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px';
    }
  }, [localMarkdown]);

  // Handle markdown change
  const handleMarkdownChange = (newMarkdown: string) => {
    setLocalMarkdown(newMarkdown);
    onChange(newMarkdown, { ...attributes, markdown: newMarkdown });
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key: Insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '  '; // 2 spaces

      const newValue = localMarkdown.substring(0, start) + spaces + localMarkdown.substring(end);
      handleMarkdownChange(newValue);

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      }, 0);
    }

    // Enter key: Maintain indentation
    if (e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const lines = localMarkdown.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1];

      // Calculate indentation
      const indent = currentLine.match(/^(\s*)/)?.[1] || '';

      // Check for list continuation
      const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/);
      if (listMatch) {
        const listIndent = listMatch[1];
        const listMarker = listMatch[2];
        const continuation = listMarker.match(/^\d+$/)
          ? `${parseInt(listMarker) + 1}.`
          : listMarker;
        const newValue = localMarkdown.substring(0, start) + '\n' + listIndent + continuation + ' ' + localMarkdown.substring(start);
        handleMarkdownChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + listIndent.length + continuation.length + 1;
        }, 0);
        return;
      }

      const newValue = localMarkdown.substring(0, start) + '\n' + indent + localMarkdown.substring(start);
      handleMarkdownChange(newValue);

      // Set cursor position after the indentation
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
      }, 0);
    }

    // Backspace on empty markdown block
    if (e.key === 'Backspace' && localMarkdown.trim() === '') {
      e.preventDefault();
      onDelete();
    }

    // Escape key: Exit edit mode to preview mode
    if (e.key === 'Escape') {
      e.preventDefault();
      setMode('preview');
      // Blur the textarea
      const textarea = e.target as HTMLTextAreaElement;
      textarea.blur();
    }
  };

  // Insert markdown syntax
  const insertMarkdownSyntax = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = localMarkdown.substring(start, end);

    const newValue =
      localMarkdown.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      localMarkdown.substring(end);

    handleMarkdownChange(newValue);

    // Set cursor position
    setTimeout(() => {
      if (selectedText) {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = end + prefix.length;
      } else {
        textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
      }
      textarea.focus();
    }, 0);
  };

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
      handleMarkdownChange(text);
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
            {/* Edit/Preview Toggle */}
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <Button
                variant={mode === 'edit' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setMode('edit')}
              >
                <Code2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant={mode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setMode('preview')}
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
            </div>

            {/* Markdown Helper Buttons (only in edit mode) */}
            {mode === 'edit' && (
              <>
                <div className="h-5 w-px bg-gray-300" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setShowFileSelector(true)}
                  title="파일에서 불러오기"
                >
                  <FileText className="h-3 w-3" />
                </Button>
                <div className="h-5 w-px bg-gray-300" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => insertMarkdownSyntax('**', '**')}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => insertMarkdownSyntax('*', '*')}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => insertMarkdownSyntax('[', '](url)')}
                  title="Link (Ctrl+K)"
                >
                  <Link2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        ) : null
      }
    >
      <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Edit Mode */}
        {mode === 'edit' && (
          <textarea
            ref={textareaRef}
            value={localMarkdown}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full p-4 bg-transparent border-0 outline-none resize-none',
              'font-mono text-sm text-gray-800 leading-relaxed',
              'placeholder:text-gray-400',
              'scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300'
            )}
            placeholder="Enter markdown here...

## Example Heading
- List item 1
- List item 2

**Bold text** and *italic text*
[Link text](https://example.com)"
            spellCheck={false}
            style={{
              minHeight: '200px',
              tabSize: 2,
              whiteSpace: 'pre-wrap'
            }}
          />
        )}

        {/* Preview Mode */}
        {mode === 'preview' && (
          <div
            className="prose prose-sm max-w-none p-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
          />
        )}
      </div>

      {/* Read-only preview when not selected */}
      {!isSelected && localMarkdown && (
        <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg overflow-auto pointer-events-none">
          <div
            className="prose prose-sm max-w-none p-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
          />
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
