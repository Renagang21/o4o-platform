import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface AudioBlockProps {
  block: MainSiteBlock;
}

export const AudioBlock: FC<AudioBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.src) return null;
  
  const audioClassNames = [
    'wp-block-audio',
    data.align && `align${data.align}`,
  ].filter(Boolean).join(' ');
  
  return (
    <figure className={audioClassNames}>
      <audio
        src={data.src}
        autoPlay={data.autoplay}
        controls
        loop={data.loop}
        preload={data.preload}
        className="w-full"
      >
        Your browser does not support the audio tag.
      </audio>
      {data.caption && (
        <figcaption 
          className="wp-element-caption"
          dangerouslySetInnerHTML={{ __html: data.caption }}
        />
      )}
    </figure>
  );
};