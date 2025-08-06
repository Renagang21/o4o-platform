import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface ImageBlockProps {
  block: MainSiteBlock;
}

export const ImageBlock: FC<ImageBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.url) return null;
  
  const imageClassNames = [
    'wp-block-image',
    data.align && `align${data.align}`,
    data.sizeSlug && `size-${data.sizeSlug}`,
  ].filter(Boolean).join(' ');
  
  const imgElement = (
    <img
      src={data.url}
      alt={data.alt || ''}
      width={data.width}
      height={data.height}
      className={data.align ? '' : 'w-full h-auto'}
      loading="lazy"
    />
  );
  
  const figureContent = (
    <>
      {data.href ? (
        <a 
          href={data.href}
          target={data.linkDestination === 'custom' ? '_blank' : undefined}
          rel={data.linkDestination === 'custom' ? 'noopener noreferrer' : undefined}
        >
          {imgElement}
        </a>
      ) : (
        imgElement
      )}
      {data.caption && (
        <figcaption 
          className="wp-element-caption"
          dangerouslySetInnerHTML={{ __html: data.caption }}
        />
      )}
    </>
  );
  
  return (
    <figure className={imageClassNames}>
      {figureContent}
    </figure>
  );
};