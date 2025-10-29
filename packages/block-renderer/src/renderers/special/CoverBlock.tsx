/**
 * Cover Block Renderer
 * Image/video cover with overlay content
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import { BlockRenderer } from '../../BlockRenderer';
import clsx from 'clsx';

export const CoverBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const innerBlocks = block.innerBlocks || [];

  const url = getBlockData(block, 'url');
  const dimRatio = getBlockData(block, 'dimRatio', 50);
  const overlayColor = getBlockData(block, 'overlayColor');
  const customOverlayColor = getBlockData(block, 'customOverlayColor');
  const backgroundType = getBlockData(block, 'backgroundType', 'image');
  const focalPoint = getBlockData(block, 'focalPoint');
  const minHeight = getBlockData(block, 'minHeight');
  const minHeightUnit = getBlockData(block, 'minHeightUnit', 'px');
  const contentPosition = getBlockData(block, 'contentPosition', 'center center');
  const isDark = getBlockData(block, 'isDark', true);
  const className = getBlockData(block, 'className', '');

  // Build class names
  const coverClasses = clsx(
    'block-cover relative flex items-center justify-center overflow-hidden mb-6',
    isDark && 'text-white',
    className
  );

  // Build styles
  const coverStyles: React.CSSProperties = {
    minHeight: minHeight ? `${minHeight}${minHeightUnit}` : '400px',
  };

  const backgroundStyles: React.CSSProperties = {
    backgroundImage: url && backgroundType === 'image' ? `url(${url})` : undefined,
    backgroundPosition: focalPoint ? `${focalPoint.x * 100}% ${focalPoint.y * 100}%` : 'center',
    backgroundSize: 'cover',
  };

  const overlayStyles: React.CSSProperties = {
    backgroundColor: customOverlayColor || overlayColor,
    opacity: dimRatio / 100,
  };

  const contentStyles: React.CSSProperties = {
    alignItems: contentPosition.includes('top') ? 'flex-start' : contentPosition.includes('bottom') ? 'flex-end' : 'center',
    justifyContent: contentPosition.includes('left') ? 'flex-start' : contentPosition.includes('right') ? 'flex-end' : 'center',
  };

  return (
    <div className={coverClasses} style={coverStyles}>
      {/* Background */}
      {url && backgroundType === 'image' && (
        <div className="absolute inset-0" style={backgroundStyles} />
      )}
      {url && backgroundType === 'video' && (
        <video className="absolute inset-0 w-full h-full object-cover" src={url} autoPlay loop muted playsInline />
      )}

      {/* Overlay */}
      <div className="absolute inset-0" style={overlayStyles} />

      {/* Content */}
      <div className="relative z-10 w-full flex p-8" style={contentStyles}>
        <BlockRenderer blocks={innerBlocks} />
      </div>
    </div>
  );
};

export default CoverBlock;
