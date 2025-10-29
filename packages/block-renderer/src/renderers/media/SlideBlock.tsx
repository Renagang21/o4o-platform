/**
 * Slide Block Renderer
 * M4: Renders o4o/slide blocks using SlideApp
 */

import React from 'react';
import { SlideApp } from '@o4o/slide-app';
import type { Slide, SlideAppProps, AutoplayConfig, A11yConfig } from '@o4o/slide-app';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import { getAlignmentClass } from '../../utils/typography';
import clsx from 'clsx';

/**
 * Convert block attributes to SlideApp props
 * Handles both new and legacy attribute formats
 */
function transformBlockToSlideProps(block: any): SlideAppProps {
  // Get slides array
  const slides: Slide[] = getBlockData(block, 'slides', []);

  // Get autoplay config (handle both new and legacy formats)
  const autoplayData = getBlockData(block, 'autoplay');
  const legacyAutoPlay = getBlockData(block, 'autoPlay');
  const legacyAutoPlayInterval = getBlockData(block, 'autoPlayInterval');

  let autoplay: AutoplayConfig;
  if (autoplayData && typeof autoplayData === 'object') {
    autoplay = autoplayData as AutoplayConfig;
  } else {
    // Legacy format
    autoplay = {
      enabled: legacyAutoPlay === true,
      delay: legacyAutoPlayInterval || 3000,
      pauseOnInteraction: true,
    };
  }

  // Get other settings
  const loop = getBlockData(block, 'loop', true);
  const navigation = getBlockData(block, 'navigation') ?? getBlockData(block, 'showNavigation', true);

  // Handle pagination
  let pagination = getBlockData(block, 'pagination', 'dots');
  const legacyShowPagination = getBlockData(block, 'showPagination');
  if (legacyShowPagination === false && !getBlockData(block, 'pagination')) {
    pagination = 'none';
  }

  // Get aspect ratio (handle both formats: '16:9' and '16/9')
  let aspectRatio = getBlockData(block, 'aspectRatio', '16/9');
  if (typeof aspectRatio === 'string' && aspectRatio.includes(':')) {
    aspectRatio = aspectRatio.replace(':', '/');
  }

  // Get a11y config
  const a11y: A11yConfig = getBlockData(block, 'a11y', {
    prevLabel: 'Previous slide',
    nextLabel: 'Next slide',
    roledescription: 'carousel',
  });

  return {
    slides,
    autoplay,
    loop,
    navigation,
    pagination: pagination as any,
    aspectRatio: aspectRatio as any,
    a11y,
  };
}

/**
 * Slide Block Renderer Component
 */
export const SlideBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Transform block data to SlideApp props
  const slideProps = transformBlockToSlideProps(block);

  // Get alignment and className
  const alignment = getBlockData(block, 'align');
  const className = getBlockData(block, 'className', '');

  // Build container classes
  const containerClasses = clsx(
    'block-slide mb-6',
    getAlignmentClass(alignment),
    className
  );

  // If no slides, show empty state
  if (!slideProps.slides || slideProps.slides.length === 0) {
    return (
      <div className={containerClasses}>
        <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <p className="text-gray-500">No slides to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <SlideApp {...slideProps} />
    </div>
  );
};

export default SlideBlock;
