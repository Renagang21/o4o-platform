import { FC, ReactNode } from 'react';

interface ColumnsProps {
  children?: ReactNode;
  columns?: number;
  gap?: string;
  className?: string;
}

const Columns: FC<ColumnsProps> = ({
  children,
  columns = 2,
  gap = '2rem',
  className = ''
}) => {
  return (
    <div 
      className={`columns-block ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap
      }}
    >
      {children}
    </div>
  );
};

export default Columns;