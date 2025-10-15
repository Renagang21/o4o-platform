/**
 * Slider Block - Framer Motion 기반
 * 슬라이더 컨테이너 블록
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SliderAttributes, transitionVariants } from './types';
import { Button } from '@/components/ui/button';

interface SliderBlockProps {
  attributes: SliderAttributes;
  setAttributes: (attrs: Partial<SliderAttributes>) => void;
  isSelected: boolean;
  children: React.ReactNode; // InnerBlocks (슬라이드들)
  className?: string;
}

export const SliderBlock: React.FC<SliderBlockProps> = ({
  attributes,
  setAttributes,
  isSelected,
  children,
  className,
}) => {
  const {
    aspectRatio = '16:9',
    height,
    effect = 'slide',
    transitionDuration = 300,
    autoplay = false,
    autoplayDelay = 3000,
    pauseOnHover = true,
    showNavigation = true,
    navigationPosition = 'sides',
    pagination = 'dots',
    loop = true,
    enableSwipe = true,
    enableKeyboard = true,
    ariaLabel,
  } = attributes;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(1); // 1: next, -1: prev
  const containerRef = useRef<HTMLDivElement>(null);

  // children을 배열로 변환 (슬라이드 수 계산)
  const slides = React.Children.toArray(children);
  const totalSlides = slides.length;

  // Aspect ratio 계산
  const getAspectRatioStyle = () => {
    if (height) {
      return { height: `${height}px` };
    }

    const ratios: Record<string, string> = {
      '16:9': '56.25%',
      '4:3': '75%',
      '1:1': '100%',
    };

    return {
      paddingTop: ratios[aspectRatio] || '56.25%',
      position: 'relative' as const,
    };
  };

  // 네비게이션 핸들러
  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (loop ? (prev + 1) % totalSlides : Math.min(prev + 1, totalSlides - 1)));
  };

  const goToPrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (loop ? (prev - 1 + totalSlides) % totalSlides : Math.max(prev - 1, 0)));
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // 자동재생
  useEffect(() => {
    if (!isPlaying || isPaused || totalSlides <= 1) return;

    const interval = setInterval(goToNext, autoplayDelay);
    return () => clearInterval(interval);
  }, [isPlaying, isPaused, currentIndex, totalSlides, autoplayDelay]);

  // 키보드 네비게이션
  useEffect(() => {
    if (!enableKeyboard || !isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, isSelected, currentIndex]);

  // 드래그 핸들러 (Framer Motion)
  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 50;
    const swipeVelocityThreshold = 500;

    if (info.offset.x > swipeThreshold || info.velocity.x > swipeVelocityThreshold) {
      goToPrev();
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -swipeVelocityThreshold) {
      goToNext();
    }
  };

  // Framer Motion variants
  const variants = transitionVariants[effect];

  // 방향에 따라 initial 조정 (slide 효과)
  const getVariants = () => {
    if (effect === 'slide') {
      return {
        initial: { x: direction > 0 ? '100%' : '-100%' },
        animate: { x: 0 },
        exit: { x: direction > 0 ? '-100%' : '100%' },
      };
    }
    return variants;
  };

  return (
    <div
      ref={containerRef}
      className={cn('slider-block', className)}
      role="region"
      aria-label={ariaLabel || 'Slider'}
      aria-roledescription="carousel"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {/* 컨트롤 툴바 (에디터 모드) */}
      {isSelected && (
        <div className="slider-block__toolbar flex items-center gap-2 mb-4 p-3 bg-gray-100 rounded-md">
          <span className="text-sm font-medium">Slider Controls:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <span className="text-xs text-gray-600 ml-auto">
            Slide {currentIndex + 1} / {totalSlides}
          </span>
        </div>
      )}

      {/* 슬라이더 컨테이너 */}
      <div className="slider-block__container" style={getAspectRatioStyle()}>
        <div
          className="slider-block__viewport"
          style={{
            position: height ? 'relative' : 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: height ? `${height}px` : '100%',
            overflow: 'hidden',
          }}
        >
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              {...getVariants()}
              transition={{
                duration: transitionDuration / 1000,
                ease: 'easeInOut',
              }}
              drag={enableSwipe ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              {slides[currentIndex]}
            </motion.div>
          </AnimatePresence>

          {/* 네비게이션 화살표 */}
          {showNavigation && totalSlides > 1 && navigationPosition === 'sides' && (
            <>
              <button
                onClick={goToPrev}
                disabled={!loop && currentIndex === 0}
                className={cn(
                  'slider-nav slider-nav--prev',
                  'absolute left-4 top-1/2 -translate-y-1/2 z-10',
                  'w-10 h-10 rounded-full bg-white/80 hover:bg-white',
                  'flex items-center justify-center shadow-lg',
                  'transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                disabled={!loop && currentIndex === totalSlides - 1}
                className={cn(
                  'slider-nav slider-nav--next',
                  'absolute right-4 top-1/2 -translate-y-1/2 z-10',
                  'w-10 h-10 rounded-full bg-white/80 hover:bg-white',
                  'flex items-center justify-center shadow-lg',
                  'transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* 페이지네이션 */}
        {pagination !== 'none' && totalSlides > 1 && (
          <div
            className={cn(
              'slider-pagination',
              'absolute bottom-4 left-1/2 -translate-x-1/2 z-10',
              'flex items-center gap-2'
            )}
          >
            {pagination === 'dots' &&
              Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    index === currentIndex
                      ? 'bg-white w-6'
                      : 'bg-white/50 hover:bg-white/80'
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === currentIndex ? 'true' : 'false'}
                />
              ))}
            {pagination === 'numbers' && (
              <div className="px-3 py-1 bg-white/80 rounded-full text-sm font-medium">
                {currentIndex + 1} / {totalSlides}
              </div>
            )}
            {pagination === 'progress' && (
              <div className="w-32 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all"
                  style={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 슬라이드 추가 안내 (에디터 모드, 슬라이드 없을 때) */}
      {isSelected && totalSlides === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">Add slides using the + button below</p>
        </div>
      )}
    </div>
  );
};

export default SliderBlock;
