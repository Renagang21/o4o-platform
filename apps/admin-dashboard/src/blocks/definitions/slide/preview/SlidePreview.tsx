/**
 * SlidePreview Component
 * M3: Editor preview using SlideApp
 */

import React from 'react';
import { SlideApp } from '@o4o/slide-app';
import type { SlideAppProps } from '@o4o/slide-app';
import { mockSlides } from './SlideMockData';

export interface SlidePreviewProps extends SlideAppProps {
  className?: string;
}

/**
 * Preview component for Gutenberg editor
 * Uses mockSlides as fallback when slides array is empty
 * Autoplay is always disabled in editor for UX reasons
 */
export const SlidePreview: React.FC<SlidePreviewProps> = (props) => {
  const { slides, autoplay, ...restProps } = props;

  // Use mock slides if no real slides provided
  const displaySlides = slides && slides.length > 0 ? slides : mockSlides;

  // Always disable autoplay in editor
  const editorAutoplay = {
    ...autoplay,
    enabled: false,
  };

  return (
    <div className="slide-preview-wrapper" style={{ padding: '16px', background: '#f0f0f0', borderRadius: '8px' }}>
      {displaySlides.length === 0 && (
        <div
          className="slide-preview-empty"
          style={{
            padding: '48px',
            textAlign: 'center',
            background: '#fff',
            border: '2px dashed #cbd5e0',
            borderRadius: '8px',
          }}
        >
          <p style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
            No slides added yet
          </p>
          <p style={{ fontSize: '12px', color: '#a0aec0' }}>
            Use the sidebar panel to add and configure slides
          </p>
        </div>
      )}

      {displaySlides.length > 0 && (
        <SlideApp
          {...restProps}
          slides={displaySlides}
          autoplay={editorAutoplay}
        />
      )}

      {/* Editor hint */}
      {slides && slides.length === 0 && mockSlides.length > 0 && (
        <div style={{ marginTop: '12px', padding: '8px', background: '#fef3c7', borderRadius: '4px' }}>
          <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
            <strong>Preview Mode:</strong> Showing example slides. Add your own slides using the block controls.
          </p>
        </div>
      )}
    </div>
  );
};
