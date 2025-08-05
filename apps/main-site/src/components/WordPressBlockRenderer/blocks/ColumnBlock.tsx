import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { BlockRenderer } from '../BlockRenderer';

interface ColumnBlockProps {
  block: MainSiteBlock;
}

export const ColumnBlock: FC<ColumnBlockProps> = ({ block }) => {
  const { data, innerBlocks = [] } = block;
  
  const columnClassNames = [
    'wp-block-column',
    data?.verticalAlignment && `is-vertically-aligned-${data.verticalAlignment}`,
  ].filter(Boolean).join(' ');
  
  const style: React.CSSProperties = {};
  
  if (data?.width) {
    style.flexBasis = data.width;
  }
  
  return (
    <div className={columnClassNames} style={style}>
      {innerBlocks.map((innerBlock, index) => (
        <BlockRenderer key={innerBlock.id || index} block={innerBlock} />
      ))}
    </div>
  );
};