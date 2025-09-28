/**
 * SlideProgress - Progress indicators and loading states
 * Phase 3: Interaction features
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SlideProgressProps {
  current: number;
  total: number;
  autoPlayInterval?: number;
  isPlaying?: boolean;
  showProgressBar?: boolean;
  showIndicators?: boolean;
  position?: 'top' | 'bottom';
  color?: string;
}

export const SlideProgress: React.FC<SlideProgressProps> = ({
  current,
  total,
  autoPlayInterval = 5000,
  isPlaying = false,
  showProgressBar = true,
  showIndicators = true,
  position = 'bottom',
  color = '#0073aa'
}) => {
  const [progress, setProgress] = useState(0);
  
  // Auto-play progress animation
  useEffect(() => {
    if (isPlaying && autoPlayInterval > 0) {
      setProgress(0);
      const startTime = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / autoPlayInterval) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress < 100 && isPlaying) {
          requestAnimationFrame(updateProgress);
        }
      };
      
      requestAnimationFrame(updateProgress);
    } else {
      setProgress(0);
    }
  }, [current, isPlaying, autoPlayInterval]);

  return (
    <div className={`slide-progress slide-progress--${position}`}>
      {showProgressBar && (
        <div className="slide-progress__bar">
          <div 
            className="slide-progress__fill"
            style={{
              width: `${(current / total) * 100}%`,
              backgroundColor: color
            }}
          />
          {isPlaying && (
            <div 
              className="slide-progress__auto-play"
              style={{
                width: `${progress}%`,
                backgroundColor: color,
                opacity: 0.5
              }}
            />
          )}
        </div>
      )}
      
      {showIndicators && (
        <div className="slide-progress__indicators">
          <span className="slide-progress__current">{current + 1}</span>
          <span className="slide-progress__separator">/</span>
          <span className="slide-progress__total">{total}</span>
        </div>
      )}
    </div>
  );
};

interface SlideLoadingProps {
  isLoading?: boolean;
  message?: string;
  type?: 'spinner' | 'dots' | 'pulse';
}

export const SlideLoading: React.FC<SlideLoadingProps> = ({
  isLoading = false,
  message = 'Loading slide...',
  type = 'spinner'
}) => {
  if (!isLoading) return null;

  return (
    <div className="slide-loading">
      <div className={`slide-loading__indicator slide-loading__indicator--${type}`}>
        {type === 'spinner' && (
          <Loader2 className="slide-loading__spinner" size={32} />
        )}
        {type === 'dots' && (
          <div className="slide-loading__dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        {type === 'pulse' && (
          <div className="slide-loading__pulse"></div>
        )}
      </div>
      {message && (
        <div className="slide-loading__message">{message}</div>
      )}
    </div>
  );
};

interface ImageLoaderProps {
  src: string;
  alt?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  lazy?: boolean;
  placeholder?: string;
  className?: string;
}

export const ImageLoader: React.FC<ImageLoaderProps> = ({
  src,
  alt = '',
  onLoad,
  onError,
  lazy = true,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E',
  className = ''
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState(lazy ? placeholder : src);

  useEffect(() => {
    if (!lazy) {
      setImageSrc(src);
      return;
    }

    // Create an IntersectionObserver for lazy loading
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImageSrc(src);
      setImageState('loaded');
      if (onLoad) onLoad();
    };
    
    img.onerror = () => {
      setImageState('error');
      if (onError) onError(new Error(`Failed to load image: ${src}`));
    };
  }, [src, lazy, onLoad, onError, placeholder]);

  return (
    <div className={`image-loader ${className} image-loader--${imageState}`}>
      {imageState === 'loading' && (
        <div className="image-loader__loading">
          <Loader2 className="image-loader__spinner" size={24} />
        </div>
      )}
      {imageState === 'error' ? (
        <div className="image-loader__error">
          <span>Failed to load image</span>
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          className="image-loader__img"
          onLoad={() => setImageState('loaded')}
        />
      )}
    </div>
  );
};

export default SlideProgress;