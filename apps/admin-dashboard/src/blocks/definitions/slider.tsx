/**
 * Slider Block Definition
 * 슬라이더 컨테이너 블록 정의 - Framer Motion 기반
 */

import React from 'react';
import { Presentation } from 'lucide-react';
import { BlockDefinition, BlockProps } from '../registry/types';
import { SliderBlock } from '@/components/editor/blocks/slider/SliderBlock';
import { SliderAttributes } from '@/components/editor/blocks/slider/types';

// BlockProps를 SliderBlock props로 변환
const SliderWrapper: React.FC<BlockProps> = (props) => {
  const handleSetAttributes = (newAttributes: Partial<SliderAttributes>) => {
    if (props.onChange) {
      props.onChange(props.content, { ...props.attributes, ...newAttributes });
    }
    if (props.setAttributes) {
      props.setAttributes({ ...props.attributes, ...newAttributes });
    }
  };

  return (
    <SliderBlock
      attributes={props.attributes as unknown as SliderAttributes}
      setAttributes={handleSetAttributes}
      isSelected={props.isSelected || false}
      className={props.className}
    >
      {/* InnerBlocks (슬라이드들)는 GutenbergBlockEditor에서 렌더링 */}
      {props.children}
    </SliderBlock>
  );
};

export const sliderBlockDefinition: BlockDefinition = {
  name: 'o4o/slider',
  title: 'Slider',
  category: 'media',
  icon: <Presentation className="w-5 h-5" />,
  description: 'Responsive slider with Framer Motion animations. Add slides inside.',
  keywords: ['slider', 'carousel', 'slideshow', 'gallery', 'animation'],
  component: SliderWrapper,

  attributes: {
    // 레이아웃
    aspectRatio: {
      type: 'string',
      default: '16:9',
    },
    height: {
      type: 'number',
      default: undefined,
    },

    // 전환 효과
    effect: {
      type: 'string',
      default: 'slide',
    },
    transitionDuration: {
      type: 'number',
      default: 300,
    },

    // 자동재생
    autoplay: {
      type: 'boolean',
      default: false,
    },
    autoplayDelay: {
      type: 'number',
      default: 3000,
    },
    pauseOnHover: {
      type: 'boolean',
      default: true,
    },

    // 네비게이션
    showNavigation: {
      type: 'boolean',
      default: true,
    },
    navigationPosition: {
      type: 'string',
      default: 'sides',
    },

    // 페이지네이션
    pagination: {
      type: 'string',
      default: 'dots',
    },

    // 루프
    loop: {
      type: 'boolean',
      default: true,
    },

    // 제스처
    enableSwipe: {
      type: 'boolean',
      default: true,
    },
    enableKeyboard: {
      type: 'boolean',
      default: true,
    },

    // 접근성
    ariaLabel: {
      type: 'string',
      default: '',
    },

    // 고급
    lazyLoad: {
      type: 'boolean',
      default: false,
    },
    preloadImages: {
      type: 'number',
      default: 1,
    },
  },

  supports: {
    align: true,
    anchor: true,
    className: true,
    html: false,
  },

  // InnerBlocks 설정 - 오직 slider-slide만 허용
  innerBlocksSettings: {
    allowedBlocks: ['o4o/slider-slide'],
    template: [
      [
        'o4o/slider-slide',
        { backgroundColor: '#f0f0f0' },
        [
          ['o4o/heading', { level: 2, content: 'First Slide' }],
          ['o4o/paragraph', { content: 'Add your content here...' }],
        ],
      ],
      [
        'o4o/slider-slide',
        { backgroundColor: '#e0e0e0' },
        [
          ['o4o/heading', { level: 2, content: 'Second Slide' }],
          ['o4o/paragraph', { content: 'Add your content here...' }],
        ],
      ],
    ],
    templateLock: false, // 슬라이드 추가/삭제/재정렬 가능
  },

  example: {
    attributes: {
      aspectRatio: '16:9',
      effect: 'slide',
      autoplay: true,
      autoplayDelay: 3000,
      showNavigation: true,
      pagination: 'dots',
      loop: true,
    },
    innerBlocks: [
      {
        name: 'o4o/slider-slide',
        attributes: {
          backgroundColor: '#4a90e2',
          padding: { top: 60, right: 40, bottom: 60, left: 40 },
        },
        innerBlocks: [
          {
            name: 'o4o/heading',
            attributes: { level: 2, content: 'Welcome to Our Product' },
          },
          {
            name: 'o4o/paragraph',
            attributes: { content: 'Experience the best features.' },
          },
        ],
      },
      {
        name: 'o4o/slider-slide',
        attributes: {
          backgroundColor: '#e74c3c',
          padding: { top: 60, right: 40, bottom: 60, left: 40 },
        },
        innerBlocks: [
          {
            name: 'o4o/heading',
            attributes: { level: 2, content: 'Powerful & Flexible' },
          },
          {
            name: 'o4o/paragraph',
            attributes: { content: 'Built with Framer Motion.' },
          },
        ],
      },
    ],
  },
};

export default sliderBlockDefinition;
