import React from 'react';
import TemplateRenderer from '../index';
import { TemplateBlock } from '../../../api/content/contentApi';

interface ColumnsBlockProps {
  columns: Array<{
    width?: string;
    blocks: TemplateBlock[];
  }>;
  settings?: {
    gap?: string;
    stackOnMobile?: boolean;
  };
}

const ColumnsBlock: React.FC<ColumnsBlockProps> = ({ 
  columns = [],
  settings = {}
}) => {
  const {
    gap = '2rem',
    stackOnMobile = true
  } = settings;

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: stackOnMobile 
      ? `repeat(auto-fit, minmax(300px, 1fr))`
      : columns.map(col => col.width || '1fr').join(' '),
    gap: gap,
    marginBottom: '2rem',
  };

  return (
    <div className="columns-block" style={containerStyle}>
      {columns.map((column, index) => (
        <div key={index} className="column">
          <TemplateRenderer blocks={column.blocks} />
        </div>
      ))}
    </div>
  );
};

export default ColumnsBlock;