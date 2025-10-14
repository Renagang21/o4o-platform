/**
 * BlockControls - Gutenberg-style Block Toolbar
 *
 * 블록 상단에 표시되는 포맷팅 툴바 (WordPress Gutenberg 스타일)
 * - Portal을 사용하여 body에 렌더링
 * - 선택된 블록(.is-selected) 위쪽에 고정 위치로 표시
 * - 자동으로 위치 업데이트 (스크롤, 리사이즈, 블록 선택 변경 시)
 */

import { FC, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface BlockControlsProps {
  children: ReactNode;
}

/**
 * BlockControls - 메인 툴바 컴포넌트
 *
 * 선택된 블록 위에 포맷팅 툴바를 표시합니다.
 * Portal을 사용하여 DOM 계층 구조와 독립적으로 렌더링됩니다.
 */
export const BlockControls: FC<BlockControlsProps> = ({ children }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const selectedBlock = document.querySelector('.is-selected');

      if (selectedBlock) {
        const rect = selectedBlock.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        setPosition({
          top: rect.top + scrollTop - 45, // 블록 위쪽 45px (툴바 높이 + 간격)
          left: rect.left + scrollLeft,
          width: rect.width
        });
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    // 초기 위치 계산
    updatePosition();

    // 이벤트 리스너 등록
    document.addEventListener('selectionchange', handleUpdate);
    document.addEventListener('click', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    // DOM 변경 감지 (블록 선택 시 class 변경)
    const observer = new MutationObserver(handleUpdate);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });

    return () => {
      document.removeEventListener('selectionchange', handleUpdate);
      document.removeEventListener('click', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      observer.disconnect();
    };
  }, []);

  if (!isVisible) return null;

  return createPortal(
    <div
      className="fixed z-[100] bg-white border border-gray-300 rounded shadow-sm"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="flex items-center">
        {children}
      </div>
    </div>,
    document.body
  );
};

/**
 * ToolbarGroup - 관련 버튼들을 그룹화
 *
 * 세로 구분선으로 그룹을 구분합니다.
 */
export const ToolbarGroup: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="flex items-center border-r border-gray-200 last:border-r-0">
      {children}
    </div>
  );
};

/**
 * ToolbarButton - 개별 툴바 버튼
 *
 * @param icon - 아이콘 컴포넌트 (React Node)
 * @param label - 툴팁 텍스트
 * @param isActive - 활성 상태 (예: Bold가 적용된 경우)
 * @param onClick - 클릭 핸들러
 * @param className - 추가 CSS 클래스
 */
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
        'p-1.5 hover:bg-gray-100 transition-colors',
        'flex items-center justify-center',
        'min-w-[32px] h-[32px]',
        isActive && 'bg-gray-200',
        className
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {!icon && label && <span className="text-xs">{label}</span>}
    </button>
  );
};

/**
 * AlignmentToolbar - 텍스트 정렬 컨트롤
 *
 * 왼쪽, 가운데, 오른쪽, 양쪽 정렬 버튼을 제공합니다.
 */
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
