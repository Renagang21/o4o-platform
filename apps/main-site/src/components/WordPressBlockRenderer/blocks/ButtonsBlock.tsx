import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { BlockRenderer } from '../BlockRenderer';

interface ButtonsBlockProps {
  block: MainSiteBlock;
}

export const ButtonsBlock: FC<ButtonsBlockProps> = ({ block }) => {
  const { data, innerBlocks = [] } = block;
  
  const buttonsClassNames = [
    'wp-block-buttons',
    data?.layout?.type === 'flex' && 'is-layout-flex',
  ].filter(Boolean).join(' ');
  
  const style: React.CSSProperties = {};
  
  if (data?.layout?.type === 'flex') {
    style.justifyContent = data.layout.justifyContent || 'flex-start';
    style.flexWrap = data.layout.orientation === 'vertical' ? 'nowrap' : 'wrap';
    style.flexDirection = data.layout.orientation === 'vertical' ? 'column' : 'row';
  }
  
  return (
    <div className={buttonsClassNames} style={style}>
      {innerBlocks.map((button, index) => (
        <BlockRenderer key={button.id || index} block={button} />
      ))}
    </div>
  );
};