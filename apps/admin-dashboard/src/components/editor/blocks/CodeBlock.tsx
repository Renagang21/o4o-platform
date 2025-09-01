/**
 * CodeBlock Component
 * Code block with syntax highlighting and language selection
 */

import React, { useState, useRef, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CodeBlockProps {
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
    language?: string;
    code?: string;
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

const LANGUAGES = [
  { value: 'text', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'php', label: 'PHP' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
];

const CodeBlock: React.FC<CodeBlockProps> = ({
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
  const { language = 'text', code: initialCode } = attributes;
  const [localCode, setLocalCode] = useState(initialCode || content || '');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with external content changes
  useEffect(() => {
    if (initialCode !== undefined) {
      setLocalCode(initialCode);
    } else if (content !== localCode) {
      setLocalCode(content);
    }
  }, [content, initialCode]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px';
    }
  }, [localCode]);

  // Handle code change
  const handleCodeChange = (newCode: string) => {
    setLocalCode(newCode);
    onChange(newCode, { ...attributes, language, code: newCode });
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: string) => {
    onChange(localCode, { ...attributes, language: newLanguage, code: localCode });
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Error log removed
    }
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

      const newValue = localCode.substring(0, start) + spaces + localCode.substring(end);
      handleCodeChange(newValue);

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
      const lines = localCode.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Calculate indentation
      const indent = currentLine.match(/^(\s*)/)?.[1] || '';
      const newValue = localCode.substring(0, start) + '\n' + indent + localCode.substring(start);
      
      handleCodeChange(newValue);
      
      // Set cursor position after the indentation
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
      }, 0);
    }

    // Backspace on empty code block
    if (e.key === 'Backspace' && localCode.trim() === '') {
      e.preventDefault();
      onDelete();
    }
  };

  // Handle paste - allow normal paste behavior

  // Get syntax highlighting classes (basic)
  const getSyntaxClasses = () => {
    const baseClasses = 'font-mono text-sm leading-relaxed';
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        return cn(baseClasses, 'text-blue-800');
      case 'html':
      case 'xml':
        return cn(baseClasses, 'text-orange-800');
      case 'css':
        return cn(baseClasses, 'text-purple-800');
      case 'python':
        return cn(baseClasses, 'text-green-800');
      case 'json':
        return cn(baseClasses, 'text-yellow-800');
      default:
        return cn(baseClasses, 'text-gray-800');
    }
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="code"
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
      currentType="core/code"
      customToolbarContent={
        isSelected ? (
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-32 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="relative bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        {/* Language indicator */}
        {!isSelected && language !== 'text' && (
          <div className="absolute top-2 right-3 text-xs text-gray-500 uppercase">
            {LANGUAGES.find(l => l.value === language)?.label || language}
          </div>
        )}

        {/* Code textarea */}
        <textarea
          ref={textareaRef}
          value={localCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full p-4 bg-transparent border-0 outline-none resize-none',
            getSyntaxClasses(),
            'placeholder:text-gray-400',
            'scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300'
          )}
          placeholder="Enter code here..."
          spellCheck={false}
          style={{ 
            minHeight: '120px',
            tabSize: 2,
            whiteSpace: 'pre'
          }}
        />
      </div>

      {/* Code preview (for when not selected) */}
      {!isSelected && localCode && (
        <div className="absolute inset-0 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto pointer-events-none">
          <pre className={cn(getSyntaxClasses(), 'whitespace-pre-wrap')}>
            {localCode}
          </pre>
        </div>
      )}
    </EnhancedBlockWrapper>
  );
};

export default CodeBlock;