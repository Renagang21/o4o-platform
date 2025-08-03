import { useState, FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpen?: string[];
  allowMultiple?: boolean;
  className?: string;
  onChange?: (openItems: string[]) => void;
}

const Accordion: FC<AccordionProps> = ({
  items,
  defaultOpen = [],
  allowMultiple = false,
  className,
  onChange,
}) => {
  const [openItems, setOpenItems] = useState(defaultOpen);

  const handleItemClick = (itemId: string) => {
    const newOpenItems = allowMultiple
      ? openItems.includes(itemId)
        ? openItems.filter((id: any) => id !== itemId)
        : [...openItems, itemId]
      : openItems.includes(itemId)
      ? []
      : [itemId];

    setOpenItems(newOpenItems);
    onChange?.(newOpenItems);
  };

  return (
    <div className={twMerge('divide-y divide-gray-200', className)}>
      {items.map((item: any) => (
        <div key={item.id} className="py-2">
          <button
            className={twMerge(
              'flex w-full items-center justify-between px-4 py-2 text-left',
              'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => !item.disabled && handleItemClick(item.id)}
            disabled={item.disabled}
            aria-expanded={openItems.includes(item.id)}
            aria-controls={`content-${item.id}`}
          >
            <div className="flex items-center space-x-2">
              {item.icon && <span className="w-5 h-5">{item.icon}</span>}
              <span className="font-medium">{item.title}</span>
            </div>
            <svg
              className={twMerge(
                'w-5 h-5 transform transition-transform duration-200',
                openItems.includes(item.id) ? 'rotate-180' : ''
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <div
            id={`content-${item.id}`}
            className={twMerge(
              'overflow-hidden transition-all duration-200',
              openItems.includes(item.id) ? 'max-h-96' : 'max-h-0'
            )}
          >
            <div className="px-4 py-2">{item.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Accordion; 