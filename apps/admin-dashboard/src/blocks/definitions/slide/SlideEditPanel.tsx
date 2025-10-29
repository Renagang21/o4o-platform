/**
 * SlideEditPanel Component
 * M3: Gutenberg InspectorControls for slide block configuration
 */

import React from 'react';
import type { SlideBlockAttributes } from './useSlideAttributes';

export interface SlideEditPanelProps {
  attributes: SlideBlockAttributes;
  setAttributes: (attributes: Partial<SlideBlockAttributes>) => void;
}

/**
 * Side panel controls for slide block configuration
 * Renders in Gutenberg InspectorControls area
 */
export const SlideEditPanel: React.FC<SlideEditPanelProps> = ({ attributes, setAttributes }) => {
  const { autoplay, loop, pagination, navigation, aspectRatio, a11y } = attributes;

  // Handle autoplay toggle
  const handleAutoplayToggle = (enabled: boolean) => {
    setAttributes({
      autoplay: {
        ...autoplay,
        enabled,
        delay: autoplay?.delay || 3000,
        pauseOnInteraction: autoplay?.pauseOnInteraction ?? true,
      },
    });
  };

  // Handle autoplay delay change
  const handleAutoplayDelay = (delay: number) => {
    setAttributes({
      autoplay: {
        ...autoplay,
        enabled: autoplay?.enabled || false,
        delay: Math.max(1000, Math.min(delay, 10000)),
        pauseOnInteraction: autoplay?.pauseOnInteraction ?? true,
      },
    });
  };

  return (
    <div className="slide-edit-panel" style={{ padding: '16px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
        Slide Configuration
      </h3>

      {/* Autoplay Section */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={autoplay?.enabled || false}
            onChange={(e) => handleAutoplayToggle(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Enable Autoplay
        </label>

        {autoplay?.enabled && (
          <div style={{ marginLeft: '24px', marginTop: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              Delay (ms):
            </label>
            <input
              type="number"
              min={1000}
              max={10000}
              step={500}
              value={autoplay?.delay || 3000}
              onChange={(e) => handleAutoplayDelay(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #cbd5e0',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
            <p style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>
              Range: 1000-10000ms
            </p>
          </div>
        )}
      </div>

      {/* Loop Section */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={loop !== undefined ? loop : true}
            onChange={(e) => setAttributes({ loop: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Enable Loop
        </label>
        <p style={{ fontSize: '11px', color: '#718096', marginTop: '4px', marginLeft: '24px' }}>
          Cycle back to first slide after last
        </p>
      </div>

      {/* Navigation Section */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={navigation !== undefined ? navigation : true}
            onChange={(e) => setAttributes({ navigation: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Show Navigation Buttons
        </label>
      </div>

      {/* Pagination Section */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Pagination Style
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {['dots', 'numbers', 'progress', 'none'].map((type) => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              <input
                type="radio"
                name="pagination"
                value={type}
                checked={(pagination || 'dots') === type}
                onChange={() => setAttributes({ pagination: type as any })}
                style={{ marginRight: '8px' }}
              />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Aspect Ratio Section */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Aspect Ratio
        </label>
        <select
          value={aspectRatio || '16/9'}
          onChange={(e) => setAttributes({ aspectRatio: e.target.value as any })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #cbd5e0',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        >
          <option value="16/9">16:9 (Widescreen)</option>
          <option value="4/3">4:3 (Standard)</option>
          <option value="1/1">1:1 (Square)</option>
          <option value="auto">Auto</option>
        </select>
      </div>

      {/* Accessibility Section */}
      <div style={{ marginBottom: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Accessibility Labels
        </label>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Previous Button Label:
          </label>
          <input
            type="text"
            value={a11y?.prevLabel || 'Previous slide'}
            onChange={(e) => setAttributes({
              a11y: { ...a11y, prevLabel: e.target.value },
            })}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #cbd5e0',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Next Button Label:
          </label>
          <input
            type="text"
            value={a11y?.nextLabel || 'Next slide'}
            onChange={(e) => setAttributes({
              a11y: { ...a11y, nextLabel: e.target.value },
            })}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #cbd5e0',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          />
        </div>
      </div>
    </div>
  );
};
