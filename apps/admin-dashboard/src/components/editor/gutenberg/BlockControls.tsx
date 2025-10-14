/**
 * BlockControls Component - Simplified & Clean
 * 블록 상단에 표시되는 툴바 - 단순하고 명확한 구조
 */

import { FC, ReactNode, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface BlockControlsProps {
  children: ReactNode;
}

/**
 * BlockControls - Main toolbar component
 * Renders toolbar above selected block using Portal
 */
export const BlockControls: FC<BlockControlsProps> = ({ children }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      // Find selected block
      const selectedBlock = document.querySelector('.is-selected');

      if (selectedBlock) {
        const rect = selectedBlock.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        setPosition({
          top: rect.top + scrollTop - 40, // 40px above block (toolbar height + gap)
          left: rect.left + scrollLeft,
          width: rect.width
        });
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Update on selection change, scroll, resize
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    // Initial position
    updatePosition();

    // Event listeners
    document.addEventListener('selectionchange', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      document.removeEventListener('selectionchange', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, []);

  if (!isVisible) return null;

  return createPortal(
    <div
      ref={toolbarRef}
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
 * ToolbarGroup - Groups related toolbar buttons
 */
export const ToolbarGroup: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="flex items-center border-r border-gray-200 last:border-r-0">
      {children}
    </div>
  );
};

/**
 * ToolbarButton - Individual toolbar button
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
 * AlignmentToolbar - Text alignment controls
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
