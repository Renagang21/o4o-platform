/**
 * SimpleBlockWrapper Component
 *
 * Minimal block wrapper - 구텐베르크 스타일의 깔끔한 블록
 * 툴바와 외곽선 없이 입력창만 표시
 */

import { ReactNode } from 'react';

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
  return (
    <div
      data-block-id={id}
      onClick={onSelect}
      className={className}
      style={{
        outline: 'none',
        padding: '0',
        margin: '0',
      }}
    >
      {children}
    </div>
  );
};

export default SimpleBlockWrapper;
