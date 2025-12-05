/**
 * Marketing Block - FAQ
 *
 * FAQ item with collapsible answer
 */

import { useState } from 'react';

export interface FAQProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export default function FAQ({
  question = 'What is your return policy?',
  answer = 'We offer a 30-day money-back guarantee on all purchases.',
  defaultOpen = false,
}: FAQProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4">{question}</span>
        <span className={`text-2xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-gray-700">{answer}</p>
        </div>
      )}
    </div>
  );
}
