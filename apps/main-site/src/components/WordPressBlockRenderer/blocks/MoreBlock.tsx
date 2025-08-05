import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface MoreBlockProps {
  block: MainSiteBlock;
}

export const MoreBlock: FC<MoreBlockProps> = ({ block }) => {
  const { data } = block;
  
  const moreText = data?.customText || 'Read more';
  
  return (
    <div className="wp-block-more">
      <span className="wp-block-more__text">{moreText}</span>
    </div>
  );
};