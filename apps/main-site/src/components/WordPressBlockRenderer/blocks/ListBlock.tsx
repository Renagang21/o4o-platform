import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface ListBlockProps {
  block: MainSiteBlock;
}

export const ListBlock: FC<ListBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.items || data.items.length === 0) return null;
  
  const Tag = data.ordered ? 'ol' : 'ul';
  
  const attributes: any = {
    className: 'wp-block-list',
  };
  
  if (data.ordered && data.reversed) {
    attributes.reversed = true;
  }
  
  if (data.ordered && data.start && data.start !== 1) {
    attributes.start = data.start;
  }
  
  return (
    <Tag {...attributes}>
      {data.items.map((item: string, index: number) => (
        <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </Tag>
  );
};