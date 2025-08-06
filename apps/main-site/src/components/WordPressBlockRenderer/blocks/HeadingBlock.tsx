import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { getColorClassName, getColorStyle } from '../utils/colors';

interface HeadingBlockProps {
  block: MainSiteBlock;
}

export const HeadingBlock: FC<HeadingBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.text) return null;
  
  const Tag = `h${data.level || 2}` as keyof JSX.IntrinsicElements;
  
  // Build class names
  const classNames = [
    'wp-block-heading',
    data.alignment && `has-text-align-${data.alignment}`,
    data.textColor && getColorClassName('color', data.textColor),
  ].filter(Boolean).join(' ');
  
  // Build inline styles
  const style: React.CSSProperties = {
    ...getColorStyle('color', data.customTextColor),
  };
  
  return (
    <Tag 
      className={classNames}
      style={style}
      dangerouslySetInnerHTML={{ __html: data.text }}
    />
  );
};