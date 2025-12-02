import { FC, ReactNode } from 'react';

interface ColumnProps {
  children?: ReactNode;
  width?: string;
  className?: string;
}

const Column: FC<ColumnProps> = ({
  children,
  width,
  className = ''
}) => {
  return (
    <div 
      className={`column-block ${className}`}
      style={{
        width,
        flex: width ? undefined : 1
      }}
    >
      {children}
    </div>
  );
};

export default Column;