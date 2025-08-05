import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';
import { BlockRenderer } from '../BlockRenderer';
import { getColorClassName, getColorStyle } from '../utils/colors';

interface CoverBlockProps {
  block: MainSiteBlock;
}

export const CoverBlock: FC<CoverBlockProps> = ({ block }) => {
  const { data, innerBlocks = [] } = block;
  
  const coverClassNames = [
    'wp-block-cover',
    data?.isDark && 'is-dark',
    data?.align && `align${data.align}`,
    data?.overlayColor && getColorClassName('background-color', data.overlayColor),
    data?.contentPosition && `has-custom-content-position is-position-${data.contentPosition.replace(' ', '-')}`,
  ].filter(Boolean).join(' ');
  
  const style: React.CSSProperties = {
    minHeight: data?.minHeight ? `${data.minHeight}${data.minHeightUnit || 'px'}` : undefined,
  };
  
  const overlayStyle: React.CSSProperties = {
    opacity: data?.dimRatio !== undefined ? data.dimRatio / 100 : 0.5,
    ...getColorStyle('backgroundColor', data?.customOverlayColor || data?.overlayColor),
  };
  
  if (data?.url && data?.backgroundType === 'image') {
    style.backgroundImage = `url(${data.url})`;
    style.backgroundPosition = data?.focalPoint 
      ? `${data.focalPoint.x * 100}% ${data.focalPoint.y * 100}%`
      : 'center center';
    style.backgroundSize = 'cover';
  }
  
  return (
    <div className={coverClassNames} style={style}>
      <span 
        aria-hidden="true" 
        className="wp-block-cover__background"
        style={overlayStyle}
      />
      {data?.url && data?.backgroundType === 'video' && (
        <video
          className="wp-block-cover__video-background"
          autoPlay
          muted
          loop
          playsInline
          src={data.url}
          style={{ objectPosition: data?.focalPoint 
            ? `${data.focalPoint.x * 100}% ${data.focalPoint.y * 100}%`
            : 'center center' 
          }}
        />
      )}
      <div className="wp-block-cover__inner-container">
        {innerBlocks.map((innerBlock, index) => (
          <BlockRenderer key={innerBlock.id || index} block={innerBlock} />
        ))}
      </div>
    </div>
  );
};