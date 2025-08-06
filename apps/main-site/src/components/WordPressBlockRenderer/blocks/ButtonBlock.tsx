import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { getColorClassName, getColorStyle, getGradientClassName } from '../utils/colors';

interface ButtonBlockProps {
  block: MainSiteBlock;
}

export const ButtonBlock: FC<ButtonBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.text) return null;
  
  const buttonClassNames = [
    'wp-block-button__link',
    'wp-element-button',
    data.backgroundColor && getColorClassName('background-color', data.backgroundColor),
    data.textColor && getColorClassName('color', data.textColor),
    data.gradient && getGradientClassName(data.gradient),
    data.width && `has-custom-width wp-block-button__width-${data.width}`,
  ].filter(Boolean).join(' ');
  
  const style: React.CSSProperties = {
    ...getColorStyle('backgroundColor', data.customBackgroundColor),
    ...getColorStyle('color', data.customTextColor),
    borderRadius: data.borderRadius !== undefined ? `${data.borderRadius}px` : undefined,
  };
  
  const wrapperClassNames = [
    'wp-block-button',
    data.width && 'has-custom-width',
  ].filter(Boolean).join(' ');
  
  return (
    <div className={wrapperClassNames}>
      <a
        className={buttonClassNames}
        href={data.url || '#'}
        target={data.linkTarget}
        rel={data.rel}
        style={style}
      >
        {data.text}
      </a>
    </div>
  );
};