import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { BlockRenderer } from '../BlockRenderer';

interface ColumnsBlockProps {
  block: MainSiteBlock;
}

export const ColumnsBlock: FC<ColumnsBlockProps> = ({ block }) => {
  const { data, innerBlocks = [] } = block;
  
  const columnsClassNames = [
    'wp-block-columns',
    data?.verticalAlignment && `are-vertically-aligned-${data.verticalAlignment}`,
    data?.isStackedOnMobile === false && 'is-not-stacked-on-mobile',
  ].filter(Boolean).join(' ');
  
  return (
    <div className={columnsClassNames}>
      <div className="wp-block-columns-is-layout-flex">
        {innerBlocks.map((column, index) => (
          <BlockRenderer key={column.id || index} block={column} />
        ))}
      </div>
    </div>
  );
};