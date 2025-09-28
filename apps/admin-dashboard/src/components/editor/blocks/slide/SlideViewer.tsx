/**
 * SlideViewer - Display individual slide content
 */

import React from 'react';
import { Slide } from './SlideBlock';

interface SlideViewerProps {
  slide: Slide;
  transition: 'fade' | 'slide' | 'none';
  isActive: boolean;
}

const SlideViewer: React.FC<SlideViewerProps> = ({
  slide,
  transition,
  isActive
}) => {
  const getTransitionClass = () => {
    if (!isActive) return 'slide-hidden';
    return `slide-visible slide-transition-${transition}`;
  };

  const renderContent = () => {
    switch (slide.type) {
      case 'text':
        return (
          <div className="slide-content slide-content--text">
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
              <img 
                src={slide.imageUrl} 
                alt={slide.imageAlt || 'Slide image'} 
                className="slide-image"
              />
            )}
          </div>
        );

      case 'mixed':
        return (
          <div className="slide-content slide-content--mixed">
            <div className="slide-mixed-container">
              {slide.imageUrl && (
                <div className="slide-mixed__image">
                  <img 
                    src={slide.imageUrl} 
                    alt={slide.imageAlt || 'Slide image'} 
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

  return (
    <div 
      className={`slide-viewer ${getTransitionClass()}`}
      style={{
        backgroundColor: slide.backgroundColor || '#ffffff',
        color: slide.textColor || '#000000'
      }}
    >
      {renderContent()}
    </div>
  );
};

export default SlideViewer;