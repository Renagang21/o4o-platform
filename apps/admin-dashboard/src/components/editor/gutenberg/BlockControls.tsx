/**
 * BlockControls Component
 * 구텐베르그 스타일 블록 툴바 - 블록 상단에 표시되는 컨트롤
 * WordPress Gutenberg 패턴 완전 모방
 */

import { FC, ReactNode, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface BlockControlsProps {
  children: ReactNode;
  group?: 'block' | 'inline' | 'other';
  controls?: any[];
}

export const BlockControls: FC<BlockControlsProps> = ({ 
  children, 
  group = 'block' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [selectedBlock, setSelectedBlock] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // 선택된 블록 찾기
    const findSelectedBlock = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;
      
      let element = selection.anchorNode as HTMLElement;
      if (element?.nodeType === Node.TEXT_NODE) {
        element = element.parentElement as HTMLElement;
      }
      
      // 블록 래퍼 찾기 (block-editor-block 또는 wp-block 클래스를 가진 요소)
      while (element && !element.classList?.contains('block-editor-block') && !element.classList?.contains('wp-block')) {
        element = element.parentElement as HTMLElement;
      }
      
      return element;
    };

    const updatePosition = () => {
      const block = findSelectedBlock();
      if (block) {
        const rect = block.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        setPosition({
          top: rect.top + scrollTop - 48, // 툴바 높이만큼 위로
          left: rect.left
        });
        setSelectedBlock(block);
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // 이벤트 리스너
    const handleSelectionChange = () => {
      updatePosition();
    };

    const handleScroll = () => {
      if (selectedBlock) {
        updatePosition();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updatePosition);

    // 초기 위치 설정
    updatePosition();

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updatePosition);
    };
  }, [selectedBlock]);

  if (!isVisible) return null;

  // 포털을 사용하여 body에 직접 렌더링
  return createPortal(
    <div
      ref={toolbarRef}
      className={cn(
        'block-editor-block-controls',
        'fixed z-[100] bg-white border border-gray-300 rounded-sm shadow-sm',
        'flex items-center p-0',
        group === 'inline' && 'block-editor-block-controls--inline'
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="block-editor-block-toolbar flex items-center">
        {children}
      </div>
    </div>,
    document.body
  );
};

// 툴바 그룹 컴포넌트
export const ToolbarGroup: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="flex items-center border-r border-gray-200 last:border-r-0">
      {children}
    </div>
  );
};

// 툴바 버튼 컴포넌트
export const ToolbarButton: FC<{
  icon?: ReactNode;
  label?: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({ icon, label, isActive, onClick, className }) => {
  return (
    <button
      className={cn(
        'p-2 hover:bg-gray-100 transition-colors',
        'flex items-center justify-center',
        'min-w-[36px] h-[36px]',
        isActive && 'bg-gray-200',
        className
      )}
      onClick={onClick}
      title={label}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {!icon && label && <span className="text-sm">{label}</span>}
    </button>
  );
};

// 정렬 툴바 컴포넌트
export const AlignmentToolbar: FC<{
  value?: 'left' | 'center' | 'right' | 'justify';
  onChange?: (align: 'left' | 'center' | 'right' | 'justify' | undefined) => void;
}> = ({ value, onChange }) => {
  const alignments = [
    { value: 'left', icon: '⬅', label: 'Align left' },
    { value: 'center', icon: '⬌', label: 'Align center' },
    { value: 'right', icon: '➡', label: 'Align right' },
    { value: 'justify', icon: '☰', label: 'Justify' },
  ];

  return (
    <ToolbarGroup>
      {alignments.map((alignment) => (
        <ToolbarButton
          key={alignment.value}
          icon={alignment.icon}
          label={alignment.label}
          isActive={value === alignment.value}
          onClick={() => {
            onChange?.(value === alignment.value ? undefined : alignment.value as any);
          }}
        />
      ))}
    </ToolbarGroup>
  );
};