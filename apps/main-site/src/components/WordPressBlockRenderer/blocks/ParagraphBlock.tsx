import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { getColorClassName, getColorStyle } from '../utils/colors';
import { getFontSizeClass } from '../utils/typography';

interface ParagraphBlockProps {
  block: MainSiteBlock;
}

export const ParagraphBlock: FC<ParagraphBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.text) return null;
  
  // Build class names
  const classNames = [
    'wp-block-paragraph',
    data.alignment && `has-text-align-${data.alignment}`,
    data.dropCap && 'has-drop-cap',
    data.fontSize && getFontSizeClass(data.fontSize),
    data.textColor && getColorClassName('color', data.textColor),
    data.backgroundColor && getColorClassName('background-color', data.backgroundColor),
  ].filter(Boolean).join(' ');
  
  // Build inline styles
  const style: React.CSSProperties = {
    ...getColorStyle('color', data.customTextColor),
    ...getColorStyle('backgroundColor', data.customBackgroundColor),
  };
  
  return (
    <p 
      className={classNames}
      style={style}
      dangerouslySetInnerHTML={{ __html: data.text }}
    />
  );
};