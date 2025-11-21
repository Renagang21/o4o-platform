/**
 * FAQAccordion Block Definition
 * 여러 개의 FAQ 항목을 관리하는 컨테이너 블록
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import FAQAccordionBlock from '@/components/editor/blocks/FAQAccordionBlock';

export interface FAQItem {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export const DEFAULT_FAQ_ITEMS: FAQItem[] = [
  {
    question: '자주 묻는 질문 1',
    answer: '첫 번째 질문에 대한 답변입니다.',
    defaultOpen: true,
  },
  {
    question: '자주 묻는 질문 2',
    answer: '두 번째 질문에 대한 답변입니다.',
    defaultOpen: false,
  },
  {
    question: '자주 묻는 질문 3',
    answer: '세 번째 질문에 대한 답변입니다.',
    defaultOpen: false,
  },
];

export const faqAccordionBlockDefinition: BlockDefinition = {
  name: 'o4o/faq-accordion',
  title: 'FAQ Accordion',
  category: 'widgets',
  icon: <HelpCircle className="w-5 h-5" />,
  description: '여러 개의 FAQ를 아코디언 형태로 표시',
  keywords: ['faq', 'accordion', 'question', 'answer', 'collapse', '질문', '답변', '아코디언'],
  component: FAQAccordionBlock as unknown as BlockComponent,
  attributes: {
    items: {
      type: 'array',
      default: DEFAULT_FAQ_ITEMS,
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
    spacing: {
      type: 'number',
      default: 16,
    },
  },
  supports: {
    align: true,
    html: false,
    reusable: true,
  },
};

export default faqAccordionBlockDefinition;
