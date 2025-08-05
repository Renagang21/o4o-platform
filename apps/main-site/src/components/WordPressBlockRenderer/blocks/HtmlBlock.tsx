import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface HtmlBlockProps {
  block: MainSiteBlock;
}

export const HtmlBlock: FC<HtmlBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.content) return null;
  
  return (
    <div 
      className="wp-block-html"
      dangerouslySetInnerHTML={{ __html: data.content }}
    />
  );
};