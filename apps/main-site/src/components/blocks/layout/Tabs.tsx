/**
 * Tabs Block Renderer
 */

'use client';

import { useState } from 'react';
import { BlockRendererProps } from '../BlockRenderer';

export const TabsBlock = ({ node, children }: BlockRendererProps) => {
  const { tabs = [] } = node.props;
  const [activeTab, setActiveTab] = useState(0);

  // Convert children to array if it exists
  const childrenArray = children ? (Array.isArray(children) ? children : [children]) : [];

  return (
    <div className="w-full">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {tabs.map((tab: { label: string }, index: number) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === index
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="py-6">
        {childrenArray[activeTab] || <div className="text-gray-500">No content for this tab</div>}
      </div>
    </div>
  );
};
