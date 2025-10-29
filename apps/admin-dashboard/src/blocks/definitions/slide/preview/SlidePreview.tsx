/**
 * SlidePreview Component
 * M3: Editor preview using SlideApp
 * M6: Mock data removed - shows empty state when no slides
 */

import React from 'react';
import { SlideApp } from '@o4o/slide-app';
import type { SlideAppProps } from '@o4o/slide-app';

export interface SlidePreviewProps extends SlideAppProps {
  className?: string;
}

/**
 * Preview component for Gutenberg editor
 * Autoplay is always disabled in editor for UX reasons
 */
export const SlidePreview: React.FC<SlidePreviewProps> = (props) => {
  const { slides, autoplay, ...restProps } = props;

  // Always disable autoplay in editor
  const editorAutoplay = {
    ...autoplay,
    enabled: false,
  };

  return (
    <div className="slide-preview-wrapper" style={{ padding: '16px', background: '#f0f0f0', borderRadius: '8px' }}>
      {!slides || slides.length === 0 ? (
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
      ) : (
        <SlideApp
          {...restProps}
          slides={slides}
          autoplay={editorAutoplay}
        />
      )}
    </div>
  );
};
