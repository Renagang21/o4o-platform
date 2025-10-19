import React from 'react';
import { CPTStatus } from '@/hooks/cpt/useCPTData';

interface CPTStatusTabsProps {
  activeTab: CPTStatus;
  setActiveTab: (tab: CPTStatus) => void;
  counts: {
    all: number;
    publish: number;
    draft: number;
    private: number;
    trash: number;
  };
}

export const CPTStatusTabs: React.FC<CPTStatusTabsProps> = ({
  activeTab,
  setActiveTab,
  counts
}) => {
  return (
    <div className="flex items-center gap-4 mb-4">
      <button
        onClick={() => setActiveTab('all')}
        className={`text-sm ${activeTab === 'all' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
      >
        모든 ({counts.all})
      </button>
      <span className="text-gray-400">|</span>
      <button
        onClick={() => setActiveTab('publish')}
        className={`text-sm ${activeTab === 'publish' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
      >
        발행됨 ({counts.publish})
      </button>
      <span className="text-gray-400">|</span>
      <button
        onClick={() => setActiveTab('draft')}
        className={`text-sm ${activeTab === 'draft' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
      >
        임시글 ({counts.draft})
      </button>
      <span className="text-gray-400">|</span>
      <button
        onClick={() => setActiveTab('private')}
        className={`text-sm ${activeTab === 'private' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
      >
        비공개 ({counts.private})
      </button>
      <span className="text-gray-400">|</span>
      <button
        onClick={() => setActiveTab('trash')}
        className={`text-sm ${activeTab === 'trash' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
      >
        휴지통 ({counts.trash || 0})
      </button>
    </div>
  );
};
