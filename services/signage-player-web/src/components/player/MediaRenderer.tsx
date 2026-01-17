/**
 * MediaRenderer
 *
 * Sprint 2-4: Production media renderer
 * - Supports image, video, html, text, youtube, vimeo
 * - Cache-aware rendering
 * - Smooth transitions
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import type { PlaylistItem, TransitionEffect, ContentCache } from '../../types/signage';

// ============================================================================
// Types
// ============================================================================

interface MediaRendererProps {
  item: PlaylistItem;
  cache?: ContentCache;
  onVideoEnded?: () => void;
  muted?: boolean;
  transitionDuration?: number;
}

interface TransitionStyles {
  entering: React.CSSProperties;
  entered: React.CSSProperties;
  exiting: React.CSSProperties;
}

// ============================================================================
// Transition Helpers
// ============================================================================

const getTransitionStyles = (
  effect: TransitionEffect,
  duration: number
): TransitionStyles => {
  const base = {
    transition: `all ${duration}ms ease-in-out`,
  };

  switch (effect) {
    case 'fade':
      return {
        entering: { ...base, opacity: 0 },
        entered: { ...base, opacity: 1 },
        exiting: { ...base, opacity: 0 },
      };

    case 'slide-left':
      return {
        entering: { ...base, transform: 'translateX(100%)', opacity: 0 },
        entered: { ...base, transform: 'translateX(0)', opacity: 1 },
        exiting: { ...base, transform: 'translateX(-100%)', opacity: 0 },
      };

    case 'slide-right':
      return {
        entering: { ...base, transform: 'translateX(-100%)', opacity: 0 },
        entered: { ...base, transform: 'translateX(0)', opacity: 1 },
        exiting: { ...base, transform: 'translateX(100%)', opacity: 0 },
      };

    case 'slide-up':
      return {
        entering: { ...base, transform: 'translateY(100%)', opacity: 0 },
        entered: { ...base, transform: 'translateY(0)', opacity: 1 },
        exiting: { ...base, transform: 'translateY(-100%)', opacity: 0 },
      };

    case 'slide-down':
      return {
        entering: { ...base, transform: 'translateY(-100%)', opacity: 0 },
        entered: { ...base, transform: 'translateY(0)', opacity: 1 },
        exiting: { ...base, transform: 'translateY(100%)', opacity: 0 },
      };

    case 'zoom':
      return {
        entering: { ...base, transform: 'scale(0.5)', opacity: 0 },
        entered: { ...base, transform: 'scale(1)', opacity: 1 },
        exiting: { ...base, transform: 'scale(1.5)', opacity: 0 },
      };

    case 'none':
    default:
      return {
        entering: {},
        entered: {},
        exiting: {},
      };
  }
};

// ============================================================================
// MediaRenderer Component
// ============================================================================

export default function MediaRenderer({
  item,
  cache,
  onVideoEnded,
  muted = true,
  transitionDuration = 300,
}: MediaRendererProps) {
  const [transitionState, setTransitionState] = useState<'entering' | 'entered' | 'exiting'>('entering');
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const prevItemRef = useRef<string | null>(null);

  // Handle transition on item change
  useEffect(() => {
    if (prevItemRef.current !== item.id) {
      setTransitionState('entering');
      prevItemRef.current = item.id;

      // Transition to entered state
      const timer = setTimeout(() => {
        setTransitionState('entered');
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [item.id]);

  // Load from cache if available
  useEffect(() => {
    const loadFromCache = async () => {
      if (!cache || !item.media.url) {
        setCachedUrl(null);
        return;
      }

      try {
        const url = await (cache as any).getMediaUrl(item.mediaId);
        if (url) {
          setCachedUrl(url);
        } else {
          setCachedUrl(null);
        }
      } catch {
        setCachedUrl(null);
      }
    };

    loadFromCache();

    // Cleanup blob URL on unmount
    return () => {
      if (cachedUrl && cachedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl);
      }
    };
  }, [item.mediaId, cache]);

  const effect = item.transitionEffect || 'fade';
  const duration = item.transitionDuration || transitionDuration;
  const styles = getTransitionStyles(effect, duration);
  const currentStyle = styles[transitionState];

  const mediaUrl = cachedUrl || item.media.url || '';

  return (
    <div className="media-renderer" style={currentStyle}>
      <MediaContent
        type={item.media.mediaType}
        url={mediaUrl}
        metadata={item.media.metadata}
        onVideoEnded={onVideoEnded}
        muted={muted}
      />
    </div>
  );
}

// ============================================================================
// MediaContent Component
// ============================================================================

interface MediaContentProps {
  type: string;
  url: string;
  metadata: Record<string, unknown>;
  onVideoEnded?: () => void;
  muted?: boolean;
}

function MediaContent({ type, url, metadata, onVideoEnded, muted }: MediaContentProps) {
  switch (type) {
    case 'image':
      return <ImageContent url={url} alt={metadata.alt as string} />;

    case 'video':
      return (
        <VideoContent
          url={url}
          onEnded={onVideoEnded}
          muted={muted}
        />
      );

    case 'youtube':
      return <YouTubeContent videoId={metadata.videoId as string} muted={muted} />;

    case 'vimeo':
      return <VimeoContent videoId={metadata.videoId as string} muted={muted} />;

    case 'html':
    case 'external':
      return <IframeContent url={url} />;

    case 'text':
      return (
        <TextContent
          text={metadata.text as string}
          style={metadata.style as React.CSSProperties}
        />
      );

    default:
      return <FallbackContent type={type} />;
  }
}

// ============================================================================
// Content Type Components
// ============================================================================

function ImageContent({ url, alt }: { url: string; alt?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return <FallbackContent type="image" />;
  }

  return (
    <div className="media-image" style={{ opacity: loaded ? 1 : 0 }}>
      <img
        src={url}
        alt={alt || 'Signage content'}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}

function VideoContent({
  url,
  onEnded,
  muted = true,
}: {
  url: string;
  onEnded?: () => void;
  muted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      video.play().catch((err) => {
        console.warn('[VideoContent] Autoplay prevented:', err);
        // Try muted autoplay
        video.muted = true;
        video.play().catch(console.error);
      });
    };

    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [url]);

  return (
    <video
      ref={videoRef}
      src={url}
      className="media-video"
      autoPlay
      muted={muted}
      playsInline
      onEnded={onEnded}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
}

function YouTubeContent({ videoId, muted }: { videoId: string; muted?: boolean }) {
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1&playlist=${videoId}`;

  return (
    <iframe
      className="media-youtube"
      src={src}
      allow="autoplay; encrypted-media"
      allowFullScreen
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
}

function VimeoContent({ videoId, muted }: { videoId: string; muted?: boolean }) {
  const src = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=${muted ? 1 : 0}&loop=1&background=1`;

  return (
    <iframe
      className="media-vimeo"
      src={src}
      allow="autoplay; fullscreen"
      allowFullScreen
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
}

function IframeContent({ url }: { url: string }) {
  return (
    <iframe
      className="media-iframe"
      src={url}
      sandbox="allow-scripts allow-same-origin"
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
}

function TextContent({
  text,
  style,
}: {
  text: string;
  style?: React.CSSProperties;
}) {
  const defaultStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    color: '#fff',
    fontSize: '2rem',
    textAlign: 'center',
    padding: '2rem',
    ...style,
  };

  return (
    <div className="media-text" style={defaultStyle}>
      <p>{text}</p>
    </div>
  );
}

function FallbackContent({ type }: { type: string }) {
  return (
    <div className="media-fallback">
      <p>Unable to display content ({type})</p>
    </div>
  );
}
