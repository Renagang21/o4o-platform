/**
 * AccordionItem Block Definition
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import AccordionItemBlock from '@/components/editor/blocks/AccordionItemBlock';

export const accordionItemBlockDefinition: BlockDefinition = {
  name: 'o4o/accordion-item',
  title: 'Accordion Item',
  category: 'widgets',
  icon: <ChevronDown className="w-5 h-5" />,
  description: 'FAQ, 접었다 펼치는 콘텐츠 항목',
  keywords: ['accordion', 'faq', 'collapse', 'expand', 'toggle', '아코디언', '질문', '답변'],
  component: AccordionItemBlock as unknown as BlockComponent,
  attributes: {
    title: {
      type: 'string',
      default: '질문을 입력하세요',
    },
    content: {
      type: 'string',
      default: '답변을 입력하세요',
    },
    defaultOpen: {
      type: 'boolean',
      default: false,
    },
    borderColor: {
      type: 'string',
      default: '#e5e7eb',
    },
    backgroundColor: {
      type: 'string',
      default: '#ffffff',
    },
    titleColor: {
      type: 'string',
      default: '#111827',
    },
    contentColor: {
      type: 'string',
      default: '#6b7280',
    },
  },
  supports: {
    html: false,
    reusable: true,
  },
};

export default accordionItemBlockDefinition;
