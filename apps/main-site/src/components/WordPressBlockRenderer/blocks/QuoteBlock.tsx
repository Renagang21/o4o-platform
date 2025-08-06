import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface QuoteBlockProps {
  block: MainSiteBlock;
}

export const QuoteBlock: FC<QuoteBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.text) return null;
  
  const classNames = [
    'wp-block-quote',
    data.align && `has-text-align-${data.align}`,
  ].filter(Boolean).join(' ');
  
  return (
    <blockquote className={classNames}>
      <p dangerouslySetInnerHTML={{ __html: data.text }} />
      {data.citation && (
        <cite dangerouslySetInnerHTML={{ __html: data.citation }} />
      )}
    </blockquote>
  );
};