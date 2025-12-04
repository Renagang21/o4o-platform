/**
 * Additional Block - Tabs
 *
 * Tabbed content container
 */

import { useState } from 'react';
import { ReactNode } from 'react';

export interface TabsProps {
  tabs?: Array<{ label: string; content: string }>;
  activeColor?: string;
  children?: ReactNode;
}

export default function Tabs({
  tabs = [
    { label: 'Tab 1', content: 'Content for tab 1' },
    { label: 'Tab 2', content: 'Content for tab 2' },
    { label: 'Tab 3', content: 'Content for tab 3' },
  ],
  activeColor = '#3b82f6',
  children,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === i
                ? 'border-current'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
            style={activeTab === i ? { color: activeColor, borderColor: activeColor } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {children || (
          <div className="text-gray-700">
            {tabs[activeTab]?.content}
          </div>
        )}
      </div>
    </div>
  );
}
