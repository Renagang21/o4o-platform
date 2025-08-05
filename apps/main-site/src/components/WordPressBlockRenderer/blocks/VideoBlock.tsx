import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface VideoBlockProps {
  block: MainSiteBlock;
}

export const VideoBlock: FC<VideoBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.src) return null;
  
  const videoClassNames = [
    'wp-block-video',
    data.align && `align${data.align}`,
  ].filter(Boolean).join(' ');
  
  return (
    <figure className={videoClassNames}>
      <video
        src={data.src}
        poster={data.poster}
        autoPlay={data.autoplay}
        controls={data.controls}
        loop={data.loop}
        muted={data.muted || data.autoplay} // Videos with autoplay must be muted
        playsInline={data.playsInline}
        className="w-full h-auto"
      >
        Your browser does not support the video tag.
      </video>
      {data.caption && (
        <figcaption 
          className="wp-element-caption"
          dangerouslySetInnerHTML={{ __html: data.caption }}
        />
      )}
    </figure>
  );
};