/**
 * BasicNavigation - Navigation controls for slides
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BasicNavigationProps {
  currentSlide: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onGoToSlide: (index: number) => void;
  showPagination: boolean;
}

const BasicNavigation: React.FC<BasicNavigationProps> = ({
  currentSlide,
  totalSlides,
  onPrev,
  onNext,
  onGoToSlide,
  showPagination
}) => {
  return (
    <div className="slide-navigation">
      {/* Previous/Next Arrows */}
      <button
        className="slide-navigation__arrow slide-navigation__arrow--prev"
        onClick={onPrev}
        aria-label="Previous slide"
        disabled={totalSlides <= 1}
      >
        <ChevronLeft size={24} />
      </button>
      
      <button
        className="slide-navigation__arrow slide-navigation__arrow--next"
        onClick={onNext}
        aria-label="Next slide"
        disabled={totalSlides <= 1}
      >
        <ChevronRight size={24} />
      </button>

      {/* Pagination Dots */}
      {showPagination && (
        <div className="slide-navigation__pagination">
          {Array.from({ length: totalSlides }, (_, index) => (
            <button
              key={index}
              className={`pagination-dot ${
                currentSlide === index ? 'active' : ''
              }`}
              onClick={() => onGoToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Slide Counter */}
      <div className="slide-navigation__counter">
        {currentSlide + 1} / {totalSlides}
      </div>
    </div>
  );
};

export default BasicNavigation;