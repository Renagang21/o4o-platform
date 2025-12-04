/**
 * FAQ Block Renderer
 */

'use client';

import { useState } from 'react';
import { BlockRendererProps } from '../BlockRenderer';

export const FAQBlock = ({ node }: BlockRendererProps) => {
  const { question = '', answer = '', defaultOpen = false } = node.props;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left hover:text-blue-600 transition-colors"
      >
        <span className="font-semibold text-lg pr-8">{question}</span>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="pb-4 text-gray-600 leading-relaxed">{answer}</div>}
    </div>
  );
};
