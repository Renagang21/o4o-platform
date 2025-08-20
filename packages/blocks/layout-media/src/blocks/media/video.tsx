import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

const Edit: React.FC<any> = ({ attributes, setAttributes }) => {
  const { src, poster, autoplay, loop, muted, controls } = attributes;
  
  return (
    <div className="wp-block-video">
      {!src ? (
        <div style={{ padding: '40px', background: '#f0f0f0', textAlign: 'center' }}>
          <input 
            type="url" 
            placeholder="Enter video URL"
            onChange={(e) => setAttributes({ src: e.target.value })}
          />
        </div>
      ) : (
        <video 
          src={src}
          poster={poster}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          controls={controls !== false}
          style={{ width: '100%', height: 'auto' }}
        />
      )}
    </div>
  );
};

const Save: React.FC<any> = ({ attributes }) => {
  const { src, poster, autoplay, loop, muted, controls } = attributes;
  
  return (
    <figure className="wp-block-video">
      <video 
        src={src}
        poster={poster}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        controls={controls !== false}
      />
    </figure>
  );
};

const VideoBlock: BlockDefinition = {
  name: 'o4o/video',
  title: 'Video',
  category: 'media',
  icon: 'video-alt3',
  description: 'Embed a video.',
  keywords: ['video', 'movie', 'mp4'],
  
  attributes: {
    src: { type: 'string' },
    poster: { type: 'string' },
    autoplay: { type: 'boolean', default: false },
    loop: { type: 'boolean', default: false },
    muted: { type: 'boolean', default: false },
    controls: { type: 'boolean', default: true }
  },
  
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true
  },
  
  edit: Edit,
  save: Save
};

export default VideoBlock;