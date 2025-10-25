/**
 * SimpleBlockWrapper Component
 *
 * Minimal block wrapper - 구텐베르크 스타일의 깔끔한 블록
 * 툴바와 외곽선 없이 입력창만 표시
 *
 * - View mode (isSelected=false): 투명 오버레이로 클릭 감지
 * - Edit mode (isSelected=true): 자동 포커스
 */

import { ReactNode, useRef, useEffect } from 'react';

interface SimpleBlockWrapperProps {
  id: string;
  children: ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
}

const SimpleBlockWrapper: React.FC<SimpleBlockWrapperProps> = ({
  id,
  children,
  isSelected,
  onSelect,
  className = '',
}) => {
  const blockRef = useRef<HTMLDivElement>(null);

  // Auto-focus when selected (Edit mode)
  useEffect(() => {
    if (isSelected && blockRef.current) {
      // Find contentEditable, input, or textarea element
      const editableElement = blockRef.current.querySelector(
        '[contenteditable="true"], input, textarea'
      ) as HTMLElement;

      if (editableElement) {
        // Delay to ensure DOM is ready
        setTimeout(() => {
          if (editableElement.isConnected && document.activeElement !== editableElement) {
            editableElement.focus();
          }
        }, 50);
      }
    }
  }, [isSelected]);

  return (
    <div
      ref={blockRef}
      data-block-id={id}
      onClick={onSelect}
      className={className}
      style={{
        outline: 'none',
        padding: '0',
        margin: '0',
        position: 'relative',
      }}
    >
      {/* View mode: Transparent overlay to ensure click detection */}
      {!isSelected && (
        <div
          onClick={onSelect}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: 'text',
            zIndex: 1,
          }}
          aria-label="Click to edit"
        />
      )}

      {children}
    </div>
  );
};

export default SimpleBlockWrapper;
