import React from 'react';

interface EnhancedBlockWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const EnhancedBlockWrapper: React.FC<EnhancedBlockWrapperProps> = ({
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