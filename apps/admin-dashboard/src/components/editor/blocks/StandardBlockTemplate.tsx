/**
 * Standard Block Template
 * 모든 블록의 기본 구조와 공통 기능을 제공하는 템플릿
 */

import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';

export interface StandardBlockProps {
  id: string;
  content: any;
  onChange: (content: any, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: Record<string, any>;
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

export interface StandardBlockConfig {
  type: string;
  icon: LucideIcon;
  category: 'text' | 'media' | 'design' | 'layout' | 'embed' | 'commerce' | 'advanced';
  title: string;
  description: string;
  keywords: string[];
  supports: {
    align?: boolean;
    color?: boolean;
    spacing?: boolean;
    border?: boolean;
    customClassName?: boolean;
  };
}

interface StandardBlockTemplateProps extends StandardBlockProps {
  config: StandardBlockConfig;
  children: ReactNode;
  customToolbar?: ReactNode;
  customSidebar?: ReactNode;
  className?: string;
}

export const StandardBlockTemplate: React.FC<StandardBlockTemplateProps> = ({
  id,
  config,
  children,
  customToolbar,
  customSidebar,
  className,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  onCopy,
  onPaste,
  isDragging,
  canMoveUp,
  canMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onChangeType,
  attributes = {}
}) => {
  const {
    align = 'left',
    textColor,
    backgroundColor,
    padding,
    margin,
    borderRadius,
    borderWidth,
    borderColor,
    customClassName
  } = attributes;

  // Handle alignment change
  const handleAlignChange = () => {
    // This will be handled by parent component
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type={config.type}
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      onCopy={onCopy}
      onPaste={onPaste}
      isDragging={isDragging}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      customToolbarContent={customToolbar}
      customSidebarContent={customSidebar}
      onAlignChange={config.supports.align ? handleAlignChange : undefined}
      currentAlign={config.supports.align ? align : undefined}
      onChangeType={onChangeType}
      currentType={config.type}
      className={className}
    >
      <div
        className={`standard-block standard-block--${config.type} ${customClassName || ''}`}
        style={{
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
          padding: padding ? `${padding}px` : undefined,
          margin: margin ? `${margin}px` : undefined,
          borderRadius: borderRadius ? `${borderRadius}px` : undefined,
          borderWidth: borderWidth ? `${borderWidth}px` : undefined,
          borderColor: borderColor || undefined,
          borderStyle: borderWidth ? 'solid' : undefined,
          textAlign: align === 'justify' ? 'justify' : align
        }}
      >
        {children}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default StandardBlockTemplate;