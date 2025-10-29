/**
 * SlideBlock Component
 * M3: Gutenberg block registration and wrapper for SlideApp
 */

import React from 'react';
import { Presentation } from 'lucide-react';
import { BlockDefinition, BlockProps } from '../../registry/types';
import { useSlideAttributes, type SlideBlockAttributes } from './useSlideAttributes';
import { SlidePreview } from './preview/SlidePreview';
import { SlideEditPanel } from './SlideEditPanel';

/**
 * Slide Block Wrapper Component
 * Adapts BlockProps to SlideApp props using useSlideAttributes hook
 */
const SlideBlockWrapper: React.FC<BlockProps> = (props) => {
  const attributes = props.attributes as SlideBlockAttributes;

  // Convert Gutenberg attributes to SlideApp props
  const slideAppProps = useSlideAttributes(attributes);

  // Handle attribute updates
  const handleSetAttributes = (newAttributes: Partial<SlideBlockAttributes>) => {
    if (props.onChange) {
      props.onChange(props.content, { ...attributes, ...newAttributes });
    }
    if (props.setAttributes) {
      props.setAttributes({ ...attributes, ...newAttributes });
    }
  };

  return (
    <div className="slide-block-editor">
      {/* Editor Preview */}
      <SlidePreview {...slideAppProps} className={props.className} />

      {/* Side Panel Controls (conditionally rendered by Gutenberg) */}
      {props.isSelected && (
        <div className="slide-block-controls">
          <SlideEditPanel
            attributes={attributes}
            setAttributes={handleSetAttributes}
          />
        </div>
      )}

      {/* Helper text for empty state */}
      {(!attributes.slides || attributes.slides.length === 0) && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: '#e0f2fe',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#0369a1',
          }}
        >
          <p style={{ margin: 0, marginBottom: '8px' }}>
            <strong>Getting Started:</strong>
          </p>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Use the sidebar panel to configure options</li>
            <li>Add slides programmatically via attributes</li>
            <li>Preview updates in real-time</li>
          </ol>
        </div>
      )}
    </div>
  );
};

/**
 * Slide Block Definition
 * Registers block with Gutenberg registry
 */
export const slideBlockDefinition: BlockDefinition = {
  name: 'o4o/slide',
  title: 'Slide Carousel',
  category: 'media',
  icon: <Presentation className="w-5 h-5" />,
  description: 'Create interactive slide presentations with autoplay, navigation, and accessibility features. Built on Embla Carousel.',
  keywords: ['slide', 'carousel', 'slideshow', 'presentation', 'gallery', 'embla'],
  component: SlideBlockWrapper,

  attributes: {
    slides: {
      type: 'array',
      default: [],
    },
    autoplay: {
      type: 'object',
      default: {
        enabled: false,
        delay: 3000,
        pauseOnInteraction: true,
      },
    },
    loop: {
      type: 'boolean',
      default: true,
    },
    navigation: {
      type: 'boolean',
      default: true,
    },
    pagination: {
      type: 'string',
      default: 'dots',
    },
    aspectRatio: {
      type: 'string',
      default: '16/9',
    },
    a11y: {
      type: 'object',
      default: {
        prevLabel: 'Previous slide',
        nextLabel: 'Next slide',
        roledescription: 'carousel',
      },
    },
  },

  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true,
    html: false,
    multiple: true,
    reusable: true,
  },

  example: {
    attributes: {
      slides: [
        {
          id: 'example-1',
          type: 'text',
          title: 'Welcome to SlideApp',
          subtitle: 'Modern carousel for o4o platform',
          content: 'WCAG 2.2 compliant, lightweight (6KB), and built on Embla Carousel',
          backgroundColor: '#3b82f6',
          textColor: '#ffffff',
          visible: true,
        },
        {
          id: 'example-2',
          type: 'text',
          title: 'Easy Configuration',
          subtitle: 'Sidebar controls',
          content: 'Configure autoplay, loop, pagination, navigation, and accessibility options',
          backgroundColor: '#10b981',
          textColor: '#ffffff',
          visible: true,
        },
      ],
      pagination: 'dots',
      navigation: true,
      loop: true,
    },
  },
};

/**
 * Note: Legacy attribute migration (autoPlay → autoplay, etc.)
 * is handled in useSlideAttributes hook for backward compatibility
 */

export default slideBlockDefinition;
