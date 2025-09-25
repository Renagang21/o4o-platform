import React from 'react';
import { PostStatus } from '@/hooks/posts/usePostsData';

interface PostsStatusTabsProps {
  activeTab: PostStatus;
  setActiveTab: (tab: PostStatus) => void;
  counts: {
    all: number;
    published: number;
    draft: number;
    trash: number;
  };
}

export const PostsStatusTabs: React.FC<PostsStatusTabsProps> = ({
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
        onClick={() => setActiveTab('published')}
        className={`text-sm ${activeTab === 'published' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
      >
        발행됨 ({counts.published})
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
        onClick={() => setActiveTab('trash')}
        className={`text-sm ${activeTab === 'trash' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
      >
        휴지통 ({counts.trash || 0})
      </button>
    </div>
  );
};