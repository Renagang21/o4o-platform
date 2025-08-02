import { useState, FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type TabVariant = 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded';
export type TabSize = 'sm' | 'md' | 'lg';

interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  variant?: TabVariant;
  size?: TabSize;
  className?: string;
  onChange?: (tabId: string) => void;
}

const Tabs: FC<TabsProps> = ({
  items,
  defaultTab,
  variant = 'line',
  size = 'md',
  className,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || items[0]?.id);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const variantStyles = {
    line: {
      tabList: 'border-b border-gray-200',
      tab: 'border-b-2 border-transparent hover:border-gray-300',
      activeTab: 'border-primary text-primary',
    },
    enclosed: {
      tabList: 'space-x-2',
      tab: 'border border-transparent rounded-t-lg',
      activeTab: 'border-gray-200 border-b-white bg-white text-primary',
    },
    'soft-rounded': {
      tabList: 'space-x-2',
      tab: 'rounded-lg',
      activeTab: 'bg-primary/10 text-primary',
    },
    'solid-rounded': {
      tabList: 'space-x-2',
      tab: 'rounded-lg',
      activeTab: 'bg-primary text-white',
    },
  };

  const sizeStyles = {
    sm: {
      tabList: 'text-sm',
      tab: 'px-3 py-1.5',
    },
    md: {
      tabList: 'text-base',
      tab: 'px-4 py-2',
    },
    lg: {
      tabList: 'text-lg',
      tab: 'px-6 py-3',
    },
  };

  return (
    <div className={className}>
      <div
        className={twMerge(
          'flex',
          variantStyles[variant].tabList,
          sizeStyles[size].tabList
        )}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && handleTabClick(item.id)}
            className={twMerge(
              'flex items-center space-x-2 font-medium transition-colors duration-200',
              variantStyles[variant].tab,
              sizeStyles[size].tab,
              item.disabled && 'opacity-50 cursor-not-allowed',
              activeTab === item.id && variantStyles[variant].activeTab
            )}
            disabled={item.disabled}
            role="tab"
            aria-selected={activeTab === item.id}
            aria-controls={`panel-${item.id}`}
          >
            {item.icon && <span className="w-5 h-5">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-4">
        {items.map((item) => (
          <div
            key={item.id}
            id={`panel-${item.id}`}
            role="tabpanel"
            aria-labelledby={item.id}
            className={activeTab === item.id ? 'block' : 'hidden'}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs; 