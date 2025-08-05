import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface SpacerBlockProps {
  block: MainSiteBlock;
}

export const SpacerBlock: FC<SpacerBlockProps> = ({ block }) => {
  const { data } = block;
  
  const height = data?.height || 100;
  
  return (
    <div 
      className="wp-block-spacer"
      style={{ height: `${height}px` }}
      aria-hidden="true"
    />
  );
};