import { CSSProperties, FC } from 'react';
import TemplateRenderer from '../index';
import { TemplateBlock } from '../../../api/content/contentApi';

interface ColumnsBlockProps {
  columns?: Array<{
    width?: string;
    blocks: TemplateBlock[];
  }>;
  innerBlocks?: TemplateBlock[]; // AI-generated structure
  settings?: {
    gap?: string;
    stackOnMobile?: boolean;
  };
}

const ColumnsBlock: FC<ColumnsBlockProps> = ({
  columns = [],
  innerBlocks = [],
  settings = {}
}) => {
  const {
    gap = '2rem',
    stackOnMobile = true
  } = settings;

  // Handle both old structure (columns) and new AI-generated structure (innerBlocks)
  const columnsData = innerBlocks.length > 0
    ? innerBlocks.map(block => ({
        width: block.attributes?.width || '1fr',
        blocks: block.innerBlocks || []
      }))
    : columns;

  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: stackOnMobile
      ? `repeat(auto-fit, minmax(300px, 1fr))`
      : columnsData.map((col: any) => col.width || '1fr').join(' '),
    gap: gap,
    marginBottom: '2rem',
  };

  return (
    <div className="columns-block" style={containerStyle}>
      {columnsData.map((column, index) => (
        <div key={index} className="column">
          <TemplateRenderer blocks={column.blocks} />
        </div>
      ))}
    </div>
  );
};

export default ColumnsBlock;