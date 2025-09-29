/**
 * RichText Component
 * 구텐베르그 스타일 리치 텍스트 에디터
 * WordPress Gutenberg RichText 완전 모방 - 텍스트 역순 문제 해결
 */

import React, { FC, useRef, useState, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface RichTextProps {
  tagName?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSplit?: (value: string, isOriginal?: boolean) => void;
  onMerge?: () => void;
  onReplace?: (blocks: any[]) => void;
  onRemove?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  onFocusOut?: () => void;
  placeholder?: string;
  allowedFormats?: string[];
  identifier?: string;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean | string;
}

export const RichText: FC<RichTextProps> = ({
  tagName = 'div',
  value = '',
  onChange,
  onSplit,
  onReplace,
  onRemove,
  onKeyDown,
  onFocusOut,
  placeholder = 'Start writing or type / to choose a block',
  allowedFormats = ['core/bold', 'core/italic', 'core/link'],
  className,
  style,
  multiline = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!value || value === '');
  const isUpdatingRef = useRef(false);

  // 초기값 및 외부 value 변경 처리 - 텍스트 역순 문제 해결
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      const currentContent = editorRef.current.innerHTML;
      const normalizedCurrent = currentContent.replace(/<br\s*\/?>/gi, '').trim();
      const normalizedValue = (value || '').replace(/<br\s*\/?>/gi, '').trim();

      if (normalizedCurrent !== normalizedValue) {
        // 현재 포커스 상태 저장
        const wasActive = document.activeElement === editorRef.current;
        let cursorPosition = 0;

        if (wasActive) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            cursorPosition = range.startOffset;
          }
        }

        // 내용 업데이트
        editorRef.current.innerHTML = value || '';

        // 포커스 상태였다면 커서 위치 복원
        if (wasActive) {
          editorRef.current.focus();

          // 커서 위치 복원
          setTimeout(() => {
            try {
              const selection = window.getSelection();
              if (selection && editorRef.current) {
                const textNode = editorRef.current.firstChild;
                if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                  const range = document.createRange();
                  const maxOffset = textNode.textContent?.length || 0;
                  range.setStart(textNode, Math.min(cursorPosition, maxOffset));
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                } else {
                  // 텍스트 노드가 없으면 끝으로 이동
                  const range = document.createRange();
                  range.selectNodeContents(editorRef.current);
                  range.collapse(false);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }
            } catch (e) {
              // 커서 복원 실패 시 무시
            }
          }, 0);
        }
      }
    }

    setIsEmpty(!value || value === '' || value === '<p></p>' || value === '<br>');
  }, [value]);

  // 포맷 적용 함수
  const applyFormat = (format: string) => {
    if (!allowedFormats.includes(format)) return;

    const formatMap: { [key: string]: string } = {
      'core/bold': 'bold',
      'core/italic': 'italic',
      'core/link': 'createLink',
      'core/strikethrough': 'strikeThrough',
      'core/code': 'code',
    };

    const command = formatMap[format];
    if (command) {
      if (command === 'createLink') {
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand(command, false, url);
        }
      } else {
        document.execCommand(command, false);
      }

      if (editorRef.current) {
        isUpdatingRef.current = true;
        onChange?.(editorRef.current.innerHTML);
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // 외부 onKeyDown 핸들러가 있으면 먼저 호출
    if (onKeyDown) {
      onKeyDown(e);
      // 외부 핸들러에서 이벤트가 preventDefault되었으면 내부 처리를 하지 않음
      if (e.defaultPrevented) {
        return;
      }
    }

    // Ctrl/Cmd + B (Bold)
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      applyFormat('core/bold');
    }

    // Ctrl/Cmd + I (Italic)
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      applyFormat('core/italic');
    }

    // Ctrl/Cmd + K (Link)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      applyFormat('core/link');
    }

    // Enter 키 처리
    if (e.key === 'Enter' && !e.shiftKey) {
      if (multiline) {
        // 멀티라인 모드에서는 새 줄 추가
        if (multiline === 'p') {
          e.preventDefault();
          document.execCommand('insertParagraph', false);
          if (editorRef.current) {
            isUpdatingRef.current = true;
            onChange?.(editorRef.current.innerHTML);
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 0);
          }
        }
      } else {
        // 싱글라인 모드에서는 블록 분할
        e.preventDefault();
        if (onSplit && editorRef.current) {
          const content = editorRef.current.innerHTML;
          onSplit(content, true);
        }
      }
    }

    // Backspace 처리 (빈 블록 제거)
    if (e.key === 'Backspace' && isEmpty && onRemove) {
      e.preventDefault();
      onRemove();
    }

    // Delete 처리
    if (e.key === 'Delete' && isEmpty && onRemove) {
      e.preventDefault();
      onRemove();
    }

    // '/' 입력 감지 (블록 선택기 트리거)
    if (e.key === '/' && isEmpty && onReplace) {
      // 블록 선택기를 트리거하는 로직
      // 실제 구현에서는 블록 선택 UI를 표시
    }
  };

  // 입력 처리 - 텍스트 역순 문제 방지
  const handleInput = () => {
    if (editorRef.current && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      const newValue = editorRef.current.innerHTML;
      // 빈 콘텐츠를 정리
      const cleanValue = newValue === '<br>' || newValue === '<div><br></div>' ? '' : newValue;
      onChange?.(cleanValue);
      setIsEmpty(!cleanValue || cleanValue === '' || cleanValue === '<br>');

      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  };

  // 포커스 처리
  const handleFocus = () => {
    // Handle focus
  };

  // 블러 처리
  const handleBlur = () => {
    // Handle blur
    onFocusOut?.();
  };

  // 붙여넣기 처리
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onChange?.(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  };

  // Create the appropriate element based on tagName
  const commonProps = {
    ref: editorRef,
    contentEditable: true,
    suppressContentEditableWarning: true,
    className: cn('rich-text', 'outline-none', 'min-h-[1.8em]', isEmpty && 'empty', className),
    style,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onPaste: handlePaste,
    'data-placeholder': isEmpty ? placeholder : undefined,
    role: 'textbox',
    'aria-label': placeholder,
    'aria-multiline': !!multiline,
  };

  // For specific tags that need special handling
  if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' ||
      tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
    return React.createElement(tagName, commonProps);
  }

  // For p, div, figcaption, and other simple elements
  return <div {...commonProps} />;
};

// 플레인 텍스트 컴포넌트 (제목 등에 사용)
export const PlainText: FC<{
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value = '', onChange, placeholder, className }) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full outline-none bg-transparent',
        className
      )}
    />
  );
};