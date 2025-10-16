/**
 * RichText Component
 * 구텐베르그 스타일 리치 텍스트 에디터
 * WordPress Gutenberg RichText 완전 모방 - 텍스트 역순 문제 해결
 */

import React, { FC, useRef, useState, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import LinkPopover from './LinkPopover';

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
  // Expose simple formatting API to parents (no execCommand usage outside)
  exposeApi?: (api: {
    applyFormat: (format: string) => void;
    getCurrentFormats: () => Set<string>;
  }) => void;
  // Callback when active formats change (for toolbar button states)
  onFormatChange?: (formats: Set<string>) => void;
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
  exposeApi,
  onFormatChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!value || value === '');

  // Link editing state
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkPopoverPosition, setLinkPopoverPosition] = useState({ top: 0, left: 0 });
  const [currentLinkUrl, setCurrentLinkUrl] = useState('');
  const [currentLinkOpenInNewTab, setCurrentLinkOpenInNewTab] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);

  // Current active formats state
  const [currentFormats, setCurrentFormats] = useState<Set<string>>(new Set());

  // 초기값 설정만 - 입력 중에는 동기화하지 않음
  useEffect(() => {
    if (editorRef.current && !value && !editorRef.current.textContent) {
      // 초기 빈 상태에서만 설정
      const stringValue = typeof value === 'string' ? value : String(value || '');
      editorRef.current.innerHTML = stringValue;
    }

    setIsEmpty(!value || value === '' || value === '<p></p>' || value === '<br>');
  }, []); // 🔴 의존성 배열을 비움 - 마운트 시에만 실행

  // Helper function to detect active formats at current selection
  const detectActiveFormats = (): Set<string> => {
    const formats = new Set<string>();
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return formats;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // Get the element node (if text node, get parent)
    let element: HTMLElement | null = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as HTMLElement;

    // Traverse up the DOM tree until we reach the editor root
    while (element && element !== editorRef.current && editorRef.current?.contains(element)) {
      const tagName = element.tagName;

      // Check for bold
      if (tagName === 'STRONG' || tagName === 'B') {
        formats.add('bold');
      }

      // Check for italic
      if (tagName === 'EM' || tagName === 'I') {
        formats.add('italic');
      }

      // Check for link
      if (tagName === 'A') {
        formats.add('link');
      }

      // Check for strikethrough
      if (tagName === 'S' || tagName === 'STRIKE' || tagName === 'DEL') {
        formats.add('strikethrough');
      }

      // Check for code
      if (tagName === 'CODE') {
        formats.add('code');
      }

      element = element.parentElement;
    }

    return formats;
  };

  // Get current formats (for API exposure)
  const getCurrentFormats = (): Set<string> => {
    return currentFormats;
  };

  // Handle selection change to update active formats
  useEffect(() => {
    const handleSelectionChange = () => {
      // Only update if this editor is focused
      if (document.activeElement !== editorRef.current) {
        return;
      }

      const formats = detectActiveFormats();

      // Use functional update to avoid dependency on currentFormats
      setCurrentFormats(prev => {
        // Only update if formats actually changed
        const formatsChanged =
          formats.size !== prev.size ||
          ![...formats].every(f => prev.has(f));

        if (formatsChanged) {
          // Call callback with new formats
          onFormatChange?.(formats);
          return formats;
        }
        return prev;
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [onFormatChange]); // Only depend on onFormatChange (now memoized in parent)

  // 링크 편집 팝업 열기
  const openLinkPopover = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // 선택된 텍스트가 없으면 무시
    if (range.collapsed) {
      console.warn('LinkPopover: No text selected');
      return;
    }

    savedRangeRef.current = range.cloneRange();

    // 기존 링크 확인
    const ancestor = range.commonAncestorContainer;
    const linkElement = (ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor) as HTMLElement;

    if (linkElement && linkElement.tagName === 'A') {
      setCurrentLinkUrl((linkElement as HTMLAnchorElement).href);
      setCurrentLinkOpenInNewTab((linkElement as HTMLAnchorElement).target === '_blank');
    } else {
      setCurrentLinkUrl('');
      setCurrentLinkOpenInNewTab(false);
    }

    // 팝업 위치 계산 (fixed positioning)
    const rect = range.getBoundingClientRect();
    setLinkPopoverPosition({
      top: rect.bottom + 5,
      left: rect.left,
    });

    setShowLinkPopover(true);
  };

  // 링크 저장
  const handleSaveLink = (url: string, openInNewTab: boolean) => {
    if (!savedRangeRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    // 저장된 range 복원
    try {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    } catch (error) {
      console.debug('Range restoration error:', error);
      setShowLinkPopover(false);
      return;
    }

    const range = savedRangeRef.current;
    const ancestor = range.commonAncestorContainer;
    const existingLink = (ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor) as HTMLElement;

    let linkElement: HTMLAnchorElement | null = null;

    // 기존 링크 업데이트 또는 새 링크 생성
    if (existingLink && existingLink.tagName === 'A') {
      linkElement = existingLink as HTMLAnchorElement;
      linkElement.href = url;
      linkElement.target = openInNewTab ? '_blank' : '';
      if (openInNewTab) {
        linkElement.rel = 'noopener noreferrer';
      }
    } else {
      linkElement = document.createElement('a');
      linkElement.href = url;
      if (openInNewTab) {
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
      }

      const contents = range.extractContents();
      linkElement.appendChild(contents);
      range.insertNode(linkElement);
    }

    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);

      // Focus restoration: restore focus only if we lost it
      // EnhancedBlockWrapper already handles focus, so only restore if needed
        // Only restore focus if editor is not already focused
        if (editorRef.current && linkElement && document.activeElement !== editorRef.current) {
          editorRef.current.focus();

          // Position cursor at the end of the link
          const selection = window.getSelection();
          if (selection) {
            try {
              const range = document.createRange();
              range.setStartAfter(linkElement);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            } catch (error) {
              console.debug('Cursor positioning error:', error);
            }
          }
        }

    }

    savedRangeRef.current = null;
  };

  // 링크 제거
  const handleRemoveLink = () => {
    if (!savedRangeRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    try {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    } catch (error) {
      console.debug('Range restoration error in removeLink:', error);
      setShowLinkPopover(false);
      return;
    }

    const range = savedRangeRef.current;
    const ancestor = range.commonAncestorContainer;
    const linkElement = (ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor) as HTMLElement;

    if (linkElement && linkElement.tagName === 'A') {
      const textContent = linkElement.textContent || '';
      const textNode = document.createTextNode(textContent);
      linkElement.replaceWith(textNode);

      if (editorRef.current) {
        onChange?.(editorRef.current.innerHTML);

        // Focus restoration: restore focus only if we lost it
          // Only restore focus if editor is not already focused
          if (editorRef.current && document.activeElement !== editorRef.current) {
            editorRef.current.focus();

            // Position cursor at the end of the replaced text
            const selection = window.getSelection();
            if (selection && textNode) {
              try {
                const range = document.createRange();
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
              } catch (error) {
                console.debug('Cursor positioning error after link removal:', error);
              }
            }
          }

      }
    }

    savedRangeRef.current = null;
  };

  // 포맷 적용 함수 - Selection API 사용 (execCommand 제거)
  const applyFormat = (format: string) => {
    if (!allowedFormats.includes(format)) return;

    // 링크는 팝업으로 처리
    if (format === 'core/link') {
      openLinkPopover();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // 선택된 텍스트가 없으면 무시
    if (range.collapsed) return;

    try {
      let element: HTMLElement | null = null;

      switch (format) {
        case 'core/bold':
          element = document.createElement('strong');
          break;
        case 'core/italic':
          element = document.createElement('em');
          break;
        case 'core/strikethrough':
          element = document.createElement('s');
          break;
        case 'o4o/code':
          element = document.createElement('code');
          break;
        default:
          return;
      }

      if (element) {
        // 기존 포맷이 있는지 확인
        const ancestor = range.commonAncestorContainer;
        const parent = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor as HTMLElement;

        // 이미 같은 태그로 감싸져 있으면 제거 (토글 기능)
        if (parent && parent.tagName === element.tagName) {
          const textContent = parent.textContent || '';
          const textNode = document.createTextNode(textContent);
          parent.replaceWith(textNode);
        } else {
          // 선택 영역을 새 요소로 감싸기
          const contents = range.extractContents();
          element.appendChild(contents);
          range.insertNode(element);

          // 선택 영역 복원
          try {
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(element);
            selection.addRange(newRange);
          } catch (error) {
            console.debug('Range restoration error after format:', error);
          }
        }

        if (editorRef.current) {
          onChange?.(editorRef.current.innerHTML);
        }
      }
    } catch (error) {
      console.error('Format application error:', error);
    }
  };

  // Expose API to parent once mounted
  useEffect(() => {
    exposeApi?.({ applyFormat, getCurrentFormats });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exposeApi]);

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

          // Selection API 사용하여 줄바꿈 삽입
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const br = document.createElement('br');
            range.deleteContents();
            range.insertNode(br);

            // 커서를 br 다음으로 이동
            try {
              range.setStartAfter(br);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            } catch (error) {
              // Silently handle range errors - browser will place cursor automatically
              console.debug('Range positioning error (non-critical):', error);
            }
          }

          if (editorRef.current) {
            onChange?.(editorRef.current.innerHTML);
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

  // 입력 처리 - 단순화
  const handleInput = () => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      // 빈 콘텐츠를 정리
      const cleanValue = newValue === '<br>' || newValue === '<div><br></div>' ? '' : newValue;
      onChange?.(cleanValue);
      setIsEmpty(!cleanValue || cleanValue === '' || cleanValue === '<br>');
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

  // 붙여넣기 처리 - Selection API 사용
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // Selection API로 텍스트 삽입
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const textNode = document.createTextNode(text);
      range.insertNode(textNode);

      // 커서를 삽입한 텍스트 끝으로 이동
      try {
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (error) {
        console.debug('Cursor positioning error after paste:', error);
      }
    }

    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
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
  const EditorElement = () => {
    // Always use the specified tagName
    return React.createElement(tagName || 'div', commonProps);
  };

  return (
    <>
      <EditorElement />

      {/* Link Popover */}
      {showLinkPopover && (
        <LinkPopover
          initialUrl={currentLinkUrl}
          initialOpenInNewTab={currentLinkOpenInNewTab}
          onSave={handleSaveLink}
          onRemove={currentLinkUrl ? handleRemoveLink : undefined}
          onClose={() => setShowLinkPopover(false)}
          position={linkPopoverPosition}
        />
      )}
    </>
  );
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
