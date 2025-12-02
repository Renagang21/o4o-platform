import { FC, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

interface FAQAccordionBlockProps {
  items?: FAQItem[];
  borderColor?: string;
  backgroundColor?: string;
  titleColor?: string;
  contentColor?: string;
  spacing?: number;
}

const FAQAccordionBlock: FC<FAQAccordionBlockProps> = ({
  items = [],
  borderColor = '#e5e7eb',
  backgroundColor = '#ffffff',
  titleColor = '#111827',
  contentColor = '#6b7280',
  spacing = 16,
}) => {
  const [openItems, setOpenItems] = useState<Set<number>>(
    new Set(items.map((item, idx) => item.defaultOpen ? idx : -1).filter(idx => idx !== -1))
  );

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (openItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="faq-accordion" style={{ gap: `${spacing}px`, display: 'flex', flexDirection: 'column' }}>
      {items.map((item, index) => (
        <div
          key={index}
          className="faq-item border rounded-lg overflow-hidden"
          style={{ borderColor }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ backgroundColor }}
            onClick={() => toggleItem(index)}
          >
            <h3
              className="font-medium flex-1"
              style={{ color: titleColor }}
            >
              {item.question}
            </h3>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${openItems.has(index) ? 'rotate-180' : ''}`}
              style={{ color: titleColor }}
            />
          </div>

          {/* Content */}
          {openItems.has(index) && (
            <div
              className="p-4 border-t"
              style={{
                borderColor,
                color: contentColor,
                backgroundColor
              }}
            >
              <p className="whitespace-pre-wrap">{item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FAQAccordionBlock;
