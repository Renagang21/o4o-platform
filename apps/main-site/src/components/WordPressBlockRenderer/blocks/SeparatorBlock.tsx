import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface SeparatorBlockProps {
  block: MainSiteBlock;
}

export const SeparatorBlock: FC<SeparatorBlockProps> = ({ block }) => {
  const { data } = block;
  
  const separatorClassNames = [
    'wp-block-separator',
    data?.className,
    data?.opacity === 'css' && 'has-css-opacity',
    data?.opacity === 'alpha-channel' && 'has-alpha-channel-opacity',
  ].filter(Boolean).join(' ');
  
  return <hr className={separatorClassNames} />;
};