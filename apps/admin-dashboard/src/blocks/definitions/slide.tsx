/**
 * Slide Block Definition
 * Test block for the new registry system
 */

import React from 'react';
import { Presentation } from 'lucide-react';
import { BlockDefinition, BlockProps } from '../registry/types';
import { SlideBlock as OriginalSlideBlock, SlideBlockAttributes } from '@/components/editor/blocks/slide';

// Wrapper component to adapt BlockProps to SlideBlockProps
const SlideBlockWrapper: React.FC<BlockProps> = (props) => {
  const handleSetAttributes = (newAttributes: Partial<SlideBlockAttributes>) => {
    if (props.onChange) {
      props.onChange(props.content, { ...props.attributes, ...newAttributes });
    }
    if (props.setAttributes) {
      props.setAttributes({ ...props.attributes, ...newAttributes });
    }
  };

  return (
    <OriginalSlideBlock
      attributes={props.attributes as SlideBlockAttributes}
      setAttributes={handleSetAttributes}
      isSelected={props.isSelected}
      className={props.className}
    />
  );
};

export const slideBlockDefinition: BlockDefinition = {
  name: 'o4o/slide',
  title: 'Slide Presentation',
  category: 'media',
  icon: <Presentation className="w-5 h-5" />,
  description: 'Create interactive slide presentations with text, images, and mixed content.',
  keywords: ['slide', 'presentation', 'carousel', 'slideshow', 'gallery'],
  component: SlideBlockWrapper,
  attributes: {
    slides: {
      type: 'array',
      default: [],
    },
    aspectRatio: {
      type: 'string',
      default: '16:9',
    },
    transition: {
      type: 'string',
      default: 'fade',
    },
    autoPlay: {
      type: 'boolean',
      default: false,
    },
    autoPlayInterval: {
      type: 'number',
      default: 5000,
    },
    showNavigation: {
      type: 'boolean',
      default: true,
    },
    showPagination: {
      type: 'boolean',
      default: true,
    },
    backgroundColor: {
      type: 'string',
      default: '#f0f0f0',
    },
  },
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true,
    html: false,
  },
  example: {
    attributes: {
      slides: [
        {
          type: 'image',
          content: 'https://via.placeholder.com/800x450',
          caption: 'Example Slide',
        },
      ],
      aspectRatio: '16:9',
      showNavigation: true,
    },
  },
};

export default slideBlockDefinition;
