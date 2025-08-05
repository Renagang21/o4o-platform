import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { BlockRenderer } from '../BlockRenderer';
import { getColorClassName, getColorStyle, getGradientClassName } from '../utils/colors';

interface GroupBlockProps {
  block: MainSiteBlock;
}

export const GroupBlock: FC<GroupBlockProps> = ({ block }) => {
  const { data, innerBlocks = [] } = block;
  
  const Tag = (data?.tagName || 'div') as keyof JSX.IntrinsicElements;
  
  // Build class names
  const classNames = [
    'wp-block-group',
    data?.align && `align${data.align}`,
    data?.backgroundColor && getColorClassName('background-color', data.backgroundColor),
    data?.textColor && getColorClassName('color', data.textColor),
    data?.gradient && getGradientClassName(data.gradient),
    data?.layout?.type === 'flex' && 'is-layout-flex',
    data?.layout?.type === 'constrained' && 'is-layout-constrained',
  ].filter(Boolean).join(' ');
  
  // Build inline styles
  const style: React.CSSProperties = {
    ...getColorStyle('backgroundColor', data?.customBackgroundColor),
    ...getColorStyle('color', data?.customTextColor),
  };
  
  // Add layout styles
  if (data?.layout?.type === 'flex') {
    style.display = 'flex';
    style.flexDirection = data.layout.orientation === 'vertical' ? 'column' : 'row';
    style.flexWrap = data.layout.flexWrap || 'wrap';
    style.alignItems = data.layout.verticalAlignment || 'center';
    style.justifyContent = data.layout.justifyContent || 'flex-start';
  }
  
  return (
    <Tag className={classNames} style={style}>
      <div className="wp-block-group__inner-container">
        {innerBlocks.map((innerBlock, index) => (
          <BlockRenderer key={innerBlock.id || index} block={innerBlock} />
        ))}
      </div>
    </Tag>
  );
};