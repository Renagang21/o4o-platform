import { CSSProperties, FC } from 'react';
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

const ColumnsBlock: FC<ColumnsBlockProps> = ({ 
  columns = [],
  settings = {}
}) => {
  const {
    gap = '2rem',
    stackOnMobile = true
  } = settings;

  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: stackOnMobile 
      ? `repeat(auto-fit, minmax(300px, 1fr))`
      : columns.map((col: any) => col.width || '1fr').join(' '),
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