/**
 * Additional Block - Accordion
 *
 * Collapsible accordion item
 */

import { useState } from 'react';

export interface AccordionProps {
  title: string;
  content: string;
  defaultOpen?: boolean;
  bordered?: boolean;
}

export default function Accordion({
  title = 'Accordion Title',
  content = 'Accordion content goes here.',
  defaultOpen = false,
  bordered = true,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white ${bordered ? 'border border-gray-200' : ''} rounded-lg`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <span className="font-semibold text-gray-900">{title}</span>
        <span className={`text-2xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-gray-700">{content}</p>
        </div>
      )}
    </div>
  );
}
