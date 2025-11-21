import { FC, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemBlockProps {
  title?: string;
  content?: string;
  defaultOpen?: boolean;
  borderColor?: string;
  backgroundColor?: string;
  titleColor?: string;
  contentColor?: string;
}

const AccordionItemBlock: FC<AccordionItemBlockProps> = ({
  title = '질문을 입력하세요',
  content: itemContent = '답변을 입력하세요',
  defaultOpen = false,
  borderColor = '#e5e7eb',
  backgroundColor = '#ffffff',
  titleColor = '#111827',
  contentColor = '#6b7280',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="accordion-item border rounded-lg overflow-hidden mb-4"
      style={{ borderColor }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ backgroundColor }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3
          className="font-medium flex-1"
          style={{ color: titleColor }}
        >
          {title}
        </h3>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: titleColor }}
        />
      </div>

      {/* Content */}
      {isOpen && (
        <div
          className="p-4 border-t"
          style={{
            borderColor,
            color: contentColor,
            backgroundColor
          }}
        >
          <p className="whitespace-pre-wrap">{itemContent}</p>
        </div>
      )}
    </div>
  );
};

export default AccordionItemBlock;
