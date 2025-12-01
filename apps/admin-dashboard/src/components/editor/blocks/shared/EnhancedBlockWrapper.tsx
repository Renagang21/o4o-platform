import React from 'react';

interface EnhancedBlockWrapperProps {
  id?: string;
  type?: string;
  title?: string;
  label?: string;
  icon?: React.ComponentType;
  isSelected?: boolean;
  customToolbar?: React.ReactNode;
  customSidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const EnhancedBlockWrapper: React.FC<EnhancedBlockWrapperProps> = ({
  id,
  type,
  title,
  icon,
  isSelected,
  customToolbar,
  customSidebar,
  children,
  className = ''
}) => {
  return (
    <div className={`enhanced-block-wrapper ${className}`}>
      {children}
    </div>
  );
};

export default EnhancedBlockWrapper;