import { BlockDefinition } from '@/types/block-editor';
import { Type, Heading, Image, List } from 'lucide-react';
import { ParagraphBlock, paragraphBlockDefaultAttributes } from '@/components/block-editor/blocks/ParagraphBlock';
import { HeadingBlock, headingBlockDefaultAttributes } from '@/components/block-editor/blocks/HeadingBlock';
import { ParagraphInspector } from '@/components/block-editor/blocks/ParagraphInspector';

/**
 * 단락 블록 정의
 */
export const paragraphBlockDefinition: BlockDefinition = {
  name: 'paragraph',
  title: '단락',
  icon: Type,
  category: 'text',
  attributes: {
    content: {
      type: 'string',
      default: '',
    },
    align: {
      type: 'string',
      default: 'left',
    },
    fontSize: {
      type: 'string',
      default: 'normal',
    },
    textColor: {
      type: 'string',
      default: '',
    },
    backgroundColor: {
      type: 'string',
      default: '',
    },
  },
  component: ParagraphBlock,
  inspector: ParagraphInspector,
  defaultAttributes: paragraphBlockDefaultAttributes,
};

/**
 * 제목 블록 정의
 */
export const headingBlockDefinition: BlockDefinition = {
  name: 'heading',
  title: '제목',
  icon: Heading,
  category: 'text',
  attributes: {
    content: {
      type: 'string',
      default: '',
    },
    level: {
      type: 'number',
      default: 2,
      validation: (value: number) => value >= 1 && value <= 6,
    },
    align: {
      type: 'string',
      default: 'left',
    },
    textColor: {
      type: 'string',
      default: '',
    },
    anchor: {
      type: 'string',
      default: '',
    },
  },
  component: HeadingBlock,
  inspector: ParagraphInspector, // 임시로 같은 인스펙터 사용
  defaultAttributes: headingBlockDefaultAttributes,
};

/**
 * 이미지 블록 정의 (플레이스홀더)
 */
export const imageBlockDefinition: BlockDefinition = {
  name: 'image',
  title: '이미지',
  icon: Image,
  category: 'media',
  attributes: {
    src: {
      type: 'string',
      default: '',
      required: true,
    },
    alt: {
      type: 'string',
      default: '',
    },
    caption: {
      type: 'string',
      default: '',
    },
    align: {
      type: 'string',
      default: 'center',
    },
    width: {
      type: 'number',
      default: 0,
    },
    height: {
      type: 'number',
      default: 0,
    },
  },
  component: ParagraphBlock, // 임시로 단락 블록 사용
  inspector: ParagraphInspector,
  defaultAttributes: {
    src: '',
    alt: '',
    caption: '',
    align: 'center',
    width: 0,
    height: 0,
    linkUrl: '',
    linkTarget: '_self',
  },
};

/**
 * 목록 블록 정의 (플레이스홀더)
 */
export const listBlockDefinition: BlockDefinition = {
  name: 'list',
  title: '목록',
  icon: List,
  category: 'text',
  attributes: {
    ordered: {
      type: 'boolean',
      default: false,
    },
    items: {
      type: 'array',
      default: [],
    },
    reversed: {
      type: 'boolean',
      default: false,
    },
    start: {
      type: 'number',
      default: 1,
    },
  },
  component: ParagraphBlock, // 임시로 단락 블록 사용
  inspector: ParagraphInspector,
  defaultAttributes: {
    ordered: false,
    items: [{ content: '', level: 0 }],
    reversed: false,
    start: 1,
  },
};

/**
 * 모든 블록 정의 배열
 */
export const allBlockDefinitions: BlockDefinition[] = [
  paragraphBlockDefinition,
  headingBlockDefinition,
  imageBlockDefinition,
  listBlockDefinition,
];