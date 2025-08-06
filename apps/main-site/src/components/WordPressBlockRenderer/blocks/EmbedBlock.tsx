import { FC, useEffect, useRef } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface EmbedBlockProps {
  block: MainSiteBlock;
}

export const EmbedBlock: FC<EmbedBlockProps> = ({ block }) => {
  const { data } = block;
  const embedRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Load embed scripts for platforms like Twitter
    if (data?.providerNameSlug === 'twitter' && window.twttr) {
      window.twttr.widgets.load(embedRef.current);
    }
  }, [data?.providerNameSlug]);
  
  if (!data?.url) return null;
  
  const embedClassNames = [
    'wp-block-embed',
    data.type && `is-type-${data.type}`,
    data.providerNameSlug && `is-provider-${data.providerNameSlug}`,
    data.responsive && 'wp-block-embed-is-responsive',
    data.align && `align${data.align}`,
  ].filter(Boolean).join(' ');
  
  // Handle different embed types
  const renderEmbed = () => {
    // YouTube and Vimeo
    if (data.providerNameSlug === 'youtube' || data.providerNameSlug === 'vimeo') {
      return (
        <div className="wp-block-embed__wrapper">
          <iframe
            src={getEmbedUrl(data.url, data.providerNameSlug)}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full aspect-video"
          />
        </div>
      );
    }
    
    // Twitter
    if (data.providerNameSlug === 'twitter') {
      return (
        <div className="wp-block-embed__wrapper" ref={embedRef}>
          <blockquote className="twitter-tweet">
            <a href={data.url}>Loading tweet...</a>
          </blockquote>
        </div>
      );
    }
    
    // Default: just show as link
    return (
      <div className="wp-block-embed__wrapper">
        <a href={data.url} target="_blank" rel="noopener noreferrer">
          {data.url}
        </a>
      </div>
    );
  };
  
  return (
    <figure className={embedClassNames}>
      {renderEmbed()}
      {data?.caption && (
        <figcaption 
          className="wp-element-caption"
          dangerouslySetInnerHTML={{ __html: data.caption }}
        />
      )}
    </figure>
  );
};

// Helper function to convert URLs to embed URLs
function getEmbedUrl(url: string, provider: string): string {
  if (provider === 'youtube') {
    const videoId = extractYouTubeId(url);
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  if (provider === 'vimeo') {
    const videoId = extractVimeoId(url);
    return `https://player.vimeo.com/video/${videoId}`;
  }
  
  return url;
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : '';
}

function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : '';
}

// Extend window interface for embed scripts
declare global {
  interface Window {
    twttr: any;
  }
}