/**
 * EnhancedSlideViewer - SlideViewer with Phase 3 features
 * Includes lazy loading, error handling, and accessibility
 */

import React, { useEffect, useState } from 'react';
import { Slide } from './types';
import { ImageLoader, SlideLoading } from './SlideProgress';
import { SlideErrorBoundary, ReducedMotion } from './SlideAccessibility';

interface EnhancedSlideViewerProps {
  slide: Slide;
  transition: 'fade' | 'slide' | 'zoom' | 'flip' | 'cube' | 'none';
  isActive: boolean;
  prefetchNext?: boolean;
  onImageLoad?: () => void;
  onImageError?: (error: Error) => void;
  reducedMotion?: boolean;
  lazyLoad?: boolean;
}

const EnhancedSlideViewer: React.FC<EnhancedSlideViewerProps> = ({
  slide,
  transition,
  isActive,
  prefetchNext = true,
  onImageLoad,
  onImageError,
  reducedMotion = false,
  lazyLoad = true
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const getTransitionClass = () => {
    if (!isActive) return 'slide-hidden';
    if (reducedMotion) return 'slide-visible slide-transition-none';
    return `slide-visible slide-transition-${transition}`;
  };

  // Apply text styles
  const getTextStyles = () => {
    const styles: React.CSSProperties = {};
    
    if (slide.textStyles) {
      if (slide.textStyles.fontSize) {
        styles.fontSize = `var(--text-size-${slide.textStyles.fontSize})`;
      }
      if (slide.textStyles.fontWeight) {
        styles.fontWeight = slide.textStyles.fontWeight;
      }
      if (slide.textStyles.textAlign) {
        styles.textAlign = slide.textStyles.textAlign;
      }
      if (slide.textStyles.lineHeight) {
        styles.lineHeight = slide.textStyles.lineHeight;
      }
    }
    
    return styles;
  };

  // Get text shadow class
  const getTextShadowClass = () => {
    if (slide.textStyles?.textShadow && slide.textStyles.textShadow !== 'none') {
      return `text-shadow-${slide.textStyles.textShadow}`;
    }
    return '';
  };

  // Get background style
  const getBackgroundStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      color: slide.textColor || '#000000'
    };

    if (slide.backgroundGradient) {
      const { type, angle = 90, colors } = slide.backgroundGradient;
      if (type === 'linear') {
        style.background = `linear-gradient(${angle}deg, ${colors.join(', ')})`;
      } else if (type === 'radial') {
        style.background = `radial-gradient(circle, ${colors.join(', ')})`;
      }
    } else if (slide.backgroundImage) {
      style.backgroundImage = `url(${slide.backgroundImage})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
    } else {
      style.backgroundColor = slide.backgroundColor || '#ffffff';
    }

    return style;
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    if (onImageLoad) onImageLoad();
  };

  const handleImageError = (error: Error) => {
    setIsLoading(false);
    setHasError(true);
    if (onImageError) onImageError(error);
  };

  const renderContent = () => {
    switch (slide.type) {
      case 'text':
        return (
          <div 
            className={`slide-content slide-content--text ${getTextShadowClass()}`}
            style={getTextStyles()}
          >
            {slide.title && (
              <h1 className="slide-title">{slide.title}</h1>
            )}
            {slide.subtitle && (
              <h2 className="slide-subtitle">{slide.subtitle}</h2>
            )}
            {slide.content && (
              <div className="slide-body">
                {slide.content.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="slide-content slide-content--image">
            {slide.imageUrl && (
              <ImageLoader
                src={slide.imageUrl}
                alt={slide.imageAlt || 'Slide image'}
                onLoad={handleImageLoad}
                onError={handleImageError}
                lazy={lazyLoad && !isActive}
                className="slide-image"
              />
            )}
          </div>
        );

      case 'mixed':
        return (
          <div 
            className={`slide-content slide-content--mixed ${getTextShadowClass()}`}
            style={getTextStyles()}
          >
            <div className="slide-mixed-container">
              {slide.imageUrl && (
                <div className="slide-mixed__image">
                  <ImageLoader
                    src={slide.imageUrl}
                    alt={slide.imageAlt || 'Slide image'}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    lazy={lazyLoad && !isActive}
                  />
                </div>
              )}
              <div className="slide-mixed__text">
                {slide.title && (
                  <h1 className="slide-title">{slide.title}</h1>
                )}
                {slide.subtitle && (
                  <h2 className="slide-subtitle">{slide.subtitle}</h2>
                )}
                {slide.content && (
                  <div className="slide-body">
                    {slide.content.split('\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Skip invisible slides
  if (slide.visible === false) {
    return null;
  }

  return (
    <SlideErrorBoundary
      fallback={
        <div className="slide-viewer slide-viewer--error">
          <div className="slide-error">
            <p>Unable to display this slide</p>
          </div>
        </div>
      }
    >
      <ReducedMotion
        fallback={
          <div 
            className="slide-viewer slide-visible slide-transition-none"
            style={getBackgroundStyle()}
            role="region"
            aria-label={`Slide: ${slide.title || 'Untitled'}`}
            aria-live={isActive ? 'polite' : 'off'}
          >
            {renderContent()}
          </div>
        }
      >
        <div 
          className={`slide-viewer ${getTransitionClass()}`}
          style={getBackgroundStyle()}
          role="region"
          aria-label={`Slide: ${slide.title || 'Untitled'}`}
          aria-live={isActive ? 'polite' : 'off'}
          data-slide-type={slide.type}
        >
          {isLoading && (
            <SlideLoading isLoading={true} message="Loading slide..." />
          )}
          {renderContent()}
        </div>
      </ReducedMotion>
    </SlideErrorBoundary>
  );
};

export default EnhancedSlideViewer;