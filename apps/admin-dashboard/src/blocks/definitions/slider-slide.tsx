/**
 * Slider Slide Block Definition
 * 개별 슬라이드 블록 정의
 */

import React from 'react';
import { Square } from 'lucide-react';
import { BlockDefinition, BlockProps } from '../registry/types';
import { SliderSlideBlock } from '@/components/editor/blocks/slider/SliderSlideBlock';
import { SlideAttributes } from '@/components/editor/blocks/slider/types';

// BlockProps를 SliderSlideBlock props로 변환
const SliderSlideWrapper: React.FC<BlockProps> = (props) => {
  const handleSetAttributes = (newAttributes: Partial<SlideAttributes>) => {
    if (props.onChange) {
      props.onChange(props.content, { ...props.attributes, ...newAttributes });
    }
    if (props.setAttributes) {
      props.setAttributes({ ...props.attributes, ...newAttributes });
    }
  };

  return (
    <SliderSlideBlock
      attributes={props.attributes as unknown as SlideAttributes}
      setAttributes={handleSetAttributes}
      isSelected={props.isSelected || false}
      className={props.className}
    >
      {/* InnerBlocks는 GutenbergBlockEditor에서 렌더링 */}
      {props.children}
    </SliderSlideBlock>
  );
};

export const sliderSlideBlockDefinition: BlockDefinition = {
  name: 'o4o/slider-slide',
  title: 'Slide',
  category: 'media',
  icon: <Square className="w-5 h-5" />,
  description: 'Individual slide within a slider. Add any blocks inside.',
  keywords: ['slide', 'content', 'innerblocks'],
  parent: ['o4o/slider'], // 오직 slider 내부에서만 사용 가능
  component: SliderSlideWrapper,

  attributes: {
    backgroundColor: {
      type: 'string',
      default: 'transparent',
    },
    backgroundImage: {
      type: 'string',
      default: '',
    },
    backgroundSize: {
      type: 'string',
      default: 'cover',
    },
    backgroundPosition: {
      type: 'string',
      default: 'center',
    },
    padding: {
      type: 'object',
      default: {
        top: 40,
        right: 40,
        bottom: 40,
        left: 40,
      },
    },
    verticalAlign: {
      type: 'string',
      default: 'center',
    },
    horizontalAlign: {
      type: 'string',
      default: 'center',
    },
    ariaLabel: {
      type: 'string',
      default: '',
    },
  },

  supports: {
    align: false,
    anchor: true,
    className: true,
    html: false,
  },

  // InnerBlocks 설정
  innerBlocksSettings: {
    allowedBlocks: undefined, // 모든 블록 허용!
    template: [
      ['o4o/heading', { level: 2, placeholder: 'Slide Title' }],
      ['o4o/paragraph', { placeholder: 'Add slide content...' }],
    ],
    templateLock: false, // 자유롭게 추가/삭제 가능
  },

  example: {
    attributes: {
      backgroundColor: '#f0f0f0',
      padding: {
        top: 60,
        right: 40,
        bottom: 60,
        left: 40,
      },
    },
    innerBlocks: [
      {
        name: 'o4o/heading',
        attributes: { level: 2, content: 'Welcome to Our Slider' },
      },
      {
        name: 'o4o/paragraph',
        attributes: { content: 'This is an example slide with flexible content.' },
      },
    ],
  },
};

export default sliderSlideBlockDefinition;
