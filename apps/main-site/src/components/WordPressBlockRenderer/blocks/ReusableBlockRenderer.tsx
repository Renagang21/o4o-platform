import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { useReusableBlock } from '../../../hooks/useReusableBlock';
import { BlockRenderer } from '../BlockRenderer';

interface ReusableBlockRendererProps {
  block: MainSiteBlock;
}

export const ReusableBlockRenderer: FC<ReusableBlockRendererProps> = ({ block }) => {
  const { data } = block;
  const { reusableBlock, loading, error } = useReusableBlock(data?.ref);
  
  if (!data?.ref) {
    return <div className="wp-block-reusable error">Invalid reusable block reference</div>;
  }
  
  if (loading) {
    return (
      <div className="wp-block-reusable loading">
        <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
      </div>
    );
  }
  
  if (error || !reusableBlock) {
    return (
      <div className="wp-block-reusable error">
        Failed to load reusable block
      </div>
    );
  }
  
  return (
    <div className="wp-block-reusable">
      {reusableBlock.content.map((block: MainSiteBlock, index: number) => (
        <BlockRenderer key={block.id || index} block={block} />
      ))}
    </div>
  );
};