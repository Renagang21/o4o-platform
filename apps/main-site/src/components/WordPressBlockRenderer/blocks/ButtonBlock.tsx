import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { getColorClassName, getColorStyle, getGradientClassName } from '../utils/colors';

interface ButtonBlockProps {
  block: MainSiteBlock;
}

export const ButtonBlock: FC<ButtonBlockProps> = ({ block }) => {
  const { data } = block;

  if (!data?.text) return null;

  // Determine button style (fill or outline)
  const style = data.style || 'fill';

  const buttonClassNames = [
    'wp-block-button__link',
    'wp-element-button',
    style === 'outline' && 'is-style-outline',
    data.backgroundColor && getColorClassName('background-color', data.backgroundColor),
    data.textColor && getColorClassName('color', data.textColor),
    data.gradient && getGradientClassName(data.gradient),
    data.borderRadius && 'has-border-radius',
  ].filter(Boolean).join(' ');

  // Build inline styles
  const buttonStyle: React.CSSProperties = {
    fontSize: data.fontSize ? `${data.fontSize}px` : undefined,
    fontWeight: data.fontWeight || undefined,
    paddingTop: data.paddingTop !== undefined ? `${data.paddingTop}px` : undefined,
    paddingRight: data.paddingRight !== undefined ? `${data.paddingRight}px` : undefined,
    paddingBottom: data.paddingBottom !== undefined ? `${data.paddingBottom}px` : undefined,
    paddingLeft: data.paddingLeft !== undefined ? `${data.paddingLeft}px` : undefined,
    borderRadius: data.borderRadius !== undefined ? `${data.borderRadius}px` : undefined,
  };

  // Apply style-specific colors
  if (style === 'fill') {
    if (data.gradient) {
      buttonStyle.background = data.gradient;
    } else {
      buttonStyle.backgroundColor = data.backgroundColor || data.customBackgroundColor;
    }
    buttonStyle.color = data.textColor || data.customTextColor;
    buttonStyle.border = 'none';
  } else {
    // Outline style
    buttonStyle.backgroundColor = 'transparent';
    buttonStyle.color = data.borderColor || data.backgroundColor || data.customBackgroundColor;
    buttonStyle.border = `${data.borderWidth || 2}px solid ${data.borderColor || data.backgroundColor || data.customBackgroundColor}`;
  }

  // Apply custom width if specified
  if (data.width && data.width > 0) {
    buttonStyle.width = `${data.width}%`;
    buttonStyle.display = 'inline-block';
  }

  // Wrapper classes with alignment
  const getAlignmentClass = () => {
    switch (data.align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  const wrapperClassNames = [
    'wp-block-button',
    data.width && 'has-custom-width',
    getAlignmentClass(),
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClassNames}>
      <a
        className={buttonClassNames}
        href={data.url || '#'}
        target={data.linkTarget || '_self'}
        rel={data.linkTarget === '_blank' ? 'noopener noreferrer' : data.rel}
        style={buttonStyle}
      >
        {data.text}
      </a>
    </div>
  );
};